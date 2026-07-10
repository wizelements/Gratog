/**
 * Shared HMAC-based unsubscribe tokens.
 *
 * Used by:
 *   - app/api/unsubscribe/route.ts  (web one-click unsubscribe)
 *   - scripts/weekly-menu-broadcast.ts  (per-recipient unsubscribe links)
 *
 * Format: `<base64url(email)>.<hmac-sha256(email, JWT_SECRET)>`.
 * No Next.js imports so scripts can import it safely.
 */

import crypto from 'crypto';

export function getUnsubscribeSecret(): string {
  const secret =
    process.env.JWT_SECRET ||
    process.env.UNSUBSCRIBE_SECRET ||
    'dev-only-insecure-unsubscribe-secret';
  return secret;
}

export function b64urlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function b64urlDecode(input: string): string {
  let s = input.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}

export function signEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const mac = crypto
    .createHmac('sha256', getUnsubscribeSecret())
    .update(normalized)
    .digest('hex');
  return `${b64urlEncode(normalized)}.${mac}`;
}

export function verifySignedEmail(token: string): string | null {
  if (!token || typeof token !== 'string') return null;
  // Exactly one separator, mac is exactly 64 hex chars (sha256). Reject
  // any trailing garbage so an attacker can't pad a valid token (Node's
  // Buffer.from(s, 'hex') silently truncates at the first invalid pair).
  const m = /^([A-Za-z0-9_-]+)\.([0-9a-f]{64})$/.exec(token);
  if (!m) return null;
  const [, encEmail, mac] = m;

  let email: string;
  try {
    email = b64urlDecode(encEmail).trim().toLowerCase();
  } catch {
    return null;
  }
  const expected = crypto
    .createHmac('sha256', getUnsubscribeSecret())
    .update(email)
    .digest('hex');

  const a = Buffer.from(mac, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function buildUnsubscribeUrl(baseUrl: string, email: string): string {
  const token = signEmail(email);
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
}
