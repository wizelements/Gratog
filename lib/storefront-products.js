import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/db-optimized';
import { getUnifiedProducts } from '@/lib/product-sync-engine';
import { getCategoriesWithCounts } from '@/lib/ingredient-taxonomy';
import { getDemoProducts, getDemoCategories } from '@/lib/demo-products';
import { enhanceProductCatalog } from '@/lib/product-enhancements';
import { applyInventorySnapshot } from '@/lib/custom-inventory';
import { validateStorefrontProducts } from '@/lib/storefront-integrity';

function shouldUseDemoFallback() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_STOREFRONT_FALLBACK === 'true';
}

function buildEmptyCatalogSnapshot(source, message, integrityReports = []) {
  return {
    products: [],
    categories: [],
    totalCount: 0,
    source,
    isFallback: false,
    message,
    integrityReports
  };
}

function withCartCompatibleIdentifiers(products) {
  return products.map(product => ({
    ...product,
    variationId: product.squareData?.variationId || product.variations?.[0]?.id || product.id,
    catalogObjectId: product.squareData?.variationId || product.variations?.[0]?.id || product.id
  }));
}

export async function getStorefrontCatalogSnapshot(filters = {}) {
  try {
    const unifiedProducts = await getUnifiedProducts(filters);

    if (Array.isArray(unifiedProducts) && unifiedProducts.length > 0) {
      let inventoryAwareProducts = withCartCompatibleIdentifiers(unifiedProducts);

      try {
        const { db } = await connectToDatabase();
        inventoryAwareProducts = await applyInventorySnapshot(db, inventoryAwareProducts);
      } catch (inventoryError) {
        logger.warn('Storefront', 'Failed to apply inventory snapshot for storefront bootstrap', {
          error: inventoryError instanceof Error ? inventoryError.message : String(inventoryError)
        });
      }

      const integrity = validateStorefrontProducts(inventoryAwareProducts);
      if (integrity.invalidReports.length > 0) {
        logger.error('Storefront', 'Filtered invalid storefront products during bootstrap', {
          invalidCount: integrity.invalidReports.length,
          productIds: integrity.invalidReports.map(report => report.productId)
        });
      }

      const enhancedProducts = enhanceProductCatalog(integrity.validProducts);

      if (enhancedProducts.length === 0) {
        return buildEmptyCatalogSnapshot(
          'unified_storefront_empty_after_validation',
          'Catalog data failed storefront integrity validation.',
          integrity.invalidReports
        );
      }

      return {
        products: enhancedProducts,
        categories: getCategoriesWithCounts(enhancedProducts),
        totalCount: enhancedProducts.length,
        source: 'unified_storefront',
        isFallback: false,
        integrityReports: integrity.invalidReports
      };
    }

    return buildEmptyCatalogSnapshot(
      'unified_storefront_empty',
      'No publishable storefront products are currently available.'
    );
  } catch (error) {
    logger.warn('Storefront', 'Failed to load storefront catalog snapshot', {
      error: error instanceof Error ? error.message : String(error)
    });

    if (!shouldUseDemoFallback()) {
      return buildEmptyCatalogSnapshot(
        'storefront_error_no_demo_fallback',
        'Storefront catalog is temporarily unavailable.'
      );
    }
  }

  logger.warn('Storefront', 'Using demo fallback products (non-production mode)', {
    filters,
    nodeEnv: process.env.NODE_ENV
  });

  const demoProducts = enhanceProductCatalog(getDemoProducts(filters));

  return {
    products: demoProducts,
    categories: getDemoCategories(),
    totalCount: null,
    source: 'demo_fallback',
    isFallback: true
  };
}
