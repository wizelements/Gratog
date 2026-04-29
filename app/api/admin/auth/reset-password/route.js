export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminUsers } from '@/lib/db-admin';
import { hashPassword } from '@/lib/auth';
import { createLogger } from '@/lib/logger';
import { RateLimit } from '@/lib/redis';
import crypto from 'crypto';

const logger = createLogger('ADMIN_RESET_PWD');

export async function POST(request) {
  logger.info('Password reset attempt started');

  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!RateLimit.check(`admin_reset_pwd:${clientIp}`, 5, 15 * 60)) {
      return NextResponse.json({ error: 'Too many reset attempts' }, { status: 429 });
    }

    const { token, email, password } = await request.json();

    logger.debug('Reset request received', {
      hasToken: !!token,
      hasEmail: !!email,
      hasPassword: !!password,
      passwordLength: password?.length
    });

    if (!token || !email || !password) {
      logger.warn('Missing required fields', { token: !!token, email: !!email, password: !!password });
      return NextResponse.json(
        { error: 'Token, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      logger.warn('Password too short', { passwordLength: password.length });
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    logger.info('Fetching admin users collection');
    const adminUsers = await getAdminUsers();

    logger.info('Searching for user with valid reset token', {
      searchEmail: email.toLowerCase()
    });
    const user = await adminUsers.findOne({
      email: email.toLowerCase(),
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() }
    });

    logger.debug('User lookup result', {
      found: !!user,
      userEmail: user?.email
    });

    if (!user) {
      logger.warn('Invalid or expired reset token', {
        attemptedEmail: email.toLowerCase()
      });
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset.' },
        { status: 400 }
      );
    }

    logger.info('Hashing new password');
    const passwordHash = await hashPassword(password);

    await adminUsers.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash },
        $unset: { resetToken: '', resetTokenExpiry: '' }
      }
    );

    logger.info('Password reset successful', {
      userEmail: user.email,
      userId: user._id.toString()
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.'
    });
  } catch (error) {
    logger.error('Password reset failed with exception', {
      error: error.message,
      errorType: error.constructor.name
    });

    return NextResponse.json(
      {
        error: 'Unable to reset password. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        hint: process.env.NODE_ENV === 'development' ?
          'Check server logs for detailed error information' : undefined
      },
      { status: 500 }
    );
  }
}
