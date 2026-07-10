export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { verifyUnsubscribeToken as verifyServiceUnsubscribeToken } from '@/lib/email/service';
import {
  verifySignedEmail,
  buildUnsubscribeUrl,
} from '@/lib/email/unsubscribe-tokens';

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

function verifyToken(token: string): string | null {
  const email = verifySignedEmail(token);
  if (email) return email;
  return verifyLegacyServiceToken(token);
}

function verifyLegacyServiceToken(token: string): string | null {
  try {
    const decoded = verifyServiceUnsubscribeToken(token);
    const email = typeof decoded?.email === 'string'
      ? decoded.email.trim().toLowerCase()
      : null;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return email;
  } catch {
    return null;
  }
}

async function markUnsubscribed(email: string, source: string) {
  const { db } = await connectToDatabase();
  const now = new Date();
  await Promise.all([
    db.collection('newsletter_subscribers').updateOne(
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
    ),
    db.collection('unsubscribes').updateOne(
      { email },
      {
        $set: {
          email,
          unsubscribedAt: now,
          source,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    ),
    db.collection('email_suppressions').updateOne(
      { email, reason: 'marketing_opt_out' },
      {
        $set: {
          email,
          reason: 'marketing_opt_out',
          source,
          active: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    ),
    db.collection('user_preferences').updateMany(
      { email },
      {
        $set: {
          marketing: false,
          updatedAt: now,
        },
      }
    ),
  ]);
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
