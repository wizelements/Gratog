import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

/**
 * POST /api/nurture/subscribe
 * Subscribe a user to the welcome email sequence
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, source, metadata } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Check if already subscribed
    const existing = await db.collection('email_subscribers').findOne({
      email: email.toLowerCase().trim()
    });
    
    if (existing?.subscribedToSequence) {
      return NextResponse.json({
        success: true,
        alreadySubscribed: true,
        message: 'Already subscribed to sequence'
      });
    }

    // Create subscription record with sequence
    const WELCOME_SEQUENCE = [
      { day: 0, subject: 'Welcome to Taste of Gratitude! 🌊', template: 'welcome', delayHours: 0 },
      { day: 1, subject: 'The Science Behind Sea Moss', template: 'education_1', delayHours: 24 },
      { day: 3, subject: 'Recipe: Golden Glow Smoothie 🥤', template: 'recipe', delayHours: 72 },
      { day: 7, subject: 'Customer Success Stories', template: 'social_proof', delayHours: 168 },
      { day: 14, subject: 'Save 20% + Free Shipping', template: 'subscription_offer', delayHours: 336 }
    ];
    
    const now = new Date();
    const scheduledEmails = WELCOME_SEQUENCE.map((config) => ({
      email: email.toLowerCase().trim(),
      subject: config.subject,
      template: config.template,
      day: config.day,
      scheduledFor: new Date(now.getTime() + (config.delayHours * 60 * 60 * 1000)),
      sent: false,
      createdAt: now
    }));

    // Insert scheduled emails
    await db.collection('scheduled_emails').insertMany(scheduledEmails);
    
    // Update subscriber record
    await db.collection('email_subscribers').updateOne(
      { email: email.toLowerCase().trim() },
      { 
        $set: {
          email: email.toLowerCase().trim(),
          source: source || 'website',
          metadata: metadata || {},
          subscribedToSequence: true,
          sequenceStartDate: now,
          status: 'active',
          updatedAt: now
        },
        $setOnInsert: {
          subscribedAt: now
        }
      },
      { upsert: true }
    );

    // Send welcome email immediately
    await sendEmail({
      to: email,
      subject: 'Welcome to Taste of Gratitude! 🌊 Your wellness journey begins',
      html: generateWelcomeEmail(metadata)
    });
    
    // Mark welcome email as sent
    await db.collection('scheduled_emails').updateOne(
      { email: email.toLowerCase().trim(), template: 'welcome' },
      { $set: { sent: true, sentAt: now } }
    );

    logger.info('NurtureSequence', 'User subscribed to sequence', { email, source });
    
    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to welcome sequence',
      sequenceLength: WELCOME_SEQUENCE.length
    });

  } catch (error) {
    logger.error('NurtureSequenceAPI', 'Subscription failed', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to subscribe to sequence' },
      { status: 500 }
    );
  }
}

function generateWelcomeEmail(metadata = {}) {
  const firstName = metadata?.name?.split(' ')[0] || 'Friend';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Taste of Gratitude</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">
                    Welcome to the Gratog Family! 🌊
                  </h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">
                    ${firstName}, your journey to vibrant wellness starts now
                  </p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="font-size: 18px; color: #1f2937; line-height: 1.6; margin: 0 0 20px 0;">
                    Hi ${firstName},<br><br>
                    I'm so excited you've joined our community of wellness seekers! Over the next two weeks, I'll be sharing everything you need to know about sea moss and how it can transform your health.
                  </p>

                  <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 20px; margin: 30px 0; border-radius: 8px;">
                    <h3 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">📚 What to Expect:</h3>
                    <ul style="color: #374151; line-height: 2; margin: 0; padding-left: 20px;">
                      <li><strong>Day 1:</strong> The science behind sea moss (it's fascinating!)</li>
                      <li><strong>Day 3:</strong> A delicious recipe to try</li>
                      <li><strong>Day 7:</strong> Real customer transformation stories</li>
                      <li><strong>Day 14:</strong> An exclusive offer just for you</li>
                    </ul>
                  </div>

                  <div style="text-align: center; margin: 40px 0;">
                    <a href="https://tasteofgratitude.shop/catalog" 
                       style="display: inline-block; background: #059669; color: #ffffff; padding: 16px 40px; 
                              text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Explore Our Products
                    </a>
                  </div>

                  <div style="background: #fefce8; padding: 20px; border-radius: 8px; margin: 30px 0;">
                    <p style="color: #854d0e; margin: 0; font-size: 14px; line-height: 1.6;">
                      💡 <strong>Quick Tip:</strong> If you're new to sea moss, start with 1 tablespoon daily and gradually increase. Your body will thank you!
                    </p>
                  </div>

                  <p style="color: #6b7280; font-size: 14px; margin-top: 30px; line-height: 1.6;">
                    Questions? Just reply to this email - I read every single one.<br><br>
                    With gratitude,<br>
                    <strong style="color: #059669;">The Taste of Gratitude Team</strong>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">
                    Taste of Gratitude | Premium Wildcrafted Sea Moss<br>
                    <a href="https://tasteofgratitude.shop" style="color: #059669; text-decoration: none;">tasteofgratitude.shop</a>
                  </p>
                  <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                    <a href="https://tasteofgratitude.shop/api/unsubscribe?email={{email}}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a> | 
                    <a href="https://tasteofgratitude.shop/account" style="color: #6b7280; text-decoration: underline;">Manage Preferences</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
