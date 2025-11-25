import { NextResponse } from 'next/server';
import * as emailService from '@/lib/email/service';
import * as templates from '@/lib/email/templates-enhanced';

/**
 * Email Testing API
 * GET - List available email templates
 * POST - Send test emails
 */

export async function GET(request) {
  const availableTemplates = [
    {
      id: 'welcome',
      name: 'Welcome Email',
      description: 'Sent when user registers'
    },
    {
      id: 'order',
      name: 'Order Confirmation',
      description: 'Sent after order is placed'
    },
    {
      id: 'password',
      name: 'Password Reset',
      description: 'Sent when user requests password reset'
    },
    {
      id: 'reward',
      name: 'Reward Milestone',
      description: 'Sent when user reaches reward milestone'
    },
    {
      id: 'challenge',
      name: 'Challenge Streak',
      description: 'Sent when user reaches streak milestone'
    }
  ];

  return NextResponse.json({
    success: true,
    templates: availableTemplates,
    resendConfigured: !!process.env.RESEND_API_KEY,
    mode: process.env.RESEND_API_KEY ? 'production' : 'development'
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { templateId, recipientEmail, testData } = body;

    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'Recipient email is required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    let html, subject;
    const unsubscribeToken = 'test-token-' + Date.now();

    // Generate test email based on template
    switch (templateId) {
      case 'welcome':
        html = templates.welcomeEmail(
          {
            name: testData?.name || 'Test User',
            rewardPoints: testData?.rewardPoints || 0
          },
          unsubscribeToken
        );
        subject = '🌿 [TEST] Welcome to Taste of Gratitude!';
        break;

      case 'order':
        html = templates.orderConfirmationEmail(
          {
            name: testData?.name || 'Test User',
            orderNumber: testData?.orderNumber || 'TOG123456',
            items: testData?.items || [
              { name: 'Kissed by Gods Gel', quantity: 2, price: '22.00' },
              { name: 'Berry Zinger Lemonade', quantity: 1, price: '12.00' }
            ],
            total: testData?.total || '34.00',
            fulfillmentType: testData?.fulfillmentType || 'Pickup',
            pointsEarned: testData?.pointsEarned || 340
          },
          unsubscribeToken
        );
        subject = '📦 [TEST] Order Confirmed';
        break;

      case 'password':
        html = templates.passwordResetEmail(
          {
            name: testData?.name || 'Test User',
            resetToken: 'test-reset-token-123'
          },
          null
        );
        subject = '🔐 [TEST] Password Reset Request';
        break;

      case 'reward':
        html = templates.rewardMilestoneEmail(
          {
            name: testData?.name || 'Test User',
            milestone: testData?.milestone || '100 Points',
            points: testData?.points || 100,
            rewardName: testData?.rewardName || 'Free 2oz Shot'
          },
          unsubscribeToken
        );
        subject = '🎁 [TEST] Reward Milestone Unlocked!';
        break;

      case 'challenge':
        html = templates.challengeStreakEmail(
          {
            name: testData?.name || 'Test User',
            streakDays: testData?.streakDays || 7,
            milestone: testData?.milestone || '50 bonus points'
          },
          unsubscribeToken
        );
        subject = '🔥 [TEST] Streak Milestone Achieved!';
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid template ID' },
          { status: 400 }
        );
    }

    // Send test email
    const result = await emailService.sendEmailNow({
      to: recipientEmail,
      subject,
      html,
      emailType: 'test'
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent to ${recipientEmail}`,
        templateId,
        mode: result.mode || 'production',
        resendId: result.resendId
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in email test API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
