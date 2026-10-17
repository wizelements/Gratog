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

/** An HTTP 400 validation error is NOT proof that a card was declined. */
export function isExpectedSandboxCardDecline(response) {
  return !response.ok && Boolean(response.data?.errors?.some(error =>
    error.category === 'PAYMENT_METHOD_ERROR' && /DECLIN/i.test(error.code || '')
  ));
}

/** Reusing a key with modified payment details must be refused as an idempotency violation. */
export function isExpectedSandboxIdempotencyConflict(response) {
  return !response.ok && Boolean(response.data?.errors?.some(error =>
    /IDEMPOTENCY.*REUS/i.test(error.code || '')
  ));
}
