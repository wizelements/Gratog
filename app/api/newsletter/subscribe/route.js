import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendNewsletterWelcome } from '@/lib/resend';

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

    // Send welcome email
    await sendNewsletterWelcome(email, firstName);

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to newsletter',
    });
  } catch (error) {
    console.error('Newsletter subscription error:', { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    );
  }
}
