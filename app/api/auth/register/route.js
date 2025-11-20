import { NextResponse } from 'next/server';
import { createUser, initializeUserRewards, initializeUserChallenge } from '@/lib/db/users';
import { hashPassword, generateToken } from '@/lib/auth/jwt';
import { sendWelcomeEmail } from '@/lib/email/service';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, phone } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await createUser({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone: phone || null
    });

    // Initialize rewards and challenge
    await Promise.all([
      initializeUserRewards(user.id),
      initializeUserChallenge(user.id)
    ]);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user).catch(err => {
      console.error('Failed to send welcome email:', err);
      // Don't fail registration if email fails
    });

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    // Create response with token in cookie
    const response = NextResponse.json(
      {
        success: true,
        user,
        token
      },
      { status: 201 }
    );

    // Set HTTP-only cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    
    if (error.message === 'Email already registered') {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}
