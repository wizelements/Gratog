import { NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/db/users';
import { comparePassword, generateToken } from '@/lib/auth/jwt';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await findUserByEmail(email.toLowerCase());
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user;

    // Create response with token in cookie
    const response = NextResponse.json(
      {
        success: true,
        user: userWithoutPassword,
        token
      },
      { status: 200 }
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
    console.error('Login error:', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
