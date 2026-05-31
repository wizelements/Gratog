export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendEmail } from '@/lib/resend-email';
import { logger } from '@/lib/logger';
import { SUPPORT_EMAIL } from '@/lib/site-config';

/**
 * Admin password reset.
 *
 * Two phases on a single route:
 *   1. POST { email }                  → request a reset link (always 200,
 *                                         never reveals whether the email
 *                                         exists).
 *   2. POST { token, newPassword }     → consume a reset token, rotate the
 *                                         password, invalidate the token.
 *
 * Reset link contains a single-use token stored in `admin_password_resets`,
 * 30 minute TTL. Notification mail flows through the tracked sendEmail()
 * pipeline so it lands in `email_sends`.
 */

const RequestSchema = z.object({
  email: z.string().email().max(254),
});

const ConsumeSchema = z.object({
  token: z.string().min(32).max(256),
  newPassword: z.string().min(12).max(128),
});

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 5;
const rate = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rate.get(key);
  if (!entry || now > entry.resetAt) {
    rate.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count += 1;
  return true;
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function safeOk() {
  return NextResponse.json({
    success: true,
    message:
      'If an admin account exists for that email, a reset link has been sent.',
  });
}

async function requestReset(email: string, origin: string) {
  const { db } = await connectToDatabase();
  const admin = await db
    .collection('admin_users')
    .findOne({ email: email.toLowerCase() });

  // Always return 200 — do not leak existence — but only generate a token
  // if the admin really exists.
  if (!admin) return;

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await db.collection('admin_password_resets').insertOne({
    adminId: admin._id?.toString() || admin.id,
    email: admin.email,
    tokenHash,
    expiresAt,
    consumed: false,
    createdAt: new Date(),
  });

  const resetUrl = `${origin.replace(/\/$/, '')}/admin/reset-password?token=${encodeURIComponent(
    token
  )}`;

  await sendEmail({
    to: admin.email,
    subject: 'Reset your Taste of Gratitude admin password',
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto">
        <h2>Admin password reset</h2>
        <p>A password reset was requested for this admin account. The link below is valid for 30 minutes and may be used once.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;border-radius:6px;text-decoration:none">Reset password</a></p>
        <p style="color:#666;font-size:13px">If you did not request this, ignore this email and contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>
    `,
    text: `Reset your admin password: ${resetUrl}\n\nThis link is valid for 30 minutes.`,
    emailType: 'admin_password_reset',
    template: 'admin_password_reset',
    customerEmail: admin.email,
  });

  logger.info('AdminReset', 'Reset link issued', { email: admin.email });
}

async function consumeReset(token: string, newPassword: string) {
  const { db } = await connectToDatabase();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const record = await db.collection('admin_password_resets').findOne({
    tokenHash,
    consumed: false,
    expiresAt: { $gt: new Date() },
  });
  if (!record) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired reset token' },
      { status: 400 }
    );
  }

  // Atomic single-use claim.
  const claim = await db
    .collection('admin_password_resets')
    .updateOne(
      { _id: record._id, consumed: false },
      { $set: { consumed: true, consumedAt: new Date() } }
    );
  if (claim.modifiedCount !== 1) {
    return NextResponse.json(
      { success: false, error: 'Reset token already used' },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.collection('admin_users').updateOne(
    { email: record.email },
    {
      $set: {
        passwordHash,
        passwordUpdatedAt: new Date(),
        // Force re-login by bumping a token version (if your JWT layer
        // checks it; otherwise this is just an audit field).
        tokenVersion: (Math.random() * 1e9) | 0,
      },
    }
  );

  logger.info('AdminReset', 'Password rotated via reset link', {
    email: record.email,
  });

  return NextResponse.json({
    success: true,
    message: 'Password has been reset. Please sign in with your new password.',
  });
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Try again later.' },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Phase 2 (consume) — when both token AND newPassword are present.
  if (body?.token && body?.newPassword) {
    const parsed = ConsumeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    try {
      return await consumeReset(parsed.data.token, parsed.data.newPassword);
    } catch (err) {
      logger.error('AdminReset', 'Consume failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        { success: false, error: 'Reset failed. Please try again.' },
        { status: 500 }
      );
    }
  }

  // Phase 1 (request)
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    // Same safe response so we don't leak whether the input was valid.
    return safeOk();
  }

  try {
    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      'https://gratog.com';
    await requestReset(parsed.data.email, origin);
  } catch (err) {
    logger.error('AdminReset', 'Reset request failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Still return 200 to avoid leakage.
  }
  return safeOk();
}
