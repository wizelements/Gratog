/**
 * Marketing send eligibility is deliberately stricter than lead capture.
 * A website contact, an order, or a legacy lead does not prove marketing consent.
 */
export interface WeeklyEmailRecipient {
  email?: string | null;
  intent?: string | null;
  consentPurpose?: string | null;
  marketingConsent?: boolean;
  unsubscribed?: boolean;
  unsubscribedAt?: unknown;
  optOutAt?: unknown;
  metadata?: { unsubscribed?: boolean; unsubscribedAt?: unknown; optOutAt?: unknown } | null;
}

const MARKETING_PURPOSES = new Set(['weekly_menu_email', 'email_signup']);

export function normalizeRecipientEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function canReceiveWeeklyMenu(
  recipient: WeeklyEmailRecipient,
  suppressedEmails: ReadonlySet<string>,
): boolean {
  const email = normalizeRecipientEmail(recipient.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (recipient.marketingConsent !== true) return false;
  if (!MARKETING_PURPOSES.has(recipient.consentPurpose || recipient.intent || '')) return false;
  if (recipient.unsubscribed === true || recipient.unsubscribedAt || recipient.optOutAt) return false;
  const metadata = recipient.metadata || {};
  if (metadata.unsubscribed === true || metadata.unsubscribedAt || metadata.optOutAt) return false;
  return !suppressedEmails.has(email);
}
