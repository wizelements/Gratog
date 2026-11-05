import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureMarketingSchema, captureMarketingLead, unsubscribeMarketingEmail,
  eligibleMarketingSubscribers, reserveMarketingSend, finishMarketingSend,
  processMarketingResendEvent, marketingCampaignMetrics, getMarketingClient
} from '../lib/marketing/turso-store.mjs';

function fixture() {
  const raw = new DatabaseSync(':memory:');
  const execute = async (input) => {
    const { sql, args = [] } = typeof input === 'string' ? { sql: input } : input;
    const prep = raw.prepare(sql);
    if (/^\s*select\b/i.test(sql)) return { rows: prep.all(...args), rowsAffected: 0 };
    const res = prep.run(...args);
    return { rows: [], rowsAffected: res.changes };
  };
  return {
    execute, raw,
    batch: async (entries) => {
      raw.exec('BEGIN IMMEDIATE');
      try {
        const result = [];
        for (const entry of entries) result.push(await execute(entry));
        raw.exec('COMMIT');
        return result;
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    }
  };
}

test('captures consented subscribers, preserves opt-out, never promotes preorder inquiry', async () => {
  const db = fixture();
  await ensureMarketingSchema(db);
  await captureMarketingLead(db, { email: 'TEST@EXAMPLE.COM', marketId: 'serenbe',
    source: 'market_qr', intent: 'weekly_menu_email', marketingConsent:true, metadata: { campaign: 'qr' } });
  await captureMarketingLead(db, { email: 'test@example.com', marketId: 'serenbe',
    source: 'weekly_menu', intent: 'email_signup', marketingConsent:true });
  await captureMarketingLead(db, { email: 'inquiring@example.com', marketId: 'serenbe',
    source: 'preorder', intent: 'preorder_intent_no_market' });
  let leads = await eligibleMarketingSubscribers(db, 'serenbe', 20);
  assert.deepEqual(leads.map(x => x.email), ['test@example.com']);
  assert.equal(db.raw.prepare('SELECT COUNT(*) AS n FROM tog_marketing_leads').get().n, 3);
  assert.equal(db.raw.prepare('SELECT COUNT(*) AS n FROM tog_marketing_subscribers').get().n, 1);
  await unsubscribeMarketingEmail(db, 'test@example.com', 'one_click');
  await captureMarketingLead(db, { email: 'test@example.com', marketId: 'serenbe',
    source: 'site', intent: 'weekly_menu_email', marketingConsent:true });
  leads = await eligibleMarketingSubscribers(db, 'serenbe', 20);
  assert.equal(leads.length, 0, 'capturing same address cannot undo unsubscribe');
  db.raw.close();
});

test('market routing, campaign deduplication and webhook bounce suppression', async () => {
  const db = fixture();
  await captureMarketingLead(db, { email:'market@example.com', intent:'weekly_menu_email', marketingConsent:true, marketId:'serenbe' });
  await captureMarketingLead(db, { email:'other@example.com', intent:'weekly_menu_email', marketingConsent:true, marketId:'dunwoody' });
  await captureMarketingLead(db, { email:'global@example.com', intent:'email_signup', marketingConsent:true });
  assert.deepEqual((await eligibleMarketingSubscribers(db, 'serenbe', 20)).map(x => x.email),
    ['market@example.com', 'global@example.com']);
  assert.deepEqual((await eligibleMarketingSubscribers(db, 'dunwoody', 20)).map(x => x.email),
    ['other@example.com', 'global@example.com']);
  const key = 'weekly-menu:2026-11-07';
  assert.equal(await reserveMarketingSend(db, 'market@example.com', 'serenbe', key), true);
  assert.equal(await reserveMarketingSend(db, 'market@example.com', 'serenbe', key), false);
  await finishMarketingSend(db, 'market@example.com', key, 'sent', 'provider-001');
  assert.equal((await eligibleMarketingSubscribers(db, 'serenbe', 20, key)).some(x => x.email === 'market@example.com'), false);
  assert.deepEqual(await processMarketingResendEvent(db,
    { providerId: 'non-marketing-order-email', eventId: 'evt-unknown', eventType: 'email.bounced' }), { matched: false });
  const bounced = await processMarketingResendEvent(db,
    { providerId: 'provider-001', eventId: 'evt-001', eventType: 'email.bounced' });
  assert.equal(bounced.matched, true);
  assert.equal(bounced.status, 'bounced');
  const replay = await processMarketingResendEvent(db,
    { providerId: 'provider-001', eventId: 'evt-001', eventType: 'email.bounced' });
  assert.equal(replay.duplicate, true);
  assert.equal((await eligibleMarketingSubscribers(db, 'serenbe', 20)).some(x => x.email === 'market@example.com'), false);
  const metrics = await marketingCampaignMetrics(db, 'serenbe');
  assert.equal(metrics.capturedLeads, 1);
  assert.equal(metrics.emailSends.sent, 1);
  db.raw.close();
});

test('disallows missing Turso credentials and production staging databases', () => {
  assert.throws(() => getMarketingClient({}), /NOT_CONFIGURED/);
  assert.throws(() => getMarketingClient({ TURSO_DATABASE_URL: 'file:local', TURSO_AUTH_TOKEN:'x' }), /REMOTE_REQUIRED/);
  assert.throws(() => getMarketingClient({ TURSO_DATABASE_URL: 'libsql://preview-example', TURSO_AUTH_TOKEN:'x', VERCEL_ENV:'production' }), /PRODUCTION_DATABASE_GUARD/);
});
