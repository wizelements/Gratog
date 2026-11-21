/**
 * Proposed market lemonade bundle quotes. This module does NOT change checkout,
 * payment, inventory, fulfillment, or the current $60 preorder minimum.
 *
 * Only use this with the SERVER-RESOLVED current storefront catalog. Client
 * product names, prices and eligibility flags must never be trusted.
 * Keep checkout feature-disabled until merchant margin approval and a real
 * Square sandbox payment/fulfillment regression test have passed.
 */
export const LEMONADE_BUNDLE_OFFERS = Object.freeze({
  4: Object.freeze({ size: 4, priceCents: 4200, unitPriceCents: 1050, regularTotalCents: 4796, savingsCents: 596 }),
  6: Object.freeze({ size: 6, priceCents: 6000, unitPriceCents: 1000, regularTotalCents: 7194, savingsCents: 1194 }),
});

export type LemonadeBundleSize = keyof typeof LEMONADE_BUNDLE_OFFERS;

const ELIGIBLE_CANONICAL_FLAVORS = new Set([
  'strawberry-bliss',
  'pineapple-mango',
  'pineapple-basil',
  'calm-waters',
  'supplemint',
  'gracious-roots',
  'kissed-by-gods',
  'melon-rita',
  'passion-guava-pineapple-lemonade',
  'strawberry-rita',
]);

const FLAVOR_ALIASES: Record<string, string> = Object.freeze({
  'pineapple-mango-lemonade': 'pineapple-mango',
  'passion-fruit-guava-pineapple-lemon': 'passion-guava-pineapple-lemonade',
  'passion-fruit-guava-pineapple-lemonade': 'passion-guava-pineapple-lemonade',
});

export interface CatalogLemonadeCandidate {
  id: string;
  name: string;
  slug?: string;
  curatedProductId?: string;
  price?: number;
  priceCents?: number;
  variationId?: string;
  catalogObjectId?: string;
  variations?: Array<{ id: string; name?: string }>;
  available?: boolean;
  soldOut?: boolean;
  squareIsArchived?: boolean;
  isArchived?: boolean;
  checkoutReady?: boolean;
  inventoryStatus?: string;
  weeklyStatus?: string;
  inStock?: boolean;
  preorderOnly?: boolean;
  activeWeeklyMenu?: boolean;
}

export interface LemonadeBundleQuote {
  size: LemonadeBundleSize;
  priceCents: number;
  regularTotalCents: number;
  savingsCents: number;
  items: Array<{
    id: string;
    name: string;
    canonicalFlavor: string;
    variationId: string;
    unitPriceCents: number;
    quantity: 1;
  }>;
}

type QuoteResult = { valid: true; quote: LemonadeBundleQuote } |
  { valid: false; code: string; error: string };

function normalize(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-+$/g, '')
    : '';
}

function canonicalFlavor(product: CatalogLemonadeCandidate): string {
  const raw = normalize(product.curatedProductId || product.slug || product.name);
  return FLAVOR_ALIASES[raw] || raw;
}

function isAvailableForFuturePreorder(p: CatalogLemonadeCandidate): boolean {
  if (p.available === false || p.soldOut === true || p.isArchived === true ||
      p.squareIsArchived === true || p.checkoutReady === false ||
      p.inventoryStatus === 'inactive' || p.inventoryStatus === 'sold_out' ||
      p.weeklyStatus === 'inactive' || p.weeklyStatus === 'sold_out') return false;
  // Out-of-stock ready-made bottles can be sold for future batches only when
  // an explicit, active merchant-made-to-order designation exists.
  return p.inStock !== false || (
    p.preorderOnly === true && p.activeWeeklyMenu === true &&
    p.weeklyStatus === 'active'
  );
}

/** No trust in client-provided price, slug, or category: resolve IDs in catalog. */
export function quoteLemonadeBundle(
  requestedSize: unknown,
  requestedProductIds: unknown,
  serverCatalog: ReadonlyArray<CatalogLemonadeCandidate>,
): QuoteResult {
  if (requestedSize !== 4 && requestedSize !== 6) {
    return { valid: false, code: 'BUNDLE_SIZE_INVALID', error: 'Choose a four-pack or six-pack.' };
  }
  const offer = LEMONADE_BUNDLE_OFFERS[requestedSize];
  if (!Array.isArray(requestedProductIds) ||
      requestedProductIds.length !== offer.size ||
      requestedProductIds.some((id: unknown) => typeof id !== 'string' || !id || id.length > 120)) {
    return { valid: false, code: 'BUNDLE_SELECTION_INVALID', error: 'Choose the required number of different bottles.' };
  }
  if (!Array.isArray(serverCatalog)) {
    return { valid: false, code: 'CATALOG_UNAVAILABLE', error: 'The current menu is unavailable.' };
  }
  const catalogById = new Map(serverCatalog.map(p => [p.id, p]));
  const usedIds = new Set<string>();
  const usedFlavors = new Set<string>();
  const items: LemonadeBundleQuote['items'] = [];

  for (const id of requestedProductIds as string[]) {
    if (usedIds.has(id)) {
      return { valid: false, code: 'BUNDLE_DUPLICATE', error: 'Each flavor may appear only once.' };
    }
    usedIds.add(id);
    const product = catalogById.get(id);
    if (!product || !isAvailableForFuturePreorder(product)) {
      return { valid: false, code: 'BUNDLE_ITEM_UNAVAILABLE', error: 'A selected flavor is unavailable for preorder.' };
    }
    const flavor = canonicalFlavor(product);
    const listedCents = Number.isSafeInteger(product.priceCents)
      ? product.priceCents
      : typeof product.price === 'number' && Number.isFinite(product.price)
        ? Math.round(product.price * 100)
        : null;
    if (!ELIGIBLE_CANONICAL_FLAVORS.has(flavor) || listedCents !== 1199) {
      return { valid: false, code: 'BUNDLE_ITEM_INELIGIBLE', error: 'Only eligible $11.99 lemonades can be bundled.' };
    }
    if (usedFlavors.has(flavor)) {
      return { valid: false, code: 'BUNDLE_DUPLICATE', error: 'Each flavor may appear only once.' };
    }
    usedFlavors.add(flavor);
    const variation = product.variationId || product.catalogObjectId || product.variations?.[0]?.id;
    if (!variation) {
      return { valid: false, code: 'BUNDLE_VARIATION_MISSING', error: 'A selected bottle cannot be checked out yet.' };
    }
    items.push({
      id: product.id, name: product.name, canonicalFlavor: flavor,
      variationId: variation, quantity: 1, unitPriceCents: offer.unitPriceCents,
    });
  }
  return {
    valid: true,
    quote: {
      size: requestedSize, priceCents: offer.priceCents,
      regularTotalCents: offer.regularTotalCents,
      savingsCents: offer.savingsCents, items,
    },
  };
}
