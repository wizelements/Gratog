import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { sendEmail } from '@/lib/email/service';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/campaigns/test - Send test email to admin
 */
export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    
    const body = await request.json();
    const { subject, preheader, body: emailBody } = body;

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: 'Subject and body are required' },
        { status: 400 }
      );
    }

    // Build test email HTML with campaign wrapper
    const testHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #059669 0%, #14b8a6 100%); padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; }
    .content { padding: 40px 20px; }
    .footer { background-color: #f3f4f6; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { color: #6b7280; font-size: 14px; margin: 0 0 10px 0; }
    .test-banner { background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; text-align: center; margin-bottom: 20px; }
    .test-banner p { color: #92400e; margin: 0; font-weight: bold; }
  </style>
</head>
<body style="background-color: #f9fafb;">
  <div class="container">
    <div class="test-banner">
      <p>⚠️ TEST EMAIL - This is how your campaign will appear</p>
    </div>
    <div class="header">
      <h1>Taste of Gratitude</h1>
      ${preheader ? `<p style="color: #e5e7eb; margin: 10px 0 0 0; font-size: 14px;">${preheader}</p>` : ''}
    </div>
    
    <div class="content">
      ${emailBody}
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Taste of Gratitude. All rights reserved.</p>
      <p><a href="#" style="color: #9ca3af; font-size: 12px;">Unsubscribe from marketing emails</a></p>
    </div>
  </div>
</body>
</html>
`;

    // Send to admin's email
    const result = await sendEmail({
      to: admin.email,
      subject: `[TEST] ${subject}`,
      html: testHtml,
      emailType: 'transactional' // Bypass marketing prefs for test
    });

    if (result.success) {
      logger.info('API', `Test campaign email sent to ${admin.email}`);
      return NextResponse.json({
        success: true,
        sentTo: admin.email,
        messageId: result.resendId
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.warning || 'Email not configured'
      });
    }

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Test email error:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
