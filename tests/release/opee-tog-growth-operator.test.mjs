import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildOpeeGrowthBrief, growthBriefMarkdown } from '../../scripts/opee-tog-growth-operator.mjs';

const checks = [
  'single_active_market','approved_serenbe_window','market_page_hours',
  'first_sip_visible','allergy_guard_visible','booth_checkout_only',
  'approved_menu_price','founder_story',
].map(id => ({ id, passed: true }));
const audited = Object.freeze({
  kind: 'tog_marketing_live_readonly', auditedAt: '2026-11-15T12:00:00.000Z',
  origin: 'https://tasteofgratitude.shop', result: 'PASS',
  passed: checks.length, checked: checks.length, checks, certified: false,
});
const clock = () => new Date('2026-11-15T12:02:00.000Z');

describe('OPEE marketing operator — bounded daily execution', () => {
  it('produces a deterministic non-sending reviewable action plan', () => {
    const brief = buildOpeeGrowthBrief(audited, clock);
    assert.equal(brief.system, 'OPEE_MAX_TOG_MARKETING_OPERATOR');
    assert.equal(brief.state, 'SAFE_OWNER_REVIEW_READY');
    assert.equal(brief.actions[0].id, 'serenbe_first_sip');
    assert.equal(brief.actions[0].state, 'READY_FOR_OWNER_MANUAL_PILOT');
    assert.equal(brief.draft.status, 'DRAFT_OWNER_REVIEW_ONLY');
    assert.equal(brief.draft.publicationAuthorized, false);
    assert.equal(brief.permissions.automatedCustomerCommunication, false);
    assert.equal(brief.permissions.automatedPublication, false);
    assert.equal(brief.permissions.automatedPaidSpend, false);
    assert.equal(brief.permissions.automatedLiveCommerceChanges, false);
    assert.equal(brief.independentCertification, false);
    assert.equal(brief.metrics.contributionProfit, null);
    assert.equal(brief.metrics.thirtyDayRepeatCustomerRate, null);
    assert.ok(growthBriefMarkdown(brief).includes('No automated emails, texts, posts, paid ads'));
  });

  it('stops copy publication and market pilots on any failed trust check', () => {
    const badChecks = audited.checks.map(x => x.id === 'approved_menu_price' ? { ...x, passed: false } : x);
    const failed = { ...audited, result: 'FAIL', checks: badChecks, passed: 7, failed: ['approved_menu_price'] };
    const brief = buildOpeeGrowthBrief(failed, clock);
    assert.equal(brief.state, 'STOP_PUBLIC_TRUTH_FAILED');
    assert.equal(brief.draft, null);
    assert.ok(brief.evidence.missingTruth.includes('approved_menu_price'));
    assert.equal(brief.actions[0].state, 'BLOCKED');
    assert.ok(growthBriefMarkdown(brief).includes('Held because public truth verification failed'));
  });

  it('fails closed with incomplete, uncertified or invented public evidence', () => {
    assert.throws(() => buildOpeeGrowthBrief(null), /VERIFIED_PUBLIC_AUDIT_REQUIRED/);
    assert.throws(() => buildOpeeGrowthBrief({ ...audited, certified: true }), /VERIFIED_PUBLIC_AUDIT_REQUIRED/);
    assert.throws(() => buildOpeeGrowthBrief({ ...audited, checks: null }), /VERIFIED_PUBLIC_AUDIT_REQUIRED/);
    const incomplete = { ...audited, checks: audited.checks.filter(x => x.id !== 'founder_story') };
    const brief = buildOpeeGrowthBrief(incomplete, clock);
    assert.equal(brief.draft, null);
    assert.equal(brief.state, 'STOP_PUBLIC_TRUTH_FAILED');
  });

  it('does not fabricate ROI, customer counts, stock, purchases or repeat rate', () => {
    const brief = buildOpeeGrowthBrief(audited, clock);
    assert.ok(brief.actions.every(a => a.estimatedRevenue === null));
    assert.deepEqual(Object.keys(brief.metrics).filter(k => k !== 'status')
      .map(k => brief.metrics[k]), [null, null, null, null, null]);
    assert.ok(brief.actions.some(a => a.id === 'price_and_inventory_truth' && a.state.startsWith('BLOCKED')));
    assert.ok(brief.actions.some(a => a.id === 'consent_safe_repeat_purchase' && a.state === 'BLOCKED_NO_SEND'));
    assert.ok(brief.draft.copy.includes('Ask us what’s available today'));
    assert.ok(!/cure|detox|reduce inflammation|guaranteed/i.test(brief.draft.copy));
  });

  it('keeps the scheduled workflow and code separate from customers, paid ads, Grok Bot and direct messaging', () => {
    const brief = buildOpeeGrowthBrief(audited, clock);
    assert.deepEqual(brief.permissions.disallowedActions,
      ['email','sms','dm','social_post','paid_ad','customer_import',
        'live_price_change','inventory_change','square_payment','production_deploy']);
  });
});
