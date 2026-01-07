import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { verifyUnsubscribeToken } from '@/lib/email/service';
import { logger } from '@/lib/logger';

/**
 * POST /api/unsubscribe - Process unsubscribe request
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing unsubscribe token' },
        { status: 400 }
      );
    }

    // Verify and decode token
    const tokenData = verifyUnsubscribeToken(token);
    
    if (!tokenData) {
      logger.warn('Unsubscribe', 'Invalid or expired token attempted');
      return NextResponse.json(
        { success: false, error: 'Invalid or expired unsubscribe link. Please use a link from a recent email.' },
        { status: 400 }
      );
    }

    const { userId, email } = tokenData;

    const { db } = await connectToDatabase();

    // Update user's email preferences
    const result = await db.collection('users').updateOne(
      { $or: [{ id: userId }, { email: email.toLowerCase() }] },
      {
        $set: {
          'emailPreferences.marketing': false,
          'emailPreferences.unsubscribedAt': new Date(),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      // User not found - might be guest, create unsubscribe record
      await db.collection('unsubscribes').insertOne({
        email: email.toLowerCase(),
        userId: userId || null,
        unsubscribedAt: new Date(),
        source: 'email_link'
      });
      
      logger.info('Unsubscribe', `Guest email unsubscribed: ${email}`);
    } else {
      logger.info('Unsubscribe', `User unsubscribed: ${email} (userId: ${userId})`);
    }

    // Cancel any pending emails for this user
    await db.collection('email_queue').updateMany(
      { 'recipient.email': email.toLowerCase(), status: 'pending' },
      { $set: { status: 'cancelled', cancelReason: 'user_unsubscribed', updatedAt: new Date() } }
    );
    
    await db.collection('scheduled_emails').updateMany(
      { 'recipient.email': email.toLowerCase(), status: 'pending' },
      { $set: { status: 'cancelled', cancelReason: 'user_unsubscribed', updatedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      message: 'You have been successfully unsubscribed from marketing emails.'
    });

  } catch (error) {
    logger.error('Unsubscribe', 'Error processing unsubscribe:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}
