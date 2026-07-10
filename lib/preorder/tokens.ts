/**
 * Signed action tokens for preorder confirm/cancel links sent by email.
 *
 * Tokens are HMAC-signed, carry an action (`confirm` | `cancel`), an order
 * number, and a timestamp. They expire after a configurable TTL (default 7 days
 * for confirm/cancel links).
 *
 * Used by:
 *   - scripts/pickup-reminders.ts  (generates links in reminder emails)
 *   - app/api/preorder/confirm/route.ts
 *   - app/api/preorder/cancel/route.ts
 */

import crypto from 'crypto';

export type OrderAction = 'confirm' | 'cancel';

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret =
    process.env.JWT_SECRET ||
    process.env.PREORDER_TOKEN_SECRET ||
    process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET, PREORDER_TOKEN_SECRET, or UNSUBSCRIBE_SECRET must be configured'
    );
  }
  return secret;
}

function b64urlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function b64urlDecode(input: string): string {
  let s = input.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}

interface TokenPayload {
  o: string; // orderNumber
  a: OrderAction;
  t: number; // timestamp ms
}

export function signOrderToken(
  orderNumber: string,
  action: OrderAction,
  ttlMs: number = DEFAULT_TTL_MS
): string {
  const payload: TokenPayload = {
    o: orderNumber,
    a: action,
    t: Date.now(),
  };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(`${payloadB64}.${action}.${orderNumber}`)
    .digest('hex');
  return `${payloadB64}.${signature}`;
}

export function verifyOrderToken(
  token: string,
  action: OrderAction,
  ttlMs: number = DEFAULT_TTL_MS
): { orderNumber: string } | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature || !/^[0-9a-f]{64}$/.test(signature)) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64));
  } catch {
    return null;
  }

  if (!payload || typeof payload !== 'object') return null;
  if (payload.a !== action) return null;
  if (!payload.o || typeof payload.o !== 'string') return null;
  if (!payload.t || typeof payload.t !== 'number') return null;

  // Expiration check
  if (Date.now() - payload.t > ttlMs) return null;

  const expected = crypto
    .createHmac('sha256', getSecret())
    .update(`${payloadB64}.${action}.${payload.o}`)
    .digest('hex');

  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  return { orderNumber: payload.o };
}

export function buildOrderActionUrl(
  baseUrl: string,
  action: OrderAction,
  orderNumber: string,
  token: string
): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/api/preorder/${action}?orderId=${encodeURIComponent(orderNumber)}&token=${encodeURIComponent(token)}`;
}
