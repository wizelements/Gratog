import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { getUnifiedProducts } from '@/lib/product-sync-engine';
import { getCategoriesWithCounts } from '@/lib/ingredient-taxonomy';
import { getDemoProducts, getDemoCategories } from '@/lib/demo-products';
import { createLogger } from '@/lib/logger';
import { enhanceProductCatalog } from '@/lib/product-enhancements';
import { applyInventorySnapshot } from '@/lib/custom-inventory';
import {
  PRODUCT_IMAGE_FALLBACK_SRC,
  validateStorefrontProducts
} from '@/lib/storefront-integrity';
import {
  filterOutSandboxProducts,
  validateNoSandboxProducts
} from '@/lib/sandbox-detection';
import { isSquareProductVisibleOnStorefront } from '@/lib/square-visibility';

const logger = createLogger('ProductsAPI');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
};

function createNoStoreJsonResponse(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init.headers || {})
    }
  });
}

function normalizeError(error) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

function shouldUseDemoFallback() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_STOREFRONT_FALLBACK === 'true';
}

function withCartCompatibleIdentifiers(products) {
  return products.map((product) => ({
    ...product,
    variationId: product.squareData?.variationId || product.variations?.[0]?.id || product.id,
    catalogObjectId: product.squareData?.variationId || product.variations?.[0]?.id || product.id
  }));
}

