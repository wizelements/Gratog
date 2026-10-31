/**
 * Merchant-approved base prices in USD cents.
 *
 * Identifiers are matched exactly after case/spacing normalization. A listing
 * with a known merchant-approved SKU must not inherit a stale Square/Mongo
 * price. Unknown SKUs continue to use their catalog prices; never guess.
 *
 * Update this ledger only from an explicitly authorized owner price decision.
 */
export const APPROVED_UNIT_PRICES_CENTS = Object.freeze({
  'strawberry-bliss': 1199,
  'pineapple-mango': 1199,
  'pineapple-mango-lemonade': 1199,
  'pineapple-basil': 1199,
  'calm-waters': 1199,
  'supplemint': 1199,
  'gracious-roots': 1199,
  'kissed-by-gods': 1199,
  'melon-rita': 1199,
  'passion-guava-pineapple-lemonade': 1199,
  'passion-fruit-guava-pineapple-lemon': 1199,
  'passion-fruit-guava-pineapple-lemonade': 1199,
  'strawberry-rita': 1199,
  'blue-lotus': 3600,
  'blue-lotus-gel': 3600,
  'apg': 1299,
  'always-pursue-gratitude': 1299,
  'herbal-vibe': 1599,
  'herbal-vibes': 1599,
  'elderberry-apple-gel': 3600,
  'floral-tide-gel': 3600,
  'floral-tide': 3600,
  'soursop-chai-gel': 3600,
} as const);

type ProductIdentity = { id?: unknown; slug?: unknown; name?: unknown; curatedProductId?: unknown; squareId?: unknown };
const APPROVED_BY_SQUARE_ID: Record<string, number> = {
  DSROEB4HMZK63V7IGBH6SSJH: 3600, // Blue Lotus, approved 16 oz ONLY
};

function normalize(value: unknown): string {
  return typeof value === 'string'
    ? value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : '';
}

export function approvedUnitPriceCents(product: ProductIdentity | null | undefined): number | null {
  if (!product) return null;
  const id = String(product.id || product.squareId || '');
  if (Object.prototype.hasOwnProperty.call(APPROVED_BY_SQUARE_ID, id)) {
    return APPROVED_BY_SQUARE_ID[id];
  }
  for (const source of [product.curatedProductId, product.slug, product.name, product.id]) {
    const key = normalize(source);
    const price = APPROVED_UNIT_PRICES_CENTS[key as keyof typeof APPROVED_UNIT_PRICES_CENTS];
    if (price !== undefined) return price;
  }
  return null;
}

export function isApprovedBlueLotus(product: ProductIdentity | null | undefined): boolean {
  if (!product) return false;
  return String(product.id || product.squareId || '') === 'DSROEB4HMZK63V7IGBH6SSJH' ||
    [product.curatedProductId, product.slug, product.name, product.id]
      .some((v) => ['blue-lotus', 'blue-lotus-gel'].includes(normalize(v)));
}

/**
 * Corrections only for merchant-confirmed default SKUs. For products with
 * multiple size options, unknown variants must be reviewed before checkout.
 */
export function applyMerchantPrice<T extends ProductIdentity & {
  price?: number; priceCents?: number; variations?: Array<Record<string, any>>;
}>(product: T): T {
  const cents = approvedUnitPriceCents(product);
  if (cents === null) return product;
  const variants = product.variations;
  const isBlueLotus = isApprovedBlueLotus(product);
  const filtered = isBlueLotus && Array.isArray(variants)
    ? variants.filter((v) => /^16\s*oz(?:\b|$)/i.test(String(v.name || '').trim()))
    : variants;
  const patched = Array.isArray(filtered) ? filtered.map((v) => {
    const name = String(v.name || '').trim();
    const approvedVariant = isBlueLotus || !name || /^(16\s*oz|regular|standard|market item)(?:\b|$)/i.test(name);
    return approvedVariant ? { ...v, ...(typeof v.price === 'number' ? { price: cents / 100 } : {}), priceCents: cents } : v;
  }) : filtered;
  return {
    ...product,
    price: cents / 100,
    priceCents: cents,
    ...(Array.isArray(patched) ? { variations: patched } : {}),
    ...(isBlueLotus && Array.isArray(variants) && patched?.length === 0
      ? { checkoutReady: false, checkoutUnavailableReason: 'Approved 16 oz size unavailable. Payment disabled pending catalog review.' }
      : {}),
  } as T;
}

/** Reject existing orders created before a price correction before taking payment. */
export function findApprovedOrderPriceMismatch(lines: unknown): {
  product: string; expectedCents: number; actualCents: number | null;
} | null {
  if (!Array.isArray(lines)) return null;
  for (const line of lines) {
    if (!line || typeof line !== 'object') continue;
    const item = line as Record<string, unknown>;
    const identity = {
      id: item.productId || item.id,
      slug: item.slug,
      name: item.name,
    };
    const expectedCents = approvedUnitPriceCents(identity);
    if (expectedCents === null) continue;
    const cents = typeof item.priceCents === 'number' && Number.isInteger(item.priceCents)
      ? item.priceCents
      : typeof item.price === 'number' && Number.isFinite(item.price)
        ? Math.round(item.price * 100)
        : null;
    const size = String(item.subtitle || item.size || '').trim();
    const approvedSize = !size || /^(16\s*oz|regular|standard|market item)(?:\b|$)/i.test(size);
    const gelSample = !isApprovedBlueLotus(identity) &&
      /(?:gel|floral tide)$/.test(String(item.name || '').trim().toLowerCase()) &&
      /^2\s*oz(?:\b|$)/i.test(size);
    // Only Blue Lotus has no sample SKU. Samples of other gels retain their
    // explicitly listed prices, rather than inheriting the 16 oz jar price.
    if (gelSample) continue;
    if (cents !== expectedCents || !approvedSize) {
      return { product: String(item.name || item.productId || 'Item'), expectedCents, actualCents: cents };
    }
  }
  return null;
}
