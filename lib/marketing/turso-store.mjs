import { createClient } from '@libsql/client/web';
import { randomUUID } from 'node:crypto';

let sharedClient;
let schemaReady;
const EMAIL_INTENTS = new Set(['weekly_menu_email', 'weekly_menu_texts', 'email_signup', 'subscription_waitlist', 'preorder_intent_no_market']);
// Only explicit newsletter signups may receive promotional campaigns.
const SUBSCRIPTION_INTENTS = new Set(['weekly_menu_email', 'email_signup']);

export function needsMarketingEmail(intent) {
  return EMAIL_INTENTS.has(intent);
}
export function getMarketingClient(env = process.env) {
  const url = env.TURSO_DATABASE_URL;
  const token = env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error('MARKETING_TURSO_NOT_CONFIGURED');
  if (!/^(libsql|https):\/\//.test(url)) throw new Error('MARKETING_TURSO_REMOTE_REQUIRED');
  if (env.VERCEL_ENV === 'production' && /staging|preview|migration-cert|sandbox/i.test(url)) {
    throw new Error('MARKETING_PRODUCTION_DATABASE_GUARD');
  }
  if (env !== process.env) return createClient({ url, authToken: token });
  if (!sharedClient) sharedClient = createClient({ url, authToken: token });
  return sharedClient;
}
const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS tog_marketing_leads (id TEXT PRIMARY KEY,intent TEXT NOT NULL,source TEXT NOT NULL,email TEXT,phone TEXT,name TEXT,message TEXT,market_id TEXT,campaign TEXT,metadata_json TEXT NOT NULL DEFAULT \'{}\',created_at INTEGER NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_tog_marketing_leads_market ON tog_marketing_leads(market_id,created_at)',
  'CREATE TABLE IF NOT EXISTS tog_marketing_subscribers (email TEXT PRIMARY KEY COLLATE NOCASE,phone TEXT,name TEXT,source TEXT NOT NULL,intent TEXT NOT NULL,campaign TEXT,subscribed_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,opt_out_at INTEGER,opt_out_source TEXT)',
  'CREATE TABLE IF NOT EXISTS tog_marketing_market_preferences (email TEXT NOT NULL COLLATE NOCASE,market_id TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(email,market_id))',
  'CREATE INDEX IF NOT EXISTS idx_tog_marketing_market_preference ON tog_marketing_market_preferences(market_id,email)',
  'CREATE TABLE IF NOT EXISTS tog_marketing_sends (id TEXT PRIMARY KEY,email TEXT NOT NULL COLLATE NOCASE,market_id TEXT NOT NULL,campaign_key TEXT NOT NULL,provider_id TEXT,status TEXT NOT NULL CHECK(status IN (\'reserved\',\'sent\',\'failed\')),created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,UNIQUE(email,campaign_key))',
  'CREATE INDEX IF NOT EXISTS idx_tog_marketing_sends_campaign ON tog_marketing_sends(campaign_key,status)'
];
export async function ensureMarketingSchema(db = getMarketingClient()) {
  if (db === sharedClient && schemaReady) return schemaReady;
  const work = () => db.batch(SCHEMA, 'write');
  if (db !== sharedClient) return work();
  schemaReady = work().catch((err) => { schemaReady = undefined; throw err; });
  return schemaReady;
}
export function normalizeMarketingEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}
export async function captureMarketingLead(db, lead) {
  await ensureMarketingSchema(db);
  const now = Date.now();
  const email = normalizeMarketingEmail(lead.email) || null;
  const marketId = typeof lead.marketId === 'string' && lead.marketId ? lead.marketId : null;
  const id = randomUUID();
  const statements = [{
    sql: 'INSERT INTO tog_marketing_leads(id,intent,source,email,phone,name,message,market_id,campaign,metadata_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
    args: [id, lead.intent, lead.source || 'site', email, lead.phone || null, lead.name || null, lead.message || null, marketId, lead.campaign || null, JSON.stringify(lead.metadata || {}), now]
  }];
  if (email && SUBSCRIPTION_INTENTS.has(lead.intent) && lead.marketingConsent === true) {
    // An unsubscribe is permanent until a separately verified re-opt-in flow is added.
    statements.push({
      sql: 'INSERT INTO tog_marketing_subscribers(email,phone,name,source,intent,campaign,subscribed_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET phone=excluded.phone,name=excluded.name,source=excluded.source,intent=excluded.intent,campaign=excluded.campaign,updated_at=excluded.updated_at',
      args: [email, lead.phone || null, lead.name || null, lead.source || 'site', lead.intent, lead.campaign || null, now, now]
    });
    if (marketId) statements.push({
      sql: 'INSERT OR IGNORE INTO tog_marketing_market_preferences(email,market_id,created_at) VALUES(?,?,?)',
      args: [email, marketId, now]
    });
  }
  await db.batch(statements, 'write');
  return id;
}
export async function unsubscribeMarketingEmail(db, email, source = 'self_serve') {
  await ensureMarketingSchema(db);
  const normalized = normalizeMarketingEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('INVALID_MARKETING_EMAIL');
  const now = Date.now();
  await db.execute({
    sql: 'INSERT INTO tog_marketing_subscribers(email,source,intent,subscribed_at,updated_at,opt_out_at,opt_out_source) VALUES(?,\'unsubscribe\',\'email_signup\',?,?,?,?) ON CONFLICT(email) DO UPDATE SET updated_at=excluded.updated_at,opt_out_at=excluded.opt_out_at,opt_out_source=excluded.opt_out_source',
    args: [normalized, now, now, now, source]
  });
}
export async function eligibleMarketingSubscribers(db, marketId, limit = 200, campaignKey = '') {
  await ensureMarketingSchema(db);
  const rs = await db.execute({
    sql: 'SELECT s.email,s.name FROM tog_marketing_subscribers s WHERE s.opt_out_at IS NULL AND (EXISTS (SELECT 1 FROM tog_marketing_market_preferences p WHERE p.email=s.email AND p.market_id=?) OR NOT EXISTS (SELECT 1 FROM tog_marketing_market_preferences p2 WHERE p2.email=s.email)) AND NOT EXISTS (SELECT 1 FROM tog_marketing_sends q WHERE q.email=s.email AND q.campaign_key=?) ORDER BY s.subscribed_at ASC LIMIT ?',
    args: [marketId, campaignKey, Math.max(1, Math.min(500, limit))]
  });
  return rs.rows.map((row) => ({ email: String(row.email), name: row.name ? String(row.name) : '' }));
}
export async function reserveMarketingSend(db, email, marketId, campaignKey) {
  await ensureMarketingSchema(db);
  const now = Date.now();
  const result = await db.execute({
    sql: 'INSERT OR IGNORE INTO tog_marketing_sends(id,email,market_id,campaign_key,status,created_at,updated_at) SELECT ?,s.email,?,? ,\'reserved\',?,? FROM tog_marketing_subscribers s WHERE s.email=? AND s.opt_out_at IS NULL',
    args: [randomUUID(), marketId, campaignKey, now, now, normalizeMarketingEmail(email)]
  });
  return Number(result.rowsAffected) === 1;
}
export async function finishMarketingSend(db, email, campaignKey, status, providerId = null) {
  if (status !== 'sent' && status !== 'failed') throw new Error('BAD_MARKETING_SEND_STATUS');
  await db.execute({
    sql: 'UPDATE tog_marketing_sends SET status=?,provider_id=?,updated_at=? WHERE email=? AND campaign_key=? AND status=\'reserved\'',
    args: [status, providerId, Date.now(), normalizeMarketingEmail(email), campaignKey]
  });
}
export async function marketingCampaignMetrics(db, marketId) {
  await ensureMarketingSchema(db);
  const [leads, subscribers, sends] = await Promise.all([
    db.execute({ sql: 'SELECT COUNT(*) as count FROM tog_marketing_leads WHERE market_id=?', args: [marketId] }),
    db.execute({ sql: 'SELECT COUNT(DISTINCT s.email) as count FROM tog_marketing_subscribers s JOIN tog_marketing_market_preferences p ON p.email=s.email WHERE p.market_id=? AND s.opt_out_at IS NULL', args: [marketId] }),
    db.execute({ sql: 'SELECT status, COUNT(*) as count FROM tog_marketing_sends WHERE market_id=? GROUP BY status', args: [marketId] })
  ]);
  return { capturedLeads: Number(leads.rows[0]?.count || 0), optedInMarketSubscribers: Number(subscribers.rows[0]?.count || 0), emailSends: Object.fromEntries(sends.rows.map((r) => [String(r.status), Number(r.count)])) };
}


