/**
 * Square Messages offers a *separately verified*, dedicated toll-free
 * business number on eligible plans. Its Square Online Text Us widget does
 * not embed into our independent Vercel storefront.
 *
 * Do not expose a native SMS action until the merchant has confirmed that
 * inbound texts to this exact toll-free number appear in Square Messages.
 */
const VERIFIED_TOLLFREE = /^\+1(?:800|888|877|866|855|844|833)[2-9]\d{6}$/;

export function verifiedSquareSmsNumber(raw: unknown, certified: unknown): string | null {
  if (certified !== 'true' || typeof raw !== 'string' || !raw.trim()) return null;
  const value = raw.replace(/[\s().-]/g, '');
  const number = value.startsWith('+') ? value : '+' + value;
  return VERIFIED_TOLLFREE.test(number) ? number : null;
}

export function verifiedSquareSmsHref(raw: unknown, certified: unknown,
  reference?: string): string | null {
  const number = verifiedSquareSmsNumber(raw, certified);
  if (!number) return null;
  const text = typeof reference === 'string' && /^[a-f0-9]{12}$/.test(reference)
    ? '?body=' + encodeURIComponent('Taste of Gratitude order request ' + reference)
    : '';
  return 'sms:' + number + text;
}
