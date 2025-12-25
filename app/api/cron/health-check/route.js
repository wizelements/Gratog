import { NextResponse } from 'next/server';
import { monitorHealth } from '@/lib/health-monitor';
import { CRON_SECRET } from '@/lib/auth-config';
import { logger } from '@/lib/logger';

const log = logger.withCategory('HealthCheckCron');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function runHealthCheck(request) {
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
    await monitorHealth();

    return NextResponse.json({
      success: true,
      message: 'Health check complete',
      timestamp: new Date().toISOString()
    });
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
  return runHealthCheck(request);
}

export async function POST(request) {
  return runHealthCheck(request);
}
