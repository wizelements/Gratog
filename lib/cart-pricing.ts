/**
 * Server-authoritative cart pricing.
 *
 * The browser sends a list of "what I want to buy" (product/variation IDs +
 * quantities). It MUST NOT decide what those things cost. This module rebuilds
 * the entire money picture (line items, subtotal, discount, total) from the
 * canonical catalog in MongoDB so that client tampering — via devtools, the
 * Zustand store, a forged fetch, anything — cannot change what the customer
 * is actually charged.
 *
 * Used by:
 *   - app/api/orders/create/route.js (replaces client-trusted totals)
 *
 * Hard rules:
 *   1. Never trust client-supplied `price`, `subtotal`, `total`, or
 *      `couponDiscount`.
 *   2. Reject items whose product/variation IDs don't exist in the catalog.
 *   3. Reject obviously-bad quantities (non-positive, non-integer, absurd).
 *   4. Validate coupons against the `coupons` collection at pricing time.
 *   5. Never let the total drop below zero.
 *   6. Never silently produce a $0.00 paid order unless the catalog itself
 *      genuinely says everything is free.
 */
import { connectToDatabase } from './db-optimized';

export interface CartLineInput {
  /** Anything the client gives us that might be a product key. */
  id?: string;
  productId?: string;
  catalogObjectId?: string;
  variationId?: string;
  /** Required. */
  quantity: number;
  /** Optional pass-through, NEVER used for pricing. */
  name?: string;
  size?: string;
  image?: string;
  category?: string;
  isPreorder?: boolean;
  marketExclusive?: boolean;
  squareProductUrl?: string;
}

export interface PricedLineItem {
  id: string;
  productId: string;
  variationId: string | null;
  catalogObjectId: string | null;
  name: string;
  subtitle?: string;
  unitPriceCents: number;
  unitPrice: number; // dollars, for display
  quantity: number;
  lineTotalCents: number;
  lineTotal: number;
  rewardPoints: number;
  isPreorder: boolean;
  marketExclusive: boolean;
  category?: string;
  size?: string;
  image?: string;
  squareProductUrl?: string;
}

export interface PriceCartInput {
  items: CartLineInput[];
  /** Coupon code as typed by the customer. */
  couponCode?: string | null;
  /** Server-decided delivery fee, in dollars. Pass 0 if pickup. */
  deliveryFeeCents?: number;
  /** Customer-chosen tip, in dollars. Treated as advisory only — must be
   * non-negative and capped at 50% of (subtotal + delivery) to avoid abuse. */
  tipCents?: number;
}

export interface PricedCart {
  items: PricedLineItem[];
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  tipCents: number;
  /** Reserved for future tax handling; currently 0 (Square handles tax at
   * the payment level for in-person sales; online is tax-included). */
  taxCents: number;
  totalCents: number;
  // Dollar mirrors for code that wants display-friendly numbers.
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tip: number;
  tax: number;
  total: number;
  currency: 'USD';
  appliedCoupon: AppliedCoupon | null;
  rewardPointsEarned: number;
}

export interface AppliedCoupon {
  code: string;
  type: 'percent' | 'fixed';
  /** For percent: 0–100. For fixed: amount in dollars. */
  value: number;
  discountCents: number;
}

export class CartPricingError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const MAX_QTY_PER_LINE = 50; // sanity guard, real limits are inventory-driven
const MAX_LINES = 50;

