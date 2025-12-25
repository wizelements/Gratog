import { NextResponse } from 'next/server';
import { monitorHealth } from '@/lib/health-monitor';
import { CRON_SECRET } from '@/lib/auth-config';
import { logger } from '@/lib/logger';

const log = logger.withCategory('HealthCheckCron');

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

async function handleHealthCheck(request) {
  const authHeader = request.headers.get('Authorization');
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  
  if (!isVercelCron && (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`)) {
    log.warn('Unauthorized cron job attempt');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    log.info('Starting health check cron job');

    // Run health monitoring (will auto-report issues)
    await monitorHealth();

    return NextResponse.json(
      { success: true, message: 'Health check complete', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    log.error('Health check cron job failed', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
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
