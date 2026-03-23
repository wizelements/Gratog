import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { syncSquareCatalog } from '@/lib/square/catalogSync';
import { syncToUnified } from '@/lib/square/syncToUnified';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const logger = createLogger('SquareCatalogCron');
const MAX_SYNC_AGE_MS = 30 * 60 * 1000;

function isAuthorizedCronRequest(request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('Authorization');
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';

  if (isVercelCron) {
    return true;
  }

  // ISS-007 FIX: Fail closed — reject all requests when CRON_SECRET is not configured
  if (!cronSecret) {
    logger.error('CRON_SECRET not configured — rejecting request');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

async function runCatalogSyncCron(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const { db } = await connectToDatabase();

    const [syncMeta, pendingQueueCount] = await Promise.all([
      db.collection('square_sync_metadata').findOne({ type: 'catalog_sync' }),
      db.collection('square_sync_queue').countDocuments({ status: 'pending' })
    ]);

    const lastSyncAt = syncMeta?.lastSyncAt ? new Date(syncMeta.lastSyncAt) : null;
    const syncAgeMs = lastSyncAt ? Date.now() - lastSyncAt.getTime() : null;
    const syncIsStale = !lastSyncAt || (syncAgeMs !== null && syncAgeMs >= MAX_SYNC_AGE_MS);
    const shouldSync = pendingQueueCount > 0 || syncIsStale;

    if (!shouldSync) {
      return NextResponse.json({
        success: true,
        synced: false,
        reason: 'catalog_up_to_date',
        pendingQueueCount,
        lastSyncAt: lastSyncAt?.toISOString() || null,
        durationMs: Date.now() - startedAt,
      });
    }

    const trigger = pendingQueueCount > 0 ? 'pending_catalog_webhook_events' : 'stale_catalog_sync';
    logger.info('Square catalog cron sync started', {
      trigger,
      pendingQueueCount,
      lastSyncAt: lastSyncAt?.toISOString() || null,
      syncAgeMs,
    });

    const catalogResult = await syncSquareCatalog(db);
    const unifiedResult = await syncToUnified(true);

    if (pendingQueueCount > 0) {
      await db.collection('square_sync_queue').updateMany(
        { status: 'pending' },
        {
          $set: {
            status: 'processed',
            processedAt: new Date(),
            processor: 'cron_square_catalog_sync'
          }
        }
      );
    }

    const [finalUnifiedCount, finalCatalogCount] = await Promise.all([
      db.collection('unified_products').countDocuments(),
      db.collection('square_catalog_items').countDocuments()
    ]);

    return NextResponse.json({
      success: true,
      synced: true,
      trigger,
      pendingQueueCount,
      catalogSync: catalogResult,
      unifiedSync: unifiedResult,
      finalCounts: {
        unifiedProducts: finalUnifiedCount,
        squareCatalogItems: finalCatalogCount,
      },
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Square catalog cron sync failed', { error: message });

    return NextResponse.json(
      {
        success: false,
        error: 'Square catalog cron sync failed',
        message,
        durationMs: Date.now() - startedAt,
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return runCatalogSyncCron(request);
}

export async function POST(request) {
  return runCatalogSyncCron(request);
}
