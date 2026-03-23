import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { createLogger } from '@/lib/logger';
import { getAdminSession } from '@/lib/admin-session';

const logger = createLogger('DBHealth');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/db-health
 * Diagnostic endpoint to check MongoDB connection and collection counts
 * Use this to debug why products aren't showing on the live site
 */
export async function GET(request) {
  const admin = await getAdminSession(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    envVars: {
      hasMONGODB_URI: !!process.env.MONGODB_URI,
      hasMONGO_URL: !!process.env.MONGO_URL,
      hasDATABASE_NAME: !!process.env.DATABASE_NAME,
      hasDB_NAME: !!process.env.DB_NAME,
      hasSQUARE_ACCESS_TOKEN: !!process.env.SQUARE_ACCESS_TOKEN,
      hasSQUARE_LOCATION_ID: !!process.env.SQUARE_LOCATION_ID,
    },
    connection: {
      status: 'unknown',
      error: null,
      dbName: null,
      responseTimeMs: null,
    },
    collections: {
      unified_products: 0,
      square_catalog_items: 0,
      square_products: 0,
      products: 0,
      square_sync_metadata: null,
    },
    diagnosis: [],
    recommendations: [],
  };

  try {
    logger.info('Running DB health check...');
    
    const { db } = await connectToDatabase();
    
    diagnostics.connection.status = 'connected';
    diagnostics.connection.dbName = db.databaseName;
    diagnostics.connection.responseTimeMs = Date.now() - startTime;

    const [
      unifiedCount,
      squareCatalogCount,
      squareProductsCount,
      productsCount,
      syncMeta,
    ] = await Promise.all([
      db.collection('unified_products').countDocuments(),
      db.collection('square_catalog_items').countDocuments(),
      db.collection('square_products').countDocuments(),
      db.collection('products').countDocuments(),
      db.collection('square_sync_metadata').findOne({ type: 'catalog_sync' }),
    ]);

    diagnostics.collections.unified_products = unifiedCount;
    diagnostics.collections.square_catalog_items = squareCatalogCount;
    diagnostics.collections.square_products = squareProductsCount;
    diagnostics.collections.products = productsCount;
    diagnostics.collections.square_sync_metadata = syncMeta ? {
      lastSyncAt: syncMeta.lastSyncAt,
      itemCount: syncMeta.itemCount,
      stats: syncMeta.stats,
    } : null;

    // Diagnose the issue
    if (unifiedCount === 0 && squareCatalogCount === 0 && squareProductsCount === 0 && productsCount === 0) {
      diagnostics.diagnosis.push('ALL_COLLECTIONS_EMPTY');
      diagnostics.recommendations.push('No products in any collection. Run catalog sync: POST /api/admin/products/sync');
    } else if (unifiedCount === 0) {
      if (squareCatalogCount > 0) {
        diagnostics.diagnosis.push('UNIFIED_EMPTY_BUT_SQUARE_CATALOG_HAS_DATA');
        diagnostics.recommendations.push(`Found ${squareCatalogCount} items in square_catalog_items. Run unified sync: POST /api/admin/products/sync`);
      } else if (squareProductsCount > 0) {
        diagnostics.diagnosis.push('UNIFIED_EMPTY_BUT_SQUARE_PRODUCTS_HAS_DATA');
        diagnostics.recommendations.push(`Found ${squareProductsCount} items in square_products. Collection mismatch - code reads from square_catalog_items but data is in square_products`);
      } else if (productsCount > 0) {
        diagnostics.diagnosis.push('UNIFIED_EMPTY_BUT_LEGACY_PRODUCTS_HAS_DATA');
        diagnostics.recommendations.push(`Found ${productsCount} items in legacy products collection. Consider migrating to unified_products`);
      }
    } else {
      diagnostics.diagnosis.push('UNIFIED_HAS_PRODUCTS');
      if (unifiedCount < 5) {
        diagnostics.recommendations.push(`Only ${unifiedCount} products in unified_products. This may be fewer than expected.`);
      }
    }

    // Check last sync time
    if (syncMeta?.lastSyncAt) {
      const syncAge = Date.now() - new Date(syncMeta.lastSyncAt).getTime();
      const syncAgeHours = Math.round(syncAge / (1000 * 60 * 60));
      if (syncAgeHours > 24) {
        diagnostics.recommendations.push(`Last sync was ${syncAgeHours} hours ago. Consider running a fresh sync.`);
      }
    } else {
      diagnostics.recommendations.push('No sync metadata found. Catalog may never have been synced.');
    }

    // Sample product from unified if available
    if (unifiedCount > 0) {
      const sampleProduct = await db.collection('unified_products').findOne({});
      diagnostics.sampleProduct = {
        id: sampleProduct?.id,
        name: sampleProduct?.name,
        hasImages: !!(sampleProduct?.images?.length),
        hasVariations: !!(sampleProduct?.variations?.length),
        price: sampleProduct?.price,
        category: sampleProduct?.intelligentCategory || sampleProduct?.category,
      };
    }

    logger.info('DB health check complete', diagnostics);

    return NextResponse.json({
      ok: true,
      ...diagnostics,
    });

  } catch (error) {
    logger.error('DB health check failed', { error: error.message, stack: error.stack });
    
    diagnostics.connection.status = 'failed';
    diagnostics.connection.error = error.message;
    diagnostics.connection.responseTimeMs = Date.now() - startTime;
    diagnostics.diagnosis.push('CONNECTION_FAILED');
    
    // Determine cause
    if (error.message.includes('MONGODB_URI') || error.message.includes('MONGO_URL')) {
      diagnostics.recommendations.push('Missing MONGODB_URI or MONGO_URL environment variable. Add to Vercel project settings.');
    } else if (error.message.includes('connect') || error.message.includes('timeout')) {
      diagnostics.recommendations.push('Connection timeout. Check: 1) MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for Vercel), 2) Cluster is running, 3) Connection string is correct.');
    } else if (error.message.includes('authentication') || error.message.includes('auth')) {
      diagnostics.recommendations.push('Authentication failed. Check username/password in connection string.');
    } else {
      diagnostics.recommendations.push(`Connection error: ${error.message}. Verify MONGODB_URI is correct.`);
    }

    return NextResponse.json({
      ok: false,
      ...diagnostics,
    }, { status: 500 });
  }
}
