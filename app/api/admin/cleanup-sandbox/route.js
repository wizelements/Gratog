import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { createLogger } from '@/lib/logger';

const logger = createLogger('CleanupSandbox');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/cleanup-sandbox
 * Remove sandbox products and trigger fresh production sync
 */
export async function POST(request) {
  const startTime = Date.now();
  
  try {
    const { db } = await connectToDatabase();
    
    logger.info('Starting sandbox cleanup...');
    
    // Step 1: Count sandbox products before cleanup
    const sandboxCountBefore = await db.collection('unified_products').countDocuments({
      $or: [
        { source: 'sandbox_sync' },
        { id: { $regex: /^sandbox-/i } },
        { squareId: { $regex: /^sandbox-/i } }
      ]
    });
    
    logger.info(`Found ${sandboxCountBefore} sandbox products to remove`);
    
    // Step 2: Remove sandbox products from unified_products
    const deleteResult = await db.collection('unified_products').deleteMany({
      $or: [
        { source: 'sandbox_sync' },
        { id: { $regex: /^sandbox-/i } },
        { squareId: { $regex: /^sandbox-/i } }
      ]
    });
    
    logger.info(`Deleted ${deleteResult.deletedCount} sandbox products from unified_products`);
    
    // Step 3: Remove sandbox products from square_catalog_items
    const catalogDeleteResult = await db.collection('square_catalog_items').deleteMany({
      $or: [
        { source: 'sandbox_sync' },
        { id: { $regex: /^sandbox-/i } }
      ]
    });
    
    logger.info(`Deleted ${catalogDeleteResult.deletedCount} sandbox items from square_catalog_items`);
    
    // Step 4: Get counts after cleanup
    const [unifiedCount, catalogCount] = await Promise.all([
      db.collection('unified_products').countDocuments(),
      db.collection('square_catalog_items').countDocuments()
    ]);
    
    const result = {
      success: true,
      cleanup: {
        sandboxProductsFound: sandboxCountBefore,
        unifiedProductsDeleted: deleteResult.deletedCount,
        catalogItemsDeleted: catalogDeleteResult.deletedCount
      },
      remaining: {
        unifiedProducts: unifiedCount,
        catalogItems: catalogCount
      },
      duration: Date.now() - startTime,
      nextStep: 'Run POST /api/admin/products/sync to refresh from production Square catalog'
    };
    
    logger.info('Sandbox cleanup complete', result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    logger.error('Sandbox cleanup failed', { error: error.message, stack: error.stack });
    
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/cleanup-sandbox
 * Preview what would be cleaned up (dry run)
 */
export async function GET(request) {
  try {
    const { db } = await connectToDatabase();
    
    // Find sandbox products
    const sandboxProducts = await db.collection('unified_products').find({
      $or: [
        { source: 'sandbox_sync' },
        { id: { $regex: /^sandbox-/i } },
        { squareId: { $regex: /^sandbox-/i } }
      ]
    }).project({ id: 1, name: 1, source: 1, squareId: 1 }).toArray();
    
    const sandboxCatalogItems = await db.collection('square_catalog_items').find({
      $or: [
        { source: 'sandbox_sync' },
        { id: { $regex: /^sandbox-/i } }
      ]
    }).project({ id: 1, name: 1, source: 1 }).toArray();
    
    return NextResponse.json({
      success: true,
      dryRun: true,
      sandboxProducts: {
        count: sandboxProducts.length,
        items: sandboxProducts
      },
      sandboxCatalogItems: {
        count: sandboxCatalogItems.length,
        items: sandboxCatalogItems
      },
      action: 'POST to this endpoint to delete these items'
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
