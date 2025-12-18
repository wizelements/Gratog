import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { syncSquareCatalog } from '@/lib/square/catalogSync';
import { syncToUnified } from '@/lib/square/syncToUnified';
import { createLogger } from '@/lib/logger';
import { SYNC_SECRET } from '@/lib/auth-config';

const logger = createLogger('SyncTrigger');

// SECURITY FIX: SYNC_SECRET is now imported from centralized auth-config.ts
// which enforces proper configuration in production

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/sync-trigger?key=SECRET
 * One-time sync trigger endpoint - uses secret key for auth
 * Set SYNC_SECRET in Vercel env vars
 */
export async function POST(request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    // SECURITY FIX: No more hardcoded fallback
    if (key !== SYNC_SECRET) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 401 });
    }
    
    logger.info('Starting production sync trigger...');
    
    const { db } = await connectToDatabase();
    
    // Step 1: Clean up any sandbox products first
    logger.info('Step 1: Cleaning sandbox products...');
    const sandboxQuery = {
      $or: [
        { source: 'sandbox_sync' },
        { id: { $regex: /^sandbox-/i } },
        { squareId: { $regex: /^sandbox-/i } }
      ]
    };
    
    const cleanupResult = await db.collection('unified_products').deleteMany(sandboxQuery);
    logger.info(`Cleaned ${cleanupResult.deletedCount} sandbox products`);
    
    // Step 2: Sync from Square Catalog API
    logger.info('Step 2: Syncing from Square Catalog API...');
    let catalogResult = { items: 0, variations: 0, images: 0, errors: 0 };
    
    try {
      catalogResult = await syncSquareCatalog(db);
      logger.info(`Square catalog sync: ${catalogResult.items} items`);
    } catch (error) {
      logger.error('Square catalog sync failed:', error.message);
      return NextResponse.json({
        success: false,
        error: `Square catalog sync failed: ${error.message}`,
        hint: 'Check SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in Vercel env vars',
        duration: Date.now() - startTime
      }, { status: 500 });
    }
    
    // Step 3: Sync to unified_products
    logger.info('Step 3: Syncing to unified_products...');
    let unifiedResult = { success: 0, failed: 0, total: 0 };
    
    try {
      unifiedResult = await syncToUnified(true);
      logger.info(`Unified sync: ${unifiedResult.success}/${unifiedResult.total}`);
    } catch (error) {
      logger.error('Unified sync failed:', error.message);
    }
    
    // Get final counts
    const [unifiedCount, catalogCount, withImages] = await Promise.all([
      db.collection('unified_products').countDocuments(),
      db.collection('square_catalog_items').countDocuments(),
      db.collection('unified_products').countDocuments({ 'images.0': { $exists: true } })
    ]);
    
    const result = {
      success: true,
      environment: process.env.SQUARE_ENVIRONMENT || 'production',
      cleanup: {
        sandboxDeleted: cleanupResult.deletedCount
      },
      catalogSync: catalogResult,
      unifiedSync: unifiedResult,
      final: {
        totalProducts: unifiedCount,
        catalogItems: catalogCount,
        withImages: withImages
      },
      duration: Date.now() - startTime
    };
    
    logger.info('Sync complete', result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    logger.error('Sync trigger failed', { error: error.message, stack: error.stack });
    
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}

/**
 * GET /api/sync-trigger
 * Check sync status
 */
export async function GET(request) {
  try {
    const { db } = await connectToDatabase();
    
    const [unifiedCount, catalogCount, withImages, syncMeta] = await Promise.all([
      db.collection('unified_products').countDocuments(),
      db.collection('square_catalog_items').countDocuments(),
      db.collection('unified_products').countDocuments({ 'images.0': { $exists: true } }),
      db.collection('square_sync_metadata').findOne({ type: 'catalog_sync' })
    ]);
    
    // Check for sandbox products
    const sandboxCount = await db.collection('unified_products').countDocuments({
      $or: [
        { source: 'sandbox_sync' },
        { id: { $regex: /^sandbox-/i } }
      ]
    });
    
    return NextResponse.json({
      success: true,
      environment: process.env.SQUARE_ENVIRONMENT || 'production',
      counts: {
        unifiedProducts: unifiedCount,
        catalogItems: catalogCount,
        withImages: withImages,
        sandboxProducts: sandboxCount
      },
      lastSync: syncMeta?.lastSyncAt || null,
      syncStats: syncMeta?.stats || null,
      action: sandboxCount > 0 
        ? 'Sandbox products detected. POST with ?key=YOUR_SECRET to clean and sync.'
        : 'POST with ?key=YOUR_SECRET to trigger fresh sync.'
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
