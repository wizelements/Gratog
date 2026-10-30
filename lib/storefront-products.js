import { logger } from '@/lib/logger';
import { applyMerchantPrice } from '@/lib/merchant-pricing';
import { connectToDatabase } from '@/lib/db-optimized';
import { getUnifiedProducts } from '@/lib/product-sync-engine';
import { getCategoriesWithCounts } from '@/lib/ingredient-taxonomy';
import { getDemoProducts } from '@/lib/demo-products';
import { enhanceProductCatalog } from '@/lib/product-enhancements';
import { applyInventorySnapshot } from '@/lib/custom-inventory';
import { enrichProductWithHealthBenefits } from '@/lib/health-benefits';
import { validateStorefrontProducts } from '@/lib/storefront-integrity';
import { prepareLiveStorefrontProducts } from '@/lib/storefront-catalog-eligibility';
import {
  getCuratedStorefrontProducts,
  normalizeProductKey,
} from '@/data/products';

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
  return products.map(product => {
    const resolvedVariationId =
      product.squareData?.variationId ||
      product.variations?.[0]?.id ||
      null;

    if (!resolvedVariationId) {
      logger.warn('Storefront', 'Product missing variation ID — will be treated as ad-hoc at checkout', {
        productId: product.id,
        productName: product.name,
        hasSquareData: !!product.squareData,
        variationCount: product.variations?.length ?? 0,
      });
    }

    return {
      ...product,
      variationId: resolvedVariationId,
      catalogObjectId: resolvedVariationId,
      checkoutReady: Boolean(resolvedVariationId) && product.checkoutReady !== false,
      checkoutUnavailableReason: resolvedVariationId
        ? undefined
        : 'This item is visible in the catalog but is missing a checkout variation. Please ask at the market.',
    };
  });
}

function mergeCuratedMarketCatalog(products, { alreadyPrepared = false } = {}) {
  const curatedProducts = getCuratedStorefrontProducts();
  const liveProducts = alreadyPrepared ? products : prepareLiveStorefrontProducts(products);

  const liveKeys = new Set(
    liveProducts.flatMap((product) => [product.id, product.slug, product.name, product.curatedProductId]
      .map(normalizeProductKey)
      .filter(Boolean))
  );

  const missingCuratedProducts = curatedProducts.filter((product) => {
    const keys = [product.id, product.slug, product.name].map(normalizeProductKey).filter(Boolean);
    return !keys.some((key) => liveKeys.has(key));
  });

  // Missing curated entries are marketing placeholders, never proof of
  // physically available merchandise or a sellable Square variation.
  const placeholders = missingCuratedProducts.map(product => ({
    ...product, inStock: false, stock: null, inventoryVerified: false,
    checkoutReady: false, purchaseStatus: 'out_of_stock',
    checkoutUnavailableReason: 'Availability must be confirmed with the team.',
  }));
  return [...liveProducts, ...placeholders].map(applyMerchantPrice);
}

function buildCuratedCatalogSnapshot(source, message) {
  const products = mergeCuratedMarketCatalog([]).map(enrichProductWithHealthBenefits);

  return {
    products,
    categories: getCategoriesWithCounts(products),
    totalCount: products.length,
    source,
    isFallback: true,
    message,
    integrityReports: []
  };
}

// Rate-limit repeated per-request quarantine diagnostics without weakening
// product validation or hiding actionable data quality reasons.
let lastQuarantineSignature = '';
let lastQuarantineLoggedAt = 0;

export async function getStorefrontCatalogSnapshot(filters = {}) {
  try {
    const unifiedProducts = await getUnifiedProducts(filters);

    if (Array.isArray(unifiedProducts) && unifiedProducts.length > 0) {
      // Match approved merchant details before validation: Square sync rows
      // can omit recipe copy even when the product is genuinely known.
      // Unknown and incomplete merchandise remains ineligible.
      let inventoryAwareProducts = prepareLiveStorefrontProducts(
        withCartCompatibleIdentifiers(unifiedProducts)
      );

      try {
        const { db } = await connectToDatabase();
        inventoryAwareProducts = await applyInventorySnapshot(db, inventoryAwareProducts);
      } catch (inventoryError) {
        logger.warn('Storefront', 'Failed to apply inventory snapshot for storefront bootstrap', {
          error: inventoryError instanceof Error ? inventoryError.message : String(inventoryError)
        });
        inventoryAwareProducts = inventoryAwareProducts.map(product => ({
          ...product, stock: null, currentStock: null, inventoryVerified: false,
          inStock: false, checkoutReady: false,
          purchaseStatus: 'out_of_stock',
          checkoutUnavailableReason: 'Inventory verification is temporarily unavailable.',
        }));
      }

      const integrity = validateStorefrontProducts(inventoryAwareProducts);
      if (integrity.invalidReports.length > 0) {
        const signature = integrity.invalidReports
          .map(report => [report.productId, ...report.errors].join(':'))
          .sort()
          .join('|');
        const now = Date.now();
        if (signature !== lastQuarantineSignature || now - lastQuarantineLoggedAt >= 60 * 60 * 1000) {
          logger.warn('Storefront', 'Quarantined incomplete source catalog records', {
            invalidCount: integrity.invalidReports.length,
            reports: integrity.invalidReports.map(report => ({
              productId: report.productId,
              reasons: report.errors
            }))
          });
          lastQuarantineSignature = signature;
          lastQuarantineLoggedAt = now;
        }
      }

      const enrichedProducts = integrity.validProducts.map(enrichProductWithHealthBenefits);
      const enhancedProducts = mergeCuratedMarketCatalog(enhanceProductCatalog(enrichedProducts), { alreadyPrepared: true });

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

    return buildCuratedCatalogSnapshot(
      'curated_weekly_market_empty_unified',
      'Using curated weekly market product source while Square catalog has no publishable storefront products.'
    );
  } catch (error) {
    logger.warn('Storefront', 'Failed to load storefront catalog snapshot', {
      error: error instanceof Error ? error.message : String(error)
    });

    if (!shouldUseDemoFallback()) {
      return buildCuratedCatalogSnapshot(
        'curated_weekly_market_storefront_error',
        'Using curated weekly market product source while live storefront catalog is temporarily unavailable.'
      );
    }
  }

  logger.warn('Storefront', 'Using demo fallback products (non-production mode)', {
    filters,
    nodeEnv: process.env.NODE_ENV
  });

  const demoProducts = mergeCuratedMarketCatalog(
    enhanceProductCatalog(getDemoProducts(filters).map(enrichProductWithHealthBenefits))
  );

  return {
    products: demoProducts,
    categories: getCategoriesWithCounts(demoProducts),
    totalCount: demoProducts.length,
    source: 'demo_fallback',
    isFallback: true
  };
}
