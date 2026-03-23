import { NextResponse } from 'next/server';
import { createUser, initializeUserRewards, initializeUserChallenge } from '@/lib/db/users';
import { hashPassword, generateToken } from '@/lib/auth/jwt';
import { sendWelcomeEmail } from '@/lib/email/service';
import { validateRegistration } from '@/lib/auth/validation';
import { connectToDatabase } from '@/lib/db-optimized';

async function reconcilePendingCustomerAfterSignup(user) {
  const email = String(user?.email || '').trim().toLowerCase();
  if (!email || !user?.id) {
    return;
  }

  try {
    const { db } = await connectToDatabase();
    await db.collection('pending_customers').updateOne(
      { email },
      {
        $set: {
          status: 'converted',
          convertedAt: new Date(),
          convertedUserId: user.id,
          convertedName: user.name || null,
          convertedSource: 'auth_register',
          updatedAt: new Date(),
        },
      }
    );
  } catch (reconciliationError) {
    // Registration should not fail if lead reconciliation is unavailable.
    console.warn('Pending customer reconciliation failed:', reconciliationError);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, confirmPassword, phone } = body;

    // Validate confirmPassword is present
    if (!confirmPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          errors: { confirmPassword: 'Confirm password is required' }
        },
        { status: 400 }
      );
    }

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

    await reconcilePendingCustomerAfterSignup(user);

    // Initialize user features in parallel
    try {
      const initResults = await Promise.allSettled([
        initializeUserRewards(user.id),
        initializeUserChallenge(user.id)
      ]);

      // Check for failures and log them
      let allSucceeded = true;
      initResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to initialize user feature ${index}:`, result.reason);
          allSucceeded = false;
        }
      });

      // If any initialization failed, still continue but log it
      // User account is created but may need data sync
      if (!allSucceeded) {
        console.warn(`User ${user.id} created but some features failed to initialize`);
      }
    } catch (initError) {
      console.error('User feature initialization error:', initError);
      // User account created; initialization will be retried on next login
    }

    // Send welcome email (non-blocking, don't fail registration if it fails)
    sendWelcomeEmail(user).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    // Generate JWT token
    const token = await generateToken(user.id, user.email);

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
