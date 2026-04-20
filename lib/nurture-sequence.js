import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

// Welcome email series configuration
const WELCOME_SEQUENCE = [
  {
    day: 0,
    subject: 'Welcome to Taste of Gratitude! 🌊 Your wellness journey begins',
    template: 'welcome',
    delayHours: 0
  },
  {
    day: 1,
    subject: 'The Science Behind Sea Moss (Why It Works)',
    template: 'education_1',
    delayHours: 24
  },
  {
    day: 3,
    subject: 'Recipe: Golden Glow Smoothie 🥤',
    template: 'recipe',
    delayHours: 72
  },
  {
    day: 7,
    subject: 'How Are You Feeling? + Customer Stories',
    template: 'social_proof',
    delayHours: 168
  },
  {
    day: 14,
    subject: 'Ready to Subscribe? Save 20% + Free Shipping',
    template: 'subscription_offer',
    delayHours: 336
  }
];

/**
 * Subscribe a user to the welcome sequence
 */
export async function subscribeToSequence(email, source = 'quiz', metadata = {}) {
  try {
    const { db } = await connectToDatabase();
    
    // Check if already subscribed
    const existing = await db.collection('email_subscribers').findOne({
      email: email.toLowerCase().trim()
    });
    
    if (existing?.subscribedToSequence) {
      logger.info('NurtureSequence', 'User already subscribed to sequence', { email });
      return { success: true, alreadySubscribed: true };
    }
    
    // Create subscription record
    const subscription = {
      email: email.toLowerCase().trim(),
      source,
      metadata,
      subscribedAt: new Date(),
      subscribedToSequence: true,
      sequenceStartDate: new Date(),
      emailsSent: [],
      status: 'active'
    };
    
    await db.collection('email_subscribers').updateOne(
      { email: email.toLowerCase().trim() },
      { $set: subscription },
      { upsert: true }
    );
    
    // Schedule welcome sequence
    await scheduleWelcomeSequence(email);
    
    logger.info('NurtureSequence', 'User subscribed to sequence', { email, source });
    return { success: true };
    
  } catch (error) {
    logger.error('NurtureSequence', 'Failed to subscribe user', { email, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Schedule the welcome sequence emails
 */
async function scheduleWelcomeSequence(email) {
  const { db } = await connectToDatabase();
  const now = new Date();
  
  const scheduledEmails = WELCOME_SEQUENCE.map((emailConfig) => {
    const scheduledFor = new Date(now.getTime() + (emailConfig.delayHours * 60 * 60 * 1000));
    return {
      email: email.toLowerCase().trim(),
      subject: emailConfig.subject,
      template: emailConfig.template,
      day: emailConfig.day,
      scheduledFor,
      sent: false,
      createdAt: now
    };
  });
  
  await db.collection('scheduled_emails').insertMany(scheduledEmails);
}

/**
 * Send immediate welcome email
 */
async function sendWelcomeEmail(email, metadata = {}) {
  const html = generateWelcomeEmail(metadata);
  
  try {
    await sendEmail({
      to: email,
      subject: 'Welcome to Taste of Gratitude! 🌊 Your wellness journey begins',
      html
    });
    
    // Mark as sent
    const { db } = await connectToDatabase();
    await db.collection('email_subscribers').updateOne(
      { email: email.toLowerCase().trim() },
      { 
        $push: { 
          emailsSent: {
            template: 'welcome',
            sentAt: new Date(),
            subject: 'Welcome to Taste of Gratitude!'
          }
        }
      }
    );
    
    return { success: true };
  } catch (error) {
    logger.error('NurtureSequence', 'Failed to send welcome email', { email, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * API Route: Subscribe to sequence
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
    
    const result = await subscribeToSequence(email, source, metadata);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.alreadySubscribed 
          ? 'Already subscribed to sequence' 
          : 'Successfully subscribed to welcome sequence'
      });
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    logger.error('NurtureSequenceAPI', 'Subscription failed', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to subscribe to sequence' },
      { status: 500 }
    );
  }
}

/**
 * Email Templates
 */
function generateWelcomeEmail(metadata = {}) {
  const firstName = metadata.name?.split(' ')[0] || 'Friend';
  
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">
          Welcome to the Gratog Family, ${firstName}! 🌊
        </h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
          Your journey to vibrant wellness starts now
        </p>
      </div>

      <!-- Body -->
      <div style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #1f2937; line-height: 1.6; margin-bottom: 20px;">
          Hi ${firstName},<br><br>
          I'm so excited you've joined our community of wellness seekers! Over the next two weeks, I'll be sharing everything you need to know about sea moss and how it can transform your health.
        </p>

        <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 20px; margin: 30px 0; border-radius: 8px;">
          <h3 style="color: #059669; margin: 0 0 10px 0;">📚 What to Expect:</h3>
          <ul style="color: #374151; line-height: 2; margin: 0; padding-left: 20px;">
            <li>Day 1: The science behind sea moss (it's fascinating!)</li>
            <li>Day 3: A delicious recipe to try</li>
            <li>Day 7: Real customer transformation stories</li>
            <li>Day 14: An exclusive offer just for you</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://tasteofgratitude.shop/catalog" 
             style="display: inline-block; background: #059669; color: white; padding: 16px 40px; 
                    text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Explore Our Products
          </a>
        </div>

        <div style="background: #fefce8; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <p style="color: #854d0e; margin: 0; font-size: 14px;">
            💡 <strong>Quick Tip:</strong> If you're new to sea moss, start with 1 tablespoon daily and gradually increase. Your body will thank you!
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Questions? Just reply to this email - I read every single one.<br><br>
          With gratitude,<br>
          <strong>The Taste of Gratitude Team</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">
          Taste of Gratitude | Premium Wildcrafted Sea Moss<br>
          <a href="https://tasteofgratitude.shop" style="color: #059669;">tasteofgratitude.shop</a>
        </p>
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
          <a href="https://tasteofgratitude.shop/unsubscribe" style="color: #6b7280;">Unsubscribe</a> | 
          <a href="https://tasteofgratitude.shop/account" style="color: #6b7280;">Manage Preferences</a>
        </p>
      </div>
    </div>
  `;
}

// Additional email templates can be added here...
export const emailTemplates = {
  education_1: (data) => `...`,
  recipe: (data) => `...`,
  social_proof: (data) => `...`,
  subscription_offer: (data) => `...`
};
