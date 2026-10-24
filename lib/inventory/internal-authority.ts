import { timingSafeEqual } from 'node:crypto';

/**
 * Inventory mutation endpoints are reserved for authenticated first-party
 * server workers, NEVER customer browsers. An absent/weak shared credential
 * rejects every request. Do not log the credential or request header.
 *
 * Future versions should use scoped OIDC and order-bound signed claims
 * instead of a long-lived shared secret.
 */
export function hasInventoryMutationAuthority(headers: Headers): boolean {
  const secret = process.env.INVENTORY_INTERNAL_SECRET || '';
  if (secret.length < 32 || secret.length > 4096) return false;
  const given = headers.get('authorization') || '';
  const expected = 'Bearer ' + secret;
  const provided = Buffer.from(given, 'utf8');
  const correct = Buffer.from(expected, 'utf8');
  return provided.length === correct.length && timingSafeEqual(provided, correct);
}
