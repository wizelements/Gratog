import { NextRequest, NextResponse } from 'next/server';
import { validateRegistration } from '@/lib/auth/validation';
import { hashPassword, generateToken } from '@/lib/auth/jwt';
import { createUser, initializeUserRewards, initializeUserChallenge } from '@/lib/db/users';
import { sendWelcomeEmail } from '@/lib/email/service';
import { connectToDatabase } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max = 5, windowMs = 15 * 60 * 1000) {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate registration data
    const validation = validateRegistration(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    const normalizedEmail = body.email.trim().toLowerCase();

    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(`register:${ip}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(body.password);
    const user = await createUser({
      name: body.name.trim(),
      email: normalizedEmail,
      passwordHash,
      phone: body.phone?.trim() || null,
    });

    // Initialize rewards and challenges
    try {
      await initializeUserRewards(user.id);
      await initializeUserChallenge(user.id);
    } catch (e) {
      console.warn('Failed to initialize rewards/challenges:', e);
    }

    // Generate JWT token
    const token = await generateToken(user.id, user.email);

    // Reconcile pending_customers
    try {
      const { db } = await connectToDatabase();
      await db.collection('pending_customers').updateOne(
        { email: normalizedEmail },
        {
          $set: {
            status: 'converted',
            convertedUserId: user.id,
            convertedName: user.name,
            convertedSource: 'auth_register',
            convertedAt: new Date(),
          },
        }
      );
    } catch (e) {
      console.warn('Pending customer reconciliation failed:', e);
    }

    // Send welcome email (fire and forget)
    sendWelcomeEmail(user).catch(() => {});

    // Set auth_token cookie
    const response = NextResponse.json(
      { success: true, user },
      { status: 201 }
    );

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    if (error.message === 'Email already registered') {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
