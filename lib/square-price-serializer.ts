/**
 * Safe serialization helpers for Square monetary amounts and storefront validation.
 *
 * Square returns `amount` as BigInt in cents. These helpers convert to Number
 * without mixing types, reject unsafe values, and decide whether a catalog item
 * should be offered as purchasable.
 */

export type SquareAmountInput = bigint | number | string | undefined | null;

const MAX_REASONABLE_CENTS = 1_000_000_00; // $100,000 USD in cents — well above any SKU this site will sell.
const SUPPORTED_CURRENCIES = new Set(['USD']);
const SUPPORTED_ITEM_TYPES = new Set(['ITEM', 'ITEM_VARIATION']);

/**
 * Convert a Square monetary amount to integer cents safely.
 *
 * Returns a `{ cents, status }` tuple so callers can distinguish:
 * - `valid`: a positive amount that can be displayed and charged
 * - `zero`: explicitly $0 (not a purchasable SKU unless free products are enabled)
 * - `missing`: no amount provided
 * - `invalid`: malformed, non-finite, negative, or unreasonably large amount
 */
export function safeSquareCents(
  rawAmount: SquareAmountInput
): { cents: number; status: 'valid' | 'zero' | 'missing' | 'invalid' } {
  if (rawAmount === undefined || rawAmount === null) {
    return { cents: 0, status: 'missing' };
  }

  if (typeof rawAmount === 'bigint') {
    const n = Number(rawAmount);
    if (!Number.isFinite(n)) return { cents: 0, status: 'invalid' };
    if (n <= 0) return { cents: n, status: n === 0 ? 'zero' : 'invalid' };
    if (n > MAX_REASONABLE_CENTS) return { cents: n, status: 'invalid' };
    return { cents: n, status: 'valid' };
  }

  if (typeof rawAmount === 'number') {
    if (!Number.isFinite(rawAmount) || !Number.isInteger(rawAmount)) {
      return { cents: 0, status: 'invalid' };
    }
    if (rawAmount <= 0) {
      return { cents: rawAmount, status: rawAmount === 0 ? 'zero' : 'invalid' };
    }
    if (rawAmount > MAX_REASONABLE_CENTS) return { cents: rawAmount, status: 'invalid' };
    return { cents: rawAmount, status: 'valid' };
  }

  if (typeof rawAmount === 'string') {
    const trimmed = rawAmount.trim();
    if (trimmed === '') return { cents: 0, status: 'missing' };
    const n = Number(trimmed);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return { cents: 0, status: 'invalid' };
    if (n <= 0) return { cents: n, status: n === 0 ? 'zero' : 'invalid' };
    if (n > MAX_REASONABLE_CENTS) return { cents: n, status: 'invalid' };
    return { cents: n, status: 'valid' };
  }

  return { cents: 0, status: 'invalid' };
}

export type StorefrontValidationIssue =
  | 'unsupported_type'
  | 'missing_name'
  | 'unnamed'
  | 'missing_price'
  | 'zero_price'
  | 'invalid_price'
  | 'missing_currency'
  | 'unsupported_currency'
  | 'missing_item_id'
  | 'missing_variation_id'
  | 'explicitly_disabled';

export interface StorefrontItem {
  id?: string;
  name?: string;
  priceCents?: number;
  currency?: string;
  variationId?: string;
  itemType?: string;
  available?: boolean;
  inStock?: boolean;
}

export interface StorefrontValidationResult {
  valid: boolean;
  issues: StorefrontValidationIssue[];
}

/**
 * Validate whether a Square-derived item should be exposed as a purchasable storefront SKU.
 */
export function validateStorefrontItem(item: StorefrontItem): StorefrontValidationResult {
  const issues: StorefrontValidationIssue[] = [];

  if (item.itemType && !SUPPORTED_ITEM_TYPES.has(item.itemType)) {
    issues.push('unsupported_type');
  }

  if (!item.id) issues.push('missing_item_id');
  if (!item.variationId) issues.push('missing_variation_id');

  if (!item.name || item.name.trim() === '') {
    issues.push('missing_name');
  } else if (item.name === 'Unnamed Product') {
    issues.push('unnamed');
  }

  if (item.priceCents === undefined) {
    issues.push('missing_price');
  } else if (typeof item.priceCents !== 'number' || !Number.isFinite(item.priceCents)) {
    issues.push('invalid_price');
  } else if (item.priceCents <= 0) {
    issues.push(item.priceCents === 0 ? 'zero_price' : 'invalid_price');
  }

  if (!item.currency) {
    issues.push('missing_currency');
  } else if (!SUPPORTED_CURRENCIES.has(item.currency)) {
    issues.push('unsupported_currency');
  }

  if (item.available === false || item.inStock === false) {
    issues.push('explicitly_disabled');
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Convenience boolean wrapper for `validateStorefrontItem`.
 */
export function isValidStorefrontItem(item: StorefrontItem): boolean {
  return validateStorefrontItem(item).valid;
}

/**
 * Build a sanitized summary of rejected Square records without exposing tokens,
 * raw provider errors, customer data, or internal environment values.
 */
export function summarizeRejection(
  name: string | undefined,
  issues: StorefrontValidationIssue[]
): string {
  const label = name && name.trim() ? name : '<unnamed>';
  return `${label}: ${issues.join(', ')}`;
}
