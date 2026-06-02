import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { validatePassword } from '@/lib/auth/validation';
import { hashPassword } from '@/lib/auth/jwt';
import { connectToDatabase } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword } = body;

    if (!token || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Token, password, and confirmation are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Hash the token and find reset record
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { db } = await connectToDatabase();
    const resetDoc = await db.collection('password_resets').findOne({
      tokenHash,
      consumed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetDoc) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Hash new password and update user
    const newHash = await hashPassword(password);
    await db.collection('users').updateOne(
      { id: resetDoc.userId },
      { $set: { passwordHash: newHash, updatedAt: new Date() } }
    );

    // Mark token as consumed
    await db.collection('password_resets').updateOne(
      { _id: resetDoc._id },
      { $set: { consumed: true, consumedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Password reset failed. Please try again.' },
      { status: 500 }
    );
  }
}