// Marketing messages are correlated by Resend provider message ID, never by
// an untrusted recipient value in webhook payloads.
export async function processMarketingResendEvent(db, { providerId, eventId, eventType }) {
  await ensureMarketingSchema(db);
  const result = await db.execute({
    sql: 'SELECT email FROM tog_marketing_sends WHERE provider_id=? LIMIT 1',
    args: [providerId],
  });
  const email = result.rows[0]?.email;
  if (!email) return { matched: false };
  await db.execute({
    sql: 'CREATE TABLE IF NOT EXISTS tog_marketing_webhook_events (id TEXT PRIMARY KEY,event_type TEXT NOT NULL,provider_id TEXT,processed_at INTEGER)',
  });
  const status = {
    'email.sent': 'sent', 'email.delivered': 'delivered', 'email.delivery_delayed': 'delayed',
    'email.failed': 'failed', 'email.suppressed': 'suppressed',
    'email.complained': 'complained', 'email.bounced': 'bounced',
    'email.opened': 'opened', 'email.clicked': 'clicked',
  }[eventType] || 'ignored';
  if (eventId) {
    const existing = await db.execute({ sql: 'SELECT processed_at FROM tog_marketing_webhook_events WHERE id=?', args: [eventId] });
    if (existing.rows[0]?.processed_at) return { matched: true, duplicate: true, status };
    await db.execute({ sql: 'INSERT OR IGNORE INTO tog_marketing_webhook_events (id,event_type,provider_id) VALUES(?,?,?)',
      args: [eventId, eventType, providerId] });
  }
  if (['bounced', 'complained', 'suppressed'].includes(status)) {
    await unsubscribeMarketingEmail(db, String(email), 'resend_' + status);
  }
  if (eventId) await db.execute({ sql: 'UPDATE tog_marketing_webhook_events SET processed_at=? WHERE id=?',
    args: [Date.now(), eventId] });
  return { matched: true, status };
}
