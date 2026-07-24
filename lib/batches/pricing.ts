/**
 * Fresh Batch Request System — category-specific pricing helpers
 *
 * Curated product data (`data/products.ts`) is the temporary price authority for
 * 16 oz bottles. Gallon prices are derived from that source unless an owner
 * explicitly sets a different value. Microbatch setup fees are pulled from
 * owner configuration by product category.
 */

import { PRODUCTS, type ProductCategory, type MarketProduct } from '@/data/products';
import { centsFromDollars, gallonsToBottles } from './quantity-converter';
import { DEFAULT_BATCH_OWNER_CONFIG } from './types';

const SETUP_FEE_BY_CATEGORY: Record<Exclude<ProductCategory, 'bundles' | 'inactive'>, number> = {
  lemonades: DEFAULT_BATCH_OWNER_CONFIG.setupFeeCentsLemonade,
  refreshers: DEFAULT_BATCH_OWNER_CONFIG.setupFeeCentsRefresher,
  juices: DEFAULT_BATCH_OWNER_CONFIG.setupFeeCentsJuice,
  gels: DEFAULT_BATCH_OWNER_CONFIG.setupFeeCentsJuice,
  shots: DEFAULT_BATCH_OWNER_CONFIG.setupFeeCentsRefresher,
};

/**
 * Resolve a curated product by slug.
 */
export function getProductBySlug(slug: string): MarketProduct | null {
  return PRODUCTS.find((p) => p.slug === slug) ?? null;
}

/**
 * Compute a standard gallon price from the curated 16 oz bottle price.
 * Returns `null` if no product is found, price is invalid, or the product
 * category does not support gallon production (shots, gels, bundles).
 */
export function standardGallonPriceCents(productSlug: string): number | null {
  const product = getProductBySlug(productSlug);
  if (!product || !Number.isFinite(product.price) || product.price <= 0) return null;
  if (!['lemonades', 'juices', 'refreshers'].includes(product.category)) return null;
  return centsFromDollars(product.price * gallonsToBottles(1));
}

/**
 * Compute a standard gallon price from a known category's default bottle price.
 * Used when only a flavor profile (not a specific product) is requested.
 */
export function fallbackGallonPriceCents(category: ProductCategory): number | null {
  const defaults: Record<ProductCategory, number> = {
    lemonades: 11,
    refreshers: 10,
    juices: 12,
    gels: 0,
    shots: 0,
    bundles: 0,
    inactive: 0,
  };
  const price = defaults[category];
  if (!price) return null;
  return centsFromDollars(price * gallonsToBottles(1));
}

/**
 * Determine the setup fee in cents for a given product/category.
 * Gels and shots are not supported as gallon microbatches in Phase 1 and return
 * the juice/refresher fee as a conservative placeholder.
 */
export function setupFeeCents(
  productSlug: string | null,
  category: ProductCategory | null
): number {
  if (productSlug) {
    const product = getProductBySlug(productSlug);
    if (product && product.category in SETUP_FEE_BY_CATEGORY) {
      return SETUP_FEE_BY_CATEGORY[product.category as keyof typeof SETUP_FEE_BY_CATEGORY];
    }
  }
  if (category && category in SETUP_FEE_BY_CATEGORY) {
    return SETUP_FEE_BY_CATEGORY[category as keyof typeof SETUP_FEE_BY_CATEGORY];
  }
  // Unknown category falls back to refresher setup fee as a safe high default.
  return DEFAULT_BATCH_OWNER_CONFIG.setupFeeCentsRefresher;
}

/**
 * Compute final price for a reservation.
 *
 * @param gallonEquivalent how many gallons the customer reserved
 * @param standardGallonPriceCents owner/server-confirmed price
 * @param setupFeeCents microbatch/owner-configured fee
 * @param depositPercent fraction required as deposit (e.g., 0.5)
 */
export function calculateReservationPrice(
  gallonEquivalent: number,
  standardGallonPriceCents: number,
  setupFeeCents: number,
  depositPercent: number
): {
  finalPriceCents: number;
  depositCents: number;
  balanceDueCents: number;
} {
  const safeGallons = Math.max(0, Number(gallonEquivalent) || 0);
  const safePrice = Math.max(0, Math.round(standardGallonPriceCents));
  const safeSetupFee = Math.max(0, Math.round(setupFeeCents));
  const safeDepositPercent = Math.max(0, Math.min(1, depositPercent));

  const baseCents = Math.round(safeGallons * safePrice);
  const finalPriceCents = baseCents + safeSetupFee;
  const depositCents = Math.round(finalPriceCents * safeDepositPercent);
  const balanceDueCents = finalPriceCents - depositCents;

  return { finalPriceCents, depositCents, balanceDueCents };
}

/**
 * Resolve category from a product slug, with an optional override.
 */
export function resolveCategory(
  productSlug: string | null,
  overrideCategory: ProductCategory | null
): ProductCategory | null {
  if (overrideCategory) return overrideCategory;
  if (!productSlug) return null;
  const product = getProductBySlug(productSlug);
  return product?.category ?? null;
}
