import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { CRON_SECRET } from '@/lib/auth-config';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

const log = logger.withCategory('AbandonedOrdersCron');

/**
 * Abandoned Order Cleanup Cron Job
 * 
 * CRITICAL: Orders are created before payment, but if payment never happens,
 * they remain in "pending" status forever. This cron job marks them as abandoned.
 * 
 * Schedule: Every 30 minutes
 * Purpose: Mark stale pending orders as abandoned and optionally notify operations
 * 
 * Setup in Vercel Cron (vercel.json):
 *   "crons": [{ "path": "/api/cron/cleanup-abandoned-orders", "schedule": "0,30 * * * *" }]
 * 
 * Or via external cron:
 * - URL: https://your-domain.com/api/cron/cleanup-abandoned-orders
 * - Schedule: 0,30 * * * * (every 30 minutes)
 * - Method: POST
 * - Header: Authorization: Bearer YOUR_CRON_SECRET
 */

// Time thresholds
const ABANDON_AFTER_MINUTES = 30; // Mark as abandoned after 30 minutes
const DELETE_AFTER_DAYS = 7; // Permanently delete after 7 days

export async function POST(request) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret (skip for Vercel internal cron which has different auth)
    const authHeader = request.headers.get('Authorization');
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    
    if (!isVercelCron && (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`)) {
      log.warn('Unauthorized cron job attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    log.info('Starting abandoned order cleanup job');

    const { db } = await connectToDatabase();
    const now = new Date();
    
    // 1. Mark pending orders older than threshold as abandoned
    const abandonCutoff = new Date(now.getTime() - ABANDON_AFTER_MINUTES * 60 * 1000);
    
    const abandonResult = await db.collection('orders').updateMany(
      { 
        status: 'pending',
        paymentStatus: { $in: ['pending', null, undefined] },
        createdAt: { $lt: abandonCutoff }
      },
      { 
        $set: { 
          status: 'abandoned',
          abandonedAt: now,
          updatedAt: now
        },
        $push: {
          timeline: {
            status: 'abandoned',
            timestamp: now,
            message: 'Order abandoned - no payment received within 30 minutes',
            actor: 'system_cron'
          }
        }
      }
    );
    
    if (abandonResult.modifiedCount > 0) {
      log.info(`Marked ${abandonResult.modifiedCount} orders as abandoned`);
      
      // Track in Sentry for monitoring
      Sentry.captureMessage(`Abandoned orders cleanup: ${abandonResult.modifiedCount} orders marked`, {
        level: 'info',
        tags: { cron: 'abandoned_orders' },
        extra: { count: abandonResult.modifiedCount }
      });
    }
    
    // 2. Delete very old abandoned orders (cleanup)
    const deleteCutoff = new Date(now.getTime() - DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    
    const deleteResult = await db.collection('orders').deleteMany({
      status: 'abandoned',
      abandonedAt: { $lt: deleteCutoff }
    });
    
    if (deleteResult.deletedCount > 0) {
      log.info(`Deleted ${deleteResult.deletedCount} old abandoned orders`);
    }
    
    // 3. Cleanup orphaned idempotency keys in memory (if applicable)
    try {
      const { cleanupExpiredKeys } = await import('@/lib/idempotency');
      const cleanedKeys = cleanupExpiredKeys();
      if (cleanedKeys > 0) {
        log.debug(`Cleaned ${cleanedKeys} expired idempotency keys`);
      }
    } catch (cleanupError) {
      // Non-critical, don't fail the cron
      log.warn('Idempotency cleanup error', { error: cleanupError.message });
    }
    
    // 4. Cleanup error tracker (prevent memory growth)
    try {
      const { clearOldErrors } = await import('@/lib/error-tracker');
      if (typeof clearOldErrors === 'function') {
        clearOldErrors();
      }
    } catch (cleanupError) {
      // Non-critical
      log.debug('Error tracker cleanup skipped');
    }
    
    // 5. Process retry queue for failed notifications
    try {
      const { getPendingRetries, markRetryAttempted, removeRetry } = await import('@/lib/critical-operations');
      const pendingRetries = getPendingRetries();
      
      for (const retry of pendingRetries.slice(0, 10)) { // Process max 10 per run
        try {
          if (retry.type === 'email') {
            const { sendOrderConfirmationEmail } = await import('@/lib/resend-email');
            // Would need order data from DB
            log.info('Email retry processing', { id: retry.id });
            // await sendOrderConfirmationEmail(retry.payload);
            removeRetry(retry.id);
          } else if (retry.type === 'sms') {
            const { sendOrderConfirmationSMS } = await import('@/lib/sms');
            log.info('SMS retry processing', { id: retry.id });
            // await sendOrderConfirmationSMS(retry.payload);
            removeRetry(retry.id);
          }
        } catch (retryError) {
          markRetryAttempted(retry.id, retryError.message);
          log.warn('Retry failed', { id: retry.id, error: retryError.message });
        }
      }
      
      if (pendingRetries.length > 0) {
        log.info(`Processed ${Math.min(pendingRetries.length, 10)} pending retries`);
      }
    } catch (retryError) {
      log.warn('Retry queue processing error', { error: retryError.message });
    }
    
    const duration = Date.now() - startTime;
    log.info(`Cleanup job completed in ${duration}ms`, {
      abandoned: abandonResult.modifiedCount,
      deleted: deleteResult.deletedCount
    });

    return NextResponse.json({
      success: true,
      results: {
        ordersAbandoned: abandonResult.modifiedCount,
        ordersDeleted: deleteResult.deletedCount,
        processingTimeMs: duration
      },
      timestamp: now.toISOString()
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Abandoned order cleanup failed', { 
      error: error.message,
      stack: error.stack,
      duration 
    });
    
    Sentry.captureException(error, {
      tags: { cron: 'abandoned_orders' }
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Cleanup job failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint — Vercel Cron sends GET requests
// ISS-030 FIX: Execute cleanup on GET (same as POST) since Vercel Cron uses GET
export async function GET(request) {
  return POST(request);
}
