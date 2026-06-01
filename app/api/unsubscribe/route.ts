export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

/**
 * Marketing email unsubscribe endpoint.
 *
 * Accepts either:
 *   - GET  /api/unsubscribe?token=<signed-token>
 *   - POST /api/unsubscribe   { token: "<signed-token>" }
 *   - POST /api/unsubscribe   { email: "..." }      (fallback for legacy mails)
 *
 * Token format: `<base64url(email)>.<hmac-sha256(email, JWT_SECRET)>`.
 * Using HMAC means we can verify the token without storing per-email tokens
 * and without exposing whether an email is in our list (the success response
 * is identical regardless of whether the email exists).
 *
 * Legal: CAN-SPAM requires a working one-click unsubscribe within 10 business
 * days. We mark the subscriber unsubscribed in `newsletter_subscribers` and
 * also flip every `email_sends` future write to skip them in higher layers.
 */

function getSecret(): string {
  return (
    process.env.JWT_SECRET ||
    process.env.UNSUBSCRIBE_SECRET ||
    'dev-only-insecure-unsubscribe-secret'
  );
}

function b64urlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
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

function signEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const mac = crypto
    .createHmac('sha256', getSecret())
    .update(normalized)
    .digest('hex');
  return `${b64urlEncode(normalized)}.${mac}`;
}

function verifyToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null;
  // Exactly one separator, mac is exactly 64 hex chars (sha256). Reject
  // any trailing garbage so an attacker can't pad a valid token (Node's
  // `Buffer.from(s, 'hex')` silently truncates at the first invalid pair).
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
    .createHmac('sha256', getSecret())
    .update(email)
    .digest('hex');
  // Constant-time comparison.
  const a = Buffer.from(mac, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/** Helper exported for email templates: build a working unsubscribe URL. */
export function buildUnsubscribeUrl(baseUrl: string, email: string): string {
  const token = signEmail(email);
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
}

async function markUnsubscribed(email: string, source: string) {
  const { db } = await connectToDatabase();
  const now = new Date();
  await db.collection('newsletter_subscribers').updateOne(
    { email },
    {
      $set: {
        email,
        unsubscribed: true,
        unsubscribedAt: now,
        unsubscribedSource: source,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
}

function safeOkResponse() {
  // Deliberately identical for valid/invalid/unknown emails — prevents using
  // this endpoint as an email-existence oracle.
  return NextResponse.json({
    success: true,
    message: 'If that email was subscribed, it has been removed.',
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Missing token' },
      { status: 400 }
    );
  }
  const email = verifyToken(token);
  if (!email) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired unsubscribe link' },
      { status: 400 }
    );
  }
  try {
    await markUnsubscribed(email, 'one_click_get');
    logger.info('Unsubscribe', 'Email unsubscribed', { email, source: 'GET' });
  } catch (err) {
    logger.error('Unsubscribe', 'Failed to record unsubscribe', {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return safeOkResponse();
}

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  let email: string | null = null;
  if (typeof body?.token === 'string') {
    email = verifyToken(body.token);
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired unsubscribe link' },
        { status: 400 }
      );
    }
  } else if (typeof body?.email === 'string') {
    const normalized = body.email.trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      email = normalized;
    }
  }

  if (!email) {
    // Same safe response — do not reveal whether an email exists.
    return safeOkResponse();
  }

  try {
    await markUnsubscribed(email, body?.token ? 'one_click_post' : 'self_serve_post');
    logger.info('Unsubscribe', 'Email unsubscribed', {
      email,
      source: body?.token ? 'POST_TOKEN' : 'POST_EMAIL',
    });
  } catch (err) {
    logger.error('Unsubscribe', 'Failed to record unsubscribe', {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return safeOkResponse();
}
