import { NextResponse } from 'next/server';
import { sendEmail, isRealEmail } from '@/lib/resend-email';

export async function POST(request) {
  try {
    const { to, subject, message } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      );
    }

    const testSubject = subject || 'Test Email from Taste of Gratitude';
    const testMessage = message || 'This is a test email to verify email configuration.';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Email</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 40px; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
    <h1 style="color: #D4AF37; margin-bottom: 20px;">Test Email</h1>
    <p style="color: #495057; line-height: 1.6;">${testMessage}</p>
    <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 4px;">
      <p style="margin: 0; color: #6c757d; font-size: 14px;"><strong>Email Provider:</strong> ${isRealEmail() ? 'Resend (Live)' : 'Mock Mode'}</p>
      <p style="margin: 5px 0 0; color: #6c757d; font-size: 14px;"><strong>Sent:</strong> ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `;

    const result = await sendEmail({
      to,
      subject: testSubject,
      html,
      text: testMessage
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId,
        provider: result.provider,
        isLive: isRealEmail()
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Test email error:', error.message, { stack: error.stack });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    emailConfigured: isRealEmail(),
    provider: isRealEmail() ? 'Resend' : 'Mock',
    fromEmail: process.env.RESEND_FROM_EMAIL || 'hello@tasteofgratitude.com',
    hasApiKey: !!process.env.RESEND_API_KEY
  });
}