function toCents(dollars: unknown): number {
  const n = typeof dollars === 'number' ? dollars : Number(dollars);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function toDollars(cents: number): number {
  return Math.round(cents) / 100;
}

function pickProductKey(item: CartLineInput): string | null {
  return (
    item.productId ||
    item.catalogObjectId ||
    item.variationId ||
    item.id ||
    null
  );
}

interface UnifiedProductDoc {
  id: string;
  name: string;
  description?: string;
  price?: number;
  priceCents?: number;
  rewardPoints?: number;
  category?: string;
  image?: string;
  inStock?: boolean;
  squareIsArchived?: boolean;
  squareEcomAvailable?: boolean;
  variations?: Array<{
    id: string;
    name?: string;
    price?: number;
    priceCents?: number;
  }>;
}

interface CouponDoc {
  code: string;
  type?: 'percent' | 'fixed' | 'percentage' | 'amount';
  value?: number;
  discountPercent?: number;
  discountAmount?: number;
  minPurchase?: number;
  maxUses?: number;
  usedCount?: number;
  isUsed?: boolean;
  isActive?: boolean;
  expiresAt?: Date | string | null;
}

function resolveVariation(
  product: UnifiedProductDoc,
  variationId: string | undefined | null
) {
  const variations = Array.isArray(product.variations) ? product.variations : [];
  if (variationId) {
    return variations.find((v) => v.id === variationId) || null;
  }
  return variations[0] || null;
}

function unitPriceCentsFromProduct(
  product: UnifiedProductDoc,
  variationId: string | undefined | null
): number {
  const v = resolveVariation(product, variationId);
  if (v && typeof v.priceCents === 'number') return v.priceCents;
  if (v && typeof v.price === 'number') return toCents(v.price);
  if (typeof product.priceCents === 'number') return product.priceCents;
  if (typeof product.price === 'number') return toCents(product.price);
  return 0;
}

function isProductPurchasable(product: UnifiedProductDoc, isPreorder = false): boolean {
  if (product.squareIsArchived === true) return false;
  if (product.squareEcomAvailable === false) return false;
  // Preorder items are made-to-order — inStock doesn't apply
  if (!isPreorder && product.inStock === false) return false;
  return true;
}

function validateQuantity(rawQty: unknown): number {
  const n = Number(rawQty);
  if (!Number.isFinite(n)) {
    throw new CartPricingError('INVALID_QUANTITY', 'Quantity must be a number');
  }
  if (!Number.isInteger(n)) {
    throw new CartPricingError('INVALID_QUANTITY', 'Quantity must be a whole number');
  }
  if (n <= 0) {
    throw new CartPricingError('INVALID_QUANTITY', 'Quantity must be positive');
  }
  if (n > MAX_QTY_PER_LINE) {
    throw new CartPricingError(
      'QUANTITY_TOO_LARGE',
      `Quantity exceeds per-line limit of ${MAX_QTY_PER_LINE}`
    );
  }
  return n;
}

/**
 * Look up catalog records for every product key in the cart in one round trip.
 */
async function loadCatalog(
  productKeys: string[],
  variationKeys: string[]
): Promise<Map<string, UnifiedProductDoc>> {
  const { db } = await connectToDatabase();
  const docs = (await db
    .collection('unified_products')
    .find({
      $or: [
        { id: { $in: productKeys } },
        { squareId: { $in: productKeys } },
        { 'variations.id': { $in: variationKeys } },
      ],
    })
    .toArray()) as unknown as UnifiedProductDoc[];

  const byKey = new Map<string, UnifiedProductDoc>();
  for (const doc of docs) {
    if (doc.id) byKey.set(doc.id, doc);
    if (Array.isArray(doc.variations)) {
      for (const v of doc.variations) {
        if (v?.id) byKey.set(v.id, doc);
      }
    }
  }
  return byKey;
}

async function loadAndValidateCoupon(
  code: string,
  subtotalCents: number
): Promise<AppliedCoupon | null> {
  if (!code) return null;
  const { db } = await connectToDatabase();
  const doc = (await db
    .collection('coupons')
    .findOne({ code: code.toUpperCase() })) as CouponDoc | null;

  if (!doc) {
    throw new CartPricingError('COUPON_INVALID', 'Coupon code not recognized');
  }
  if (doc.isActive === false) {
    throw new CartPricingError('COUPON_INACTIVE', 'Coupon is no longer active');
  }
  if (doc.isUsed === true) {
    throw new CartPricingError('COUPON_USED', 'Coupon has already been used');
  }
  if (
    typeof doc.maxUses === 'number' &&
    typeof doc.usedCount === 'number' &&
    doc.usedCount >= doc.maxUses
  ) {
    throw new CartPricingError('COUPON_EXHAUSTED', 'Coupon has reached usage limit');
  }
  if (doc.expiresAt) {
    const expiresAt = new Date(doc.expiresAt);
    if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
      throw new CartPricingError('COUPON_EXPIRED', 'Coupon has expired');
    }
  }
  const minPurchaseCents = toCents(doc.minPurchase || 0);
  if (subtotalCents < minPurchaseCents) {
    throw new CartPricingError(
      'COUPON_MIN_NOT_MET',
      `Order must be at least $${toDollars(minPurchaseCents).toFixed(2)} to use this coupon`
    );
  }

  const type: 'percent' | 'fixed' =
    doc.type === 'percent' || doc.type === 'percentage'
      ? 'percent'
      : 'fixed';
  const value =
    type === 'percent'
      ? Number(doc.value ?? doc.discountPercent ?? 0)
      : Number(doc.value ?? doc.discountAmount ?? 0);

  if (!Number.isFinite(value) || value < 0) {
    throw new CartPricingError('COUPON_INVALID', 'Coupon has invalid value');
  }
  if (type === 'percent' && value > 100) {
    throw new CartPricingError('COUPON_INVALID', 'Coupon percent exceeds 100');
  }

  let discountCents = 0;
  if (type === 'percent') {
    discountCents = Math.floor((subtotalCents * value) / 100);
  } else {
    discountCents = toCents(value);
  }
  // Never discount more than the subtotal.
  if (discountCents > subtotalCents) discountCents = subtotalCents;

  return {
    code: doc.code.toUpperCase(),
    type,
    value,
    discountCents,
  };
}

