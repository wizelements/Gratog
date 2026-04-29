export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/db/users';
import { sendEmail } from '@/lib/resend-email';
import { createLogger } from '@/lib/logger';
import { RateLimit } from '@/lib/redis';
import { SITE_URL } from '@/lib/site-config';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/db-optimized';

const logger = createLogger('USER_FORGOT_PWD');

export async function POST(request) {
  logger.info('User forgot password request started');

  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!RateLimit.check(`user_forgot_pwd_ip:${clientIp}`, 5, 15 * 60)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!RateLimit.check(`user_forgot_pwd_email:${normalizedEmail}`, 3, 15 * 60)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      logger.warn('User not found, returning success to prevent enumeration', { attemptedEmail: normalizedEmail });
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.'
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const { db } = await connectToDatabase();
    await db.collection('users').updateOne(
      { email: normalizedEmail },
      {
        $set: {
          resetToken: hashedToken,
          resetTokenExpiry: Date.now() + 3600000
        }
      }
    );

    const resetUrl = `${SITE_URL}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f0fdf4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #059669;">
          <tr>
            <td style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">🌿 Password Reset Request</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi${user.name ? ` ${user.name}` : ''},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                We received a request to reset the password for your Taste of Gratitude account.
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Click the button below to set a new password:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; letter-spacing: 0.5px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0; text-align: center;">
                This link expires in <strong style="color: #059669;">1 hour</strong>.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">
                If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Taste of Gratitude | Premium Wildcrafted Sea Moss
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    const textContent = [
      'Password Reset Request',
      '',
      `Hi${user.name ? ` ${user.name}` : ''},`,
      '',
      'We received a request to reset the password for your Taste of Gratitude account.',
      '',
      'Click the link below to set a new password:',
      resetUrl,
      '',
      'This link expires in 1 hour.',
      '',
      "If you didn't request this, you can safely ignore this email. Your password will remain unchanged."
    ].join('\n');

    const emailResult = await sendEmail({
      to: normalizedEmail,
      emailType: 'password_reset',
      subject: 'Password Reset - Taste of Gratitude',
      html: htmlContent,
      text: textContent
    });

    if (!emailResult.success) {
      logger.error('Failed to send reset email', { email: normalizedEmail, error: emailResult.error, provider: emailResult.provider });
      return NextResponse.json(
        { error: 'Unable to send reset email. Please try again.' },
        { status: 500 }
      );
    }

    logger.info('User password reset email sent', { email: normalizedEmail, messageId: emailResult.messageId });

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.'
    });
  } catch (error) {
    logger.error('User forgot password failed', { error: error.message });
    return NextResponse.json(
      { error: 'Unable to process request. Please try again.' },
      { status: 500 }
    );
  }
}
