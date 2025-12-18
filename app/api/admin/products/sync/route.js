import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { connectToDatabase } from '@/lib/db-optimized';
import { syncSquareCatalog } from '@/lib/square/catalogSync';
import { syncToUnified } from '@/lib/square/syncToUnified';
import { logger } from '@/lib/logger';

// Force Node.js runtime (required for MongoDB)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/products/sync
 * Trigger full sync from Square catalog
 * Serverless-compatible version (no exec, no require of scripts/)
 */
export async function POST(request) {
  try {
    const admin = await requireAdmin(request);

    logger.info('ProductSync', `Starting admin-triggered Square catalog sync by ${admin.email}`);

    let catalogSyncResult = { items: 0, variations: 0, images: 0, errors: 0 };
    let unifiedSyncResult = { success: 0, failed: 0, total: 0 };

    // Get database connection
    const { db } = await connectToDatabase();

    // Step 1: Sync from Square to square_catalog_items
    try {
      logger.debug('ProductSync', 'Step 1: Syncing from Square Catalog API...');
      catalogSyncResult = await syncSquareCatalog(db);
      logger.info('ProductSync', `Square catalog sync complete: ${catalogSyncResult.items} items`);
    } catch (error) {
      logger.error('ProductSync', 'Square catalog sync failed:', error);
      throw new Error(`Square catalog sync failed: ${error.message}`);
    }

    // Step 2: Sync to unified_products with enrichment
    try {
      logger.debug('ProductSync', 'Step 2: Syncing to unified products...');
      unifiedSyncResult = await syncToUnified(true);
      logger.info('ProductSync', `Unified sync complete: ${unifiedSyncResult.success}/${unifiedSyncResult.total} products`);
    } catch (error) {
      logger.error('ProductSync', 'Unified sync failed:', error);
      logger.warn('ProductSync', 'Continuing despite unified sync error');
      unifiedSyncResult = { success: 0, failed: 0, total: 0, error: error.message };
    }

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      synced: catalogSyncResult.items,
      stats: {
        catalogItems: catalogSyncResult.items,
        catalogVariations: catalogSyncResult.variations,
        catalogImages: catalogSyncResult.images,
        catalogErrors: catalogSyncResult.errors,
        unifiedSuccess: unifiedSyncResult.success,
        unifiedFailed: unifiedSyncResult.failed,
        unifiedTotal: unifiedSyncResult.total
      }
    });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('ProductSync', 'Sync failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Sync failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        hint: 'Check Square API credentials and MongoDB connection'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/products/sync
 * Get sync status
 */
export async function GET(request) {
  try {
    const admin = await requireAdmin(request);

    const { db } = await connectToDatabase();
    
    const syncMeta = await db.collection('square_sync_metadata').findOne({ 
      type: 'catalog_sync' 
    });

    const [catalogCount, unifiedCount] = await Promise.all([
      db.collection('square_catalog_items').countDocuments(),
      db.collection('unified_products').countDocuments()
    ]);

    return NextResponse.json({
      success: true,
      lastSync: syncMeta?.lastSyncAt || null,
      stats: syncMeta?.stats || {},
      counts: {
        catalogItems: catalogCount,
        unifiedProducts: unifiedCount
      },
      ready: catalogCount > 0 && unifiedCount > 0
    });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('ProductSync', 'Failed to get sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
