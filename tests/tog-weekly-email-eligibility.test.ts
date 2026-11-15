import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { canReceiveWeeklyMenu, normalizeRecipientEmail } from '@/lib/marketing/weekly-email-eligibility';

const eligible = {
  email: 'Customer@Example.com ',
  marketingConsent: true,
  consentPurpose: 'weekly_menu_email',
};

describe('weekly menu marketing consent and suppression', () => {
  it('normalizes email without exposing personally identifiable information', () => {
    expect(normalizeRecipientEmail(' Customer@Example.com  ')).toBe('customer@example.com');
    expect(normalizeRecipientEmail(undefined)).toBe('');
  });

  it('requires affirmative, purpose-specific marketing consent', () => {
    expect(canReceiveWeeklyMenu(eligible, new Set())).toBe(true);
    expect(canReceiveWeeklyMenu({ ...eligible, marketingConsent: false }, new Set())).toBe(false);
    expect(canReceiveWeeklyMenu({ ...eligible, marketingConsent: undefined }, new Set())).toBe(false);
    expect(canReceiveWeeklyMenu({ ...eligible, consentPurpose: 'preorder_intent_no_market' }, new Set())).toBe(false);
    expect(canReceiveWeeklyMenu({ ...eligible, consentPurpose: 'order_confirmation' }, new Set())).toBe(false);
    expect(canReceiveWeeklyMenu({ ...eligible, consentPurpose: 'weekly_menu_email', email: 'invalid' }, new Set())).toBe(false);
  });

  it('permits specifically opted-in newsletter subscriptions', () => {
    expect(canReceiveWeeklyMenu({ ...eligible, consentPurpose: 'email_signup' }, new Set())).toBe(true);
  });

  it('fails closed for opt-outs and shared suppression records', () => {
    expect(canReceiveWeeklyMenu({ ...eligible, unsubscribed: true }, new Set())).toBe(false);
    expect(canReceiveWeeklyMenu({ ...eligible, unsubscribedAt: new Date() }, new Set())).toBe(false);
    expect(canReceiveWeeklyMenu({ ...eligible, optOutAt: new Date() }, new Set())).toBe(false);
    expect(canReceiveWeeklyMenu({ ...eligible, metadata: { unsubscribed: true } }, new Set())).toBe(false);
    expect(canReceiveWeeklyMenu({ ...eligible, metadata: { optOutAt: '2026-11-14' } }, new Set())).toBe(false);
    expect(canReceiveWeeklyMenu(eligible, new Set(['customer@example.com']))).toBe(false);
  });

  it('never builds a marketing audience from general lead_intents', () => {
    const broadcaster = readFileSync('scripts/weekly-menu-broadcast.ts', 'utf8');
    expect(broadcaster).toContain("db.collection('newsletter_subscribers').find");
    expect(broadcaster).not.toContain("db.collection('lead_intents').find");
    expect(broadcaster).toContain('loadSuppressedEmails');
    expect(broadcaster).toContain('TOG_MARKETING_SEND_CERTIFIED');
    expect(broadcaster).toContain('owner-approved');
    expect(broadcaster).toContain('getActiveMarketPickups()');
  });

  it('only recognizes explicit newsletter signup intent in lead handler', () => {
    const source = readFileSync('app/api/lead/route.ts', 'utf8');
    expect(source).toContain("const MARKETING_EMAIL_INTENTS = new Set(['weekly_menu_email', 'email_signup'])");
    expect(source).toContain('MARKETING_EMAIL_INTENTS.has(document.intent)');
    expect(source).toContain('marketingConsent: true');
    expect(source).toContain('consentPurpose: document.intent');
  });
});