/**
 * Rebuild a normalized, server-authoritative pricing object for a cart.
 * Throws `CartPricingError` on any tampering / validation failure.
 */
export async function priceCart(input: PriceCartInput): Promise<PricedCart> {
  if (!input || !Array.isArray(input.items) || input.items.length === 0) {
    throw new CartPricingError('CART_EMPTY', 'Cart is empty');
  }
  if (input.items.length > MAX_LINES) {
    throw new CartPricingError(
      'CART_TOO_LARGE',
      `Cart exceeds ${MAX_LINES}-line limit`
    );
  }

  // Collect every plausible lookup key so we can do one Mongo query.
  const productKeys: string[] = [];
  const variationKeys: string[] = [];
  for (const item of input.items) {
    const key = pickProductKey(item);
    if (!key) {
      throw new CartPricingError(
        'CART_ITEM_NO_ID',
        'Cart item is missing a product identifier'
      );
    }
    productKeys.push(key);
    if (item.variationId) variationKeys.push(item.variationId);
  }

  const catalog = await loadCatalog(productKeys, variationKeys);

  let subtotalCents = 0;
  let rewardPointsEarned = 0;
  const pricedItems: PricedLineItem[] = [];

  for (const item of input.items) {
    const key = pickProductKey(item)!;
    const product = catalog.get(key);
    if (!product) {
      throw new CartPricingError(
        'PRODUCT_NOT_FOUND',
        `Product not found in catalog: ${key}`,
        404,
        { key }
      );
    }
    if (!isProductPurchasable(product, !!item.isPreorder)) {
      throw new CartPricingError(
        'PRODUCT_UNAVAILABLE',
        `Product is not currently available: ${product.name}`,
        409,
        { productId: product.id }
      );
    }

    const qty = validateQuantity(item.quantity);
    const variation = resolveVariation(product, item.variationId);
    const unitPriceCents = unitPriceCentsFromProduct(product, item.variationId);

    if (unitPriceCents <= 0) {
      // We refuse to silently make a paid item free.
      throw new CartPricingError(
        'PRODUCT_PRICE_INVALID',
        `Catalog price missing for ${product.name}`,
        409,
        { productId: product.id }
      );
    }

    const lineTotalCents = unitPriceCents * qty;
    subtotalCents += lineTotalCents;

    const productRewardPoints =
      typeof product.rewardPoints === 'number' ? product.rewardPoints : 0;
    rewardPointsEarned += productRewardPoints * qty;

    pricedItems.push({
      id: product.id,
      productId: product.id,
      variationId: variation?.id ?? item.variationId ?? null,
      catalogObjectId: item.catalogObjectId ?? null,
      name: product.name,
      subtitle: variation?.name,
      unitPriceCents,
      unitPrice: toDollars(unitPriceCents),
      quantity: qty,
      lineTotalCents,
      lineTotal: toDollars(lineTotalCents),
      rewardPoints: productRewardPoints,
      isPreorder: !!item.isPreorder,
      marketExclusive: !!item.marketExclusive,
      category: item.category || product.category,
      size: item.size,
      image: item.image || product.image,
      squareProductUrl: item.squareProductUrl,
    });
  }

  const appliedCoupon = input.couponCode
    ? await loadAndValidateCoupon(input.couponCode, subtotalCents)
    : null;
  const discountCents = appliedCoupon?.discountCents ?? 0;

  const deliveryFeeCents = Math.max(0, Math.round(input.deliveryFeeCents ?? 0));

  // Tip sanity: never negative; cap at 50% of (subtotal + delivery) so a
  // tampered tip can't 10x the order.
  let tipCents = Math.max(0, Math.round(input.tipCents ?? 0));
  const tipCap = Math.floor((subtotalCents + deliveryFeeCents) / 2);
  if (tipCents > tipCap) tipCents = tipCap;

  const taxCents = 0; // reserved

  const totalCents = Math.max(
    0,
    subtotalCents - discountCents + deliveryFeeCents + tipCents + taxCents
  );

  return {
    items: pricedItems,
    subtotalCents,
    discountCents,
    deliveryFeeCents,
    tipCents,
    taxCents,
    totalCents,
    subtotal: toDollars(subtotalCents),
    discount: toDollars(discountCents),
    deliveryFee: toDollars(deliveryFeeCents),
    tip: toDollars(tipCents),
    tax: toDollars(taxCents),
    total: toDollars(totalCents),
    currency: 'USD',
    appliedCoupon,
    rewardPointsEarned,
  };
}