function toCleanFilters(searchParams) {
  const filters = {
    category: searchParams.get('category'),
    tag: searchParams.get('tag'),
    ingredient: searchParams.get('ingredient'),
    search: searchParams.get('search')
  };

  return Object.entries(filters).reduce((accumulator, [key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});
}

function buildDbErrorPayload(dbError) {
  if (!dbError) {
    return undefined;
  }

  return {
    message: dbError.message,
    hint: 'Check /api/db-health for diagnostics'
  };
}

function buildEmptyProductsResponse({
  source,
  message,
  filters = {},
  dbError = null,
  integrityReports = []
}) {
  return createNoStoreJsonResponse({
    success: true,
    hadDbError: Boolean(dbError),
    products: [],
    categories: [],
    count: 0,
    source,
    filters,
    integrityReports,
    dbError: buildDbErrorPayload(dbError),
    message
  });
}

function buildDemoFallbackResponse({
  source,
  message,
  filters = {},
  dbError = null,
  integrityReports = []
}) {
  const demoProducts = getDemoProducts(filters);
  const demoCategories = getDemoCategories();

  return createNoStoreJsonResponse({
    success: true,
    hadDbError: Boolean(dbError),
    products: demoProducts,
    categories: demoCategories,
    count: demoProducts.length,
    source,
    filters,
    integrityReports,
    dbError: buildDbErrorPayload(dbError),
    message
  });
}

function summarizeImageStats(products, filteredForIntegrity = 0) {
  return {
    withImages: products.filter((product) => !product.isPlaceholder).length,
    withPlaceholders: products.filter((product) => product.isPlaceholder).length,
    filteredForIntegrity
  };
}

async function getUnifiedCatalogPayload({ filters, startTime }) {
  let rawProducts = [];
  let dbError = null;

  try {
    rawProducts = await getUnifiedProducts(filters);
  } catch (error) {
    dbError = normalizeError(error);
    logger.error('Database error fetching unified products', {
      error: dbError.message,
      stack: dbError.stack
    });
  }

  const filteredRawProducts = filterOutSandboxProducts(Array.isArray(rawProducts) ? rawProducts : []);
  let inventoryAwareProducts = withCartCompatibleIdentifiers(filteredRawProducts);

  if (inventoryAwareProducts.length > 0) {
    try {
      const { db } = await connectToDatabase();
      inventoryAwareProducts = await applyInventorySnapshot(db, inventoryAwareProducts);
    } catch (inventoryError) {
      const normalizedInventoryError = normalizeError(inventoryError);
      logger.warn('Failed to apply inventory snapshot for unified products', {
        error: normalizedInventoryError.message
      });
    }
  }

  const integrity = validateStorefrontProducts(inventoryAwareProducts);
  if (integrity.invalidReports.length > 0) {
    logger.error('Filtered invalid storefront products in /api/products', {
      invalidCount: integrity.invalidReports.length,
      productIds: integrity.invalidReports.map((report) => report.productId)
    });
  }

  const publishableProducts = enhanceProductCatalog(integrity.validProducts);

  try {
    validateNoSandboxProducts(publishableProducts, '/api/products unified path');
  } catch (sandboxError) {
    const normalizedSandboxError = normalizeError(sandboxError);
    logger.error('Sandbox products detected in API response', {
      error: normalizedSandboxError.message,
      severity: 'critical'
    });

    if (process.env.NODE_ENV === 'development') {
      throw normalizedSandboxError;
    }
  }

  if (publishableProducts.length === 0) {
    const source = dbError
      ? 'unified_db_error_no_products'
      : integrity.invalidReports.length > 0
        ? 'unified_integrity_filtered_all'
        : 'unified_empty_collection';

    if (!shouldUseDemoFallback()) {
      logger.warn('No publishable products available and demo fallback is disabled', {
        source,
        filters,
        dbError: dbError?.message,
        invalidIntegrityProducts: integrity.invalidReports.length
      });

      return buildEmptyProductsResponse({
        source: dbError
          ? 'unified_db_error_no_demo_fallback'
          : integrity.invalidReports.length > 0
            ? 'unified_integrity_no_demo_fallback'
            : 'unified_empty_no_demo_fallback',
        message: dbError
          ? 'Catalog data is temporarily unavailable while we restore live inventory.'
          : 'No publishable storefront products are currently available.',
        filters,
        dbError,
        integrityReports: integrity.invalidReports
      });
    }

    logger.warn('No publishable products, using demo fallback (non-production mode)', {
      source,
      filters,
      dbError: dbError?.message,
      invalidIntegrityProducts: integrity.invalidReports.length
    });

    logger.api('GET', '/api/products', 200, Date.now() - startTime, {
      source: dbError ? 'demo_db_error_fallback' : 'demo_fallback',
      count: 0,
      dbError: dbError?.message
    });

    return buildDemoFallbackResponse({
      source: dbError ? 'demo_db_error_fallback' : 'demo_fallback',
      message: dbError
        ? 'Database connection issue - showing demo products. Check /api/db-health for details.'
        : 'Using demo products while the live catalog is being prepared.',
      filters,
      dbError,
      integrityReports: integrity.invalidReports
    });
  }

  const categories = getCategoriesWithCounts(publishableProducts);
  const imageStats = summarizeImageStats(publishableProducts, integrity.invalidReports.length);

  logger.info('Returning unified storefront products', {
    count: publishableProducts.length,
    ...imageStats
  });
  logger.api('GET', '/api/products', 200, Date.now() - startTime, {
    source: 'unified_intelligent_enhanced',
    count: publishableProducts.length,
    ...imageStats
  });

  return createNoStoreJsonResponse({
    success: true,
    products: publishableProducts,
    categories,
    count: publishableProducts.length,
    source: 'unified_intelligent_enhanced',
    filters,
    imageStats,
    integrityReports: integrity.invalidReports
  });
}

async function getLegacyCatalogPayload({ startTime }) {
  const { db } = await connectToDatabase();

  const rawItems = await db
    .collection('square_catalog_items')
    .find({})
    .sort({ name: 1 })
    .toArray();

  const items = rawItems.filter((item) => isSquareProductVisibleOnStorefront(item));

  if (rawItems.length !== items.length) {
    logger.info('Filtered hidden/archived products in legacy catalog path', {
      total: rawItems.length,
      visible: items.length,
      hidden: rawItems.length - items.length
    });
  }

  const legacyProducts = items.map((item) => {
    const mainVariation = item.variations?.[0] || null;

    let category = 'other';
    const normalizedName = String(item.name || '').toLowerCase();
    if (normalizedName.includes('gel')) category = 'gel';
    else if (normalizedName.includes('lemonade') || normalizedName.includes('zinger')) category = 'lemonade';
    else if (normalizedName.includes('shot')) category = 'shot';
    else if (normalizedName.includes('juice')) category = 'juice';

    const slug = String(item.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const imageCandidates = Array.isArray(item.images)
      ? item.images
        .map((image) => {
          if (typeof image === 'string') {
            return image;
          }
          if (image && typeof image === 'object') {
            return image.url;
          }
          return '';
        })
        .filter(Boolean)
      : [];

    return {
      id: item.id,
      slug,
      variationId: mainVariation?.id,
      name: item.name,
      description: item.description || '',
      price: Number(mainVariation?.price || 0),
      priceCents: Number(mainVariation?.priceCents || 0),
      category,
      image: imageCandidates[0] || PRODUCT_IMAGE_FALLBACK_SRC,
      images: imageCandidates,
      inStock: true,
      variations: item.variations || [],
      squareData: {
        catalogObjectId: item.id,
        variationId: mainVariation?.id,
        categoryId: item.categoryId
      }
    };
  });

  const integrity = validateStorefrontProducts(legacyProducts, { allowMissingBenefitStory: true });
  const publishableProducts = enhanceProductCatalog(integrity.validProducts);

  if (integrity.invalidReports.length > 0) {
    logger.warn('Filtered invalid legacy products for storefront response', {
      invalidCount: integrity.invalidReports.length,
      productIds: integrity.invalidReports.map((report) => report.productId)
    });
  }

  if (publishableProducts.length === 0) {
    if (!shouldUseDemoFallback()) {
      return buildEmptyProductsResponse({
        source: 'legacy_square_empty_no_demo_fallback',
        message: 'No publishable legacy catalog products are currently available.',
        integrityReports: integrity.invalidReports
      });
    }

    logger.warn('Legacy products are empty after integrity filtering, using demo fallback');

    logger.api('GET', '/api/products', 200, Date.now() - startTime, {
      source: 'legacy_demo_fallback',
      count: 0
    });

    return buildDemoFallbackResponse({
      source: 'legacy_demo_fallback',
      message: 'Using demo products because the legacy catalog is currently empty.',
      integrityReports: integrity.invalidReports
    });
  }

  const categories = getCategoriesWithCounts(publishableProducts);
  const imageStats = summarizeImageStats(publishableProducts, integrity.invalidReports.length);

  logger.info('Returning legacy storefront products', {
    count: publishableProducts.length,
    ...imageStats
  });
  logger.api('GET', '/api/products', 200, Date.now() - startTime, {
    source: 'square_catalog_sync',
    count: publishableProducts.length,
    ...imageStats
  });

  return createNoStoreJsonResponse({
    success: true,
    products: publishableProducts,
    categories,
    count: publishableProducts.length,
    source: 'square_catalog_sync',
    imageStats,
    integrityReports: integrity.invalidReports,
    lastSync: items.length > 0 ? items[0].updatedAt : null
  });
}

/**
 * GET /api/products
 * Query params:
 *   - unified: true/false (default: true)
 *   - category, tag, ingredient, search
 */
export async function GET(request) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const useUnified = searchParams.get('unified') !== 'false';
    const filters = toCleanFilters(searchParams);

    logger.info('Products API request', {
      useUnified,
      params: Object.fromEntries(searchParams)
    });

    if (useUnified) {
      return await getUnifiedCatalogPayload({ filters, startTime });
    }

    logger.debug('Using legacy Square catalog mode');
    return await getLegacyCatalogPayload({ startTime });
  } catch (error) {
    const normalizedError = normalizeError(error);

    logger.error('Failed to fetch products', {
      error: normalizedError.message,
      stack: normalizedError.stack
    });

    if (!shouldUseDemoFallback()) {
      logger.api('GET', '/api/products', 200, Date.now() - startTime, {
        source: 'api_error_no_demo_fallback',
        count: 0
      });

      return buildEmptyProductsResponse({
        source: 'api_error_no_demo_fallback',
        message: 'Storefront catalog is temporarily unavailable.',
        dbError: normalizedError
      });
    }

    logger.api('GET', '/api/products', 200, Date.now() - startTime, {
      source: 'demo_error_fallback',
      count: 0
    });

    return buildDemoFallbackResponse({
      source: 'demo_error_fallback',
      message: 'Temporary products shown while we reconnect to live inventory.',
      dbError: normalizedError
    });
  }
}
