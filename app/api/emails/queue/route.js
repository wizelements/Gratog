import { NextResponse } from 'next/server';
import { processEmailQueue } from '@/lib/email/service';

/**
 * Email Queue Processing API
 * Called by cron job to process pending emails
 */

export async function POST(request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await processEmailQueue();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing email queue:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return NextResponse.json({
    success: true,
    message: 'Email queue processor',
    endpoint: 'POST /api/emails/queue',
    note: 'Call this endpoint from cron job to process queued emails'
  });
}
