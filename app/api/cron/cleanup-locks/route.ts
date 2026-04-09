import { logger } from '@/lib/logger';
import { cleanupExpiredLocks } from '@/lib/inventory-lock';
import { connectToDatabase } from '@/lib/db-optimized';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/cron/cleanup-locks
 * 
 * Cron job to clean up expired inventory locks
 * Should be scheduled to run every 5 minutes
 * 
 * Environment variable:
 * - CRON_SECRET: Secret key to authorize cron requests
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    const result = await cleanupExpiredLocks();
    const duration = Date.now() - startTime;

    // Log cleanup metrics
    logger.info('Cron', 'Cleanup locks completed', {
      cleaned: result.cleaned,
      productsAffected: result.productsAffected.length,
      duration: `${duration}ms`
    });

    // Get additional stats
    const { db } = await connectToDatabase();
    const activeLocksCount = await db.collection('inventory_locks').countDocuments({
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    return NextResponse.json({
      success: true,
      cleaned: result.cleaned,
      productsAffected: result.productsAffected,
      activeLocksRemaining: activeLocksCount,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Cron', 'Error in cleanup-locks', { error });
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/cleanup-locks
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'active',
    message: 'Cleanup locks cron job endpoint',
    schedule: 'Every 5 minutes',
    timestamp: new Date().toISOString()
  });
}
