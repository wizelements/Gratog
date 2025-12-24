/**
 * Automated Health Check Cron Job
 * 
 * Called every minute to proactively detect issues.
 * Triggers error capture if anything is wrong.
 * 
 * Setup: Add to your cron service (e.g., Vercel Cron):
 * - URL: https://your-domain.com/api/cron/health-check
 * - Frequency: Every 1 minute
 * - Header: Authorization: Bearer YOUR_CRON_SECRET
 */

import { NextResponse } from 'next/server';
import { monitorHealth } from '@/lib/health-monitor';
import { createLogger } from '@/lib/logger';

const logger = createLogger('HealthCheckCron');

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${CRON_SECRET}`;

  // Verify cron secret
  if (!CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.warn('Running health check cron job');

    // Run health monitoring (will auto-report issues)
    await monitorHealth();

    return NextResponse.json(
      { success: true, message: 'Health check complete' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Health check cron job failed', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
