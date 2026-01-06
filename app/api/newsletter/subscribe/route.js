import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendNewsletterConfirmation } from '@/lib/resend-email';
import { logger } from '@/lib/logger';

export async function POST(request) {
  try {
    const { email, firstName } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Check if already subscribed
    const existingSubscriber = await db.collection('newsletter_subscribers').findOne({ email });

    if (existingSubscriber) {
      if (existingSubscriber.status === 'unsubscribed') {
        // Resubscribe
        await db.collection('newsletter_subscribers').updateOne(
          { email },
          {
            $set: {
              status: 'active',
              firstName: firstName || existingSubscriber.firstName,
              resubscribedAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );
      } else {
        return NextResponse.json(
          { error: 'You are already subscribed to our newsletter' },
          { status: 400 }
        );
      }
    } else {
      // New subscriber
      await db.collection('newsletter_subscribers').insertOne({
        email,
        firstName: firstName || '',
        status: 'active',
        source: 'website',
        subscribedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Send newsletter confirmation email (uses community@ sender via email-config)
    const emailResult = await sendNewsletterConfirmation(email, firstName);

    if (!emailResult.success) {
      logger.error('Newsletter', 'Newsletter welcome email failed', {
        to: email,
        error: emailResult.error,
      });
      // Still return success for subscription, but log the email failure
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      emailSent: emailResult.success,
    });
  } catch (error) {
    logger.error('Newsletter', 'Newsletter subscription error', { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    );
  }
}
