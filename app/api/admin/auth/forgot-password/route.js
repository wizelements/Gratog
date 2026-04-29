export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminUsers } from '@/lib/db-admin';
import { sendEmail } from '@/lib/resend-email';
import { createLogger } from '@/lib/logger';
import { RateLimit } from '@/lib/redis';
import { SITE_URL } from '@/lib/site-config';
import crypto from 'crypto';

const logger = createLogger('ADMIN_FORGOT_PWD');

export async function POST(request) {
  logger.info('Forgot password request started');

  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!RateLimit.check(`admin_forgot_pwd_ip:${clientIp}`, 5, 15 * 60)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { email } = await request.json();

    if (!email) {
      logger.warn('Missing email in request');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    if (!RateLimit.check(`admin_forgot_pwd_email:${normalizedEmail}`, 3, 15 * 60)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    logger.info('Looking up admin user', { email: normalizedEmail });
    const adminUsers = await getAdminUsers();
    const user = await adminUsers.findOne({ email: normalizedEmail });

    if (!user) {
      logger.warn('User not found, returning success to prevent enumeration', {
        attemptedEmail: normalizedEmail
      });
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.'
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    logger.info('Storing reset token', { email: normalizedEmail });
    await adminUsers.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          resetToken: hashedToken,
          resetTokenExpiry: Date.now() + 3600000
        }
      }
    );

    const resetUrl = `${SITE_URL}/admin/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #1a1a2e; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #16213e; border-radius: 12px; overflow: hidden; border: 1px solid #D4AF37;">
          <tr>
            <td style="background: linear-gradient(135deg, #D4AF37, #059669); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Password Reset Request</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                We received a request to reset the password for your Taste of Gratitude admin account.
              </p>
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Click the button below to set a new password:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #b8962e); color: #1a1a2e; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; letter-spacing: 0.5px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 30px 0 0; text-align: center;">
                This link expires in <strong style="color: #D4AF37;">1 hour</strong>.
              </p>
              <hr style="border: none; border-top: 1px solid #2a2a4a; margin: 30px 0;">
              <p style="color: #888888; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">
                If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0f1a2e; padding: 20px; text-align: center;">
              <p style="color: #666666; font-size: 12px; margin: 0;">
                Taste of Gratitude Admin
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
      'We received a request to reset the password for your Taste of Gratitude admin account.',
      '',
      'Click the link below to set a new password:',
      resetUrl,
      '',
      'This link expires in 1 hour.',
      '',
      "If you didn't request this, you can safely ignore this email. Your password will remain unchanged."
    ].join('\n');

    logger.info('Sending password reset email', { email: normalizedEmail });
    await sendEmail({
      to: normalizedEmail,
      emailType: 'password_reset',
      subject: 'Password Reset - Taste of Gratitude Admin',
      html: htmlContent,
      text: textContent
    });

    logger.info('Password reset email sent successfully', { email: normalizedEmail });

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.'
    });
  } catch (error) {
    logger.error('Forgot password failed with exception', {
      error: error.message,
      errorType: error.constructor.name
    });

    return NextResponse.json(
      { error: 'Unable to process request. Please try again.' },
      { status: 500 }
    );
  }
}
