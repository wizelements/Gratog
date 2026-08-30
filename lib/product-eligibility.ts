/**
 * Canonical storefront product-eligibility helper.
 *
 * Single source of truth for deciding whether a product is safe to display
 * and/or purchase on public storefront surfaces (homepage, catalog, weekly
 * menu, product detail). Curated data (`data/products.ts`) is the availability
 * authority; Square is used only for price/transaction reconciliation, never
 * as a substitute for owner-confirmed availability.
 *
 * This module exists to close P0-003: consumers previously rendered fallback /
 * curated products (including `inactive` and `$0` items) as confirmed inventory.
 */

export type ProductEligibilityStatus =
 | 'available'
 | 'preorder'
 | 'sold_out'
 | 'unconfirmed'
 | 'inactive'
 | 'invalid_price';

export interface ProductEligibility {
 status: ProductEligibilityStatus;
 /** Safe to render on a public storefront surface. */
 displayable: boolean;
 /** Safe to allow add-to-cart / checkout. */
 purchasable: boolean;
 reason?: string;
}
/**
 * Minimal structural shape shared by every storefront product representation
 * (curated `toStorefrontProduct`, merged live products, and raw unified docs).
 */
export interface StorefrontProductLike {
 id?: unknown;
 slug?: unknown;
 name?: unknown;
 category?: unknown;
 weeklyStatus?: unknown;
 inventoryStatus?: unknown;
 activeWeeklyMenu?: unknown;
 soldOut?: unknown;
 price?: unknown;
 priceCents?: unknown;
 checkoutReady?: unknown;
 isPreorder?: unknown;
 preorderOnly?: unknown;
 source?: unknown;
 isFallback?: unknown;
}

const INACTIVE_CATEGORY = 'inactive';
const INACTIVE_STATUS = 'inactive';
const SOLD_OUT_STATUS = 'sold_out';
const CURATED_SOURCE = 'curated_weekly_market';

function asString(value: unknown): string {
 return String(value ?? '').toLowerCase().trim();
}

function isInactive(product: StorefrontProductLike): boolean {
 if (asString(product.category) === INACTIVE_CATEGORY) return true;
 if (asString(product.weeklyStatus) === INACTIVE_STATUS) return true;
 if (asString(product.inventoryStatus) === INACTIVE_STATUS) return true;
 if (product.activeWeeklyMenu === false) return true;
 return false;
}

function isSoldOut(product: StorefrontProductLike): boolean {
 if (product.soldOut === true) return true;
 if (asString(product.weeklyStatus) === SOLD_OUT_STATUS) return true;
 if (asString(product.inventoryStatus) === SOLD_OUT_STATUS) return true;
 return false;
}

function hasValidPrice(product: StorefrontProductLike): boolean {
 const price = typeof product.price === 'number' ? product.price : NaN;
 const priceCents = typeof product.priceCents === 'number' ? product.priceCents : NaN;
 if (Number.isFinite(price) && price > 0) return true;
 if (Number.isFinite(priceCents) && priceCents > 0) return true;
 return false;
}

function isUnconfirmed(product: StorefrontProductLike): boolean {
 // A product is "unconfirmed" when it is curated-only (no verified Square
 // variation) or explicitly flagged as fallback by the snapshot.
 if (product.isFallback === true) return true;
 if (asString(product.source) === CURATED_SOURCE) return true;
 if (product.checkoutReady === false) return true;
 return false;
}

function isPreorder(product: StorefrontProductLike): boolean {
 if (product.isPreorder === true) return true;
 if (product.preorderOnly === true) return true;
 if (asString(product.inventoryStatus) === 'preorder') return true;
 return false;
}

/**
 * Classify a storefront product into a single eligibility status.
 */
export function classifyProduct(product: StorefrontProductLike): ProductEligibility {
 if (isInactive(product)) {
 return {
 status: 'inactive',
 displayable: false,
 purchasable: false,
 reason: 'Product is archived or inactive.',
 };
 }

 if (!hasValidPrice(product)) {
 return {
 status: 'invalid_price',
 displayable: false,
 purchasable: false,
 reason: 'Product has no verified price.',
 };
 }

 if (isSoldOut(product)) {
 return {
 status: 'sold_out',
 displayable: true,
 purchasable: false,
 reason: 'Product is sold out.',
 };
 }

 if (isUnconfirmed(product)) {
 return {
 status: 'unconfirmed',
 displayable: true,
 purchasable: false,
 reason: 'Product availability is not yet confirmed by the owner.',
 };
 }

 if (isPreorder(product)) {
 return {
 status: 'preorder',
 displayable: true,
 purchasable: true,
 reason: 'Available for preorder.',
 };
 }

 return {
 status: 'available',
 displayable: true,
 purchasable: true,
 };
}

/**
 * True when a product is safe to render on a public storefront surface.
 * Excludes inactive and zero/negative-price items.
 */
export function isStorefrontDisplayable(product: StorefrontProductLike): boolean {
 return classifyProduct(product).displayable;
}

/**
 * True when a product is safe to allow add-to-cart / checkout.
 */
export function isStorefrontPurchasable(product: StorefrontProductLike): boolean {
 return classifyProduct(product).purchasable;
}

/**
 * Filter a list of products to those safe for public display.
 */
export function filterDisplayableProducts<T extends StorefrontProductLike>(
 products: T[]
): T[] {
 return products.filter(isStorefrontDisplayable);
}

/**
 * Filter a list of products to those safe for checkout.
 */
export function filterPurchasableProducts<T extends StorefrontProductLike>(
 products: T[]
): T[] {
 return products.filter(isStorefrontPurchasable);
}

/**
 * Summarize eligibility across a list for logging / build-time warnings.
 */
export function summarizeEligibility(products: StorefrontProductLike[]): Record<ProductEligibilityStatus, number> {
 const summary: Record<ProductEligibilityStatus, number> = {
 available: 0,
 preorder: 0,
 sold_out: 0,
 unconfirmed: 0,
 inactive: 0,
 invalid_price: 0,
 };

 products.forEach((product) => {
 const { status } = classifyProduct(product);
 summary[status] += 1;
 });

 return summary;
}
