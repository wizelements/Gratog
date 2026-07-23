export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { processOwnerAlertQueue, getOwnerAlertQueueStats } from '@/lib/owner-alerts';
import { connectToDatabase } from '@/lib/db-optimized';

/**
 * GET /api/cron/owner-alerts
 *
 * Vercel cron worker for the durable owner-alert queue.
 * Processes up to 10 pending alerts per invocation. Each alert is delivered
 * via Telegram first, then Resend fallback, and recorded in the queue.
 *
 * Auth: CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const processed = await processOwnerAlertQueue(10);
    const stats = await getOwnerAlertQueueStats();

    return NextResponse.json({
      success: true,
      processed: processed.length,
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Owner alert cron error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
