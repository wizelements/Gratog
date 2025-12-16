import { NextResponse } from 'next/server';
import { createUser, initializeUserRewards, initializeUserChallenge } from '@/lib/db/users';
import { hashPassword, generateToken } from '@/lib/auth/jwt';
import { sendWelcomeEmail } from '@/lib/email/service';
import { validateRegistration } from '@/lib/auth/validation';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, confirmPassword, phone } = body;

    // Comprehensive validation
    const validation = validateRegistration({
      name,
      email,
      password,
      confirmPassword,
      phone
    });

    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          errors: validation.errors 
        },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await createUser({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      phone: phone ? phone.trim() : null
    });

    // Initialize user features in parallel
    const initResults = await Promise.allSettled([
      initializeUserRewards(user.id),
      initializeUserChallenge(user.id)
    ]);

    // Log initialization results (non-blocking)
    initResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to initialize user feature ${index}:`, result.reason);
      }
    });

    // Send welcome email (non-blocking, don't fail registration if it fails)
    sendWelcomeEmail(user).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    // Create response with token in cookie
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          joinedAt: user.joinedAt
        },
        token,
        message: 'Account created successfully! Welcome to Taste of Gratitude.'
      },
      { status: 201 }
    );

    // Set HTTP-only cookie for security
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    
    // Handle specific errors
    if (error.message === 'Email already registered') {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    if (error.message.includes('duplicate')) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        error: 'Registration failed. Please try again.' 
      },
      { status: 500 }
    );
  }
}
