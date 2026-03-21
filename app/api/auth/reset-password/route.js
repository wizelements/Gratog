import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/jwt';
import { createLogger } from '@/lib/logger';
import { RateLimit } from '@/lib/redis';
import { connectToDatabase } from '@/lib/db-optimized';
import crypto from 'crypto';

const logger = createLogger('USER_RESET_PWD');

export async function POST(request) {
  logger.info('User password reset attempt started');

  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!RateLimit.check(`user_reset_pwd:${clientIp}`, 5, 15 * 60)) {
      return NextResponse.json({ error: 'Too many reset attempts' }, { status: 429 });
    }

    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: 'Token, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({
      email: email.toLowerCase().trim(),
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      logger.warn('Invalid or expired reset token', { attemptedEmail: email.toLowerCase() });
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: { passwordHash, updatedAt: new Date() },
        $unset: { resetToken: '', resetTokenExpiry: '' }
      }
    );

    logger.info('User password reset successful', { email: user.email });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.'
    });
  } catch (error) {
    logger.error('User password reset failed', { error: error.message });
    return NextResponse.json(
      { error: 'Unable to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
