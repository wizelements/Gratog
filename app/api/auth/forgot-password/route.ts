import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { findUserByEmail } from '@/lib/db/users';
import { sendPasswordResetEmail } from '@/lib/email/service';
import { connectToDatabase } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max = 3, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }
  if (entry.count >= max) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: max - entry.count };
}

const SAFE_RESPONSE = {
  success: true,
  message: "If an account with that email exists, we've sent a password reset link.",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(SAFE_RESPONSE);
    }

    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(`forgot:${ip}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up user (don't reveal whether they exist)
    const user = await findUserByEmail(normalizedEmail);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const { db } = await connectToDatabase();
      await db.collection('password_resets').insertOne({
        userId: user.id,
        email: normalizedEmail,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        consumed: false,
        createdAt: new Date(),
      });

      // Send reset email (don't let failure leak info)
      try {
        await sendPasswordResetEmail(user, token);
      } catch (e) {
        console.error('Failed to send password reset email:', e);
      }
    }

    return NextResponse.json(SAFE_RESPONSE);
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(SAFE_RESPONSE);
  }
}
