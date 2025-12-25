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
import { logger } from '@/lib/logger';
import { CRON_SECRET } from '@/lib/auth-config';

const log = logger.withCategory('HealthCheckCron');

async function handleHealthCheck(request) {
  const authHeader = request.headers.get('authorization');
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const expected = `Bearer ${CRON_SECRET}`;

  // Verify cron secret (skip for Vercel internal cron which has different auth)
  if (!isVercelCron && (!CRON_SECRET || authHeader !== expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    log.info('Running health check cron job');

    // Run health monitoring (will auto-report issues)
    await monitorHealth();

    return NextResponse.json(
      { success: true, message: 'Health check complete' },
      { status: 200 }
    );
  } catch (error) {
    log.error('Health check cron job failed', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return handleHealthCheck(request);
}

export async function POST(request) {
  return handleHealthCheck(request);
}

export const runtime = 'nodejs';
