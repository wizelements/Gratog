import { randomUUID } from 'node:crypto';

/**
 * Square CreatePayment limits idempotency_key to 45 characters.
 * Prefix plus UUID keeps intent identifiable without sacrificing uniqueness.
 */
export function sandboxIdempotencyKey(label) {
  const prefix = String(label).replace(/[^a-z0-9]/gi, '').slice(0, 6).toLowerCase();
  if (!prefix) throw new Error('A sandbox idempotency label is required');
  const value = `${prefix}-${randomUUID()}`;
  if (value.length > 45) throw new Error('Square idempotency key exceeds 45 characters');
  return value;
}
