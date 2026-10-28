import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {openTursoPreview,tursoPreviewSelected} from '@/lib/checkout/turso-preview-runtime.mjs';
import {createTursoPasswordReset,findTursoCustomerByEmail} from '@/lib/auth/turso-customer-accounts.mjs';
import {isTursoPreviewResetRecipient,trustedTursoPreviewResetBaseUrl,deliverTursoPreviewReset} from '@/lib/auth/turso-preview-password-reset.mjs';

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

    if (typeof email!=='string'||!email||email.length>254) {
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

    // Preview cannot look up customer identities in Mongo or notify real
    // customers. Do not use an untrusted request Host as a reset URL.
    const selected=tursoPreviewSelected();
    if(selected&&!isTursoPreviewResetRecipient(normalizedEmail))return NextResponse.json(SAFE_RESPONSE);
    const resetBaseUrl=selected?trustedTursoPreviewResetBaseUrl():undefined;
    const tursoDb=selected?await openTursoPreview():null;
    // Look up user without revealing whether the account exists.
    const user=tursoDb
      ?await findTursoCustomerByEmail(tursoDb,normalizedEmail)
      :await (await import('@/lib/db/users')).findUserByEmail(normalizedEmail);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      if (tursoDb) {
        await createTursoPasswordReset(tursoDb,user.id,tokenHash,
          new Date(Date.now()+30*60*1000).toISOString());
      } else {
        const { db } = await (await import('@/lib/db-optimized')).connectToDatabase();
        await db.collection('password_resets').insertOne({
        userId: user.id,
        email: normalizedEmail,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        consumed: false,
        createdAt: new Date(),
        });
      }

      // Send reset email (don't let failure leak info)
      try {
        if(tursoDb)await deliverTursoPreviewReset(tursoDb,{user,token,baseUrl:resetBaseUrl});
        else await (await import('@/lib/email/service')).sendPasswordResetEmail(user,token);
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
