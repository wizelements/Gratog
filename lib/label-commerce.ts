import { getProductBySlugOrId, normalizeProductKey, toStorefrontProduct } from '@/data/products';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';

export const LABEL_QUANTITY_MIN = 1;
export const LABEL_QUANTITY_MAX = 6;

const LABEL_ALIASES: Record<string, string> = {
  'pineapple-mango': 'pineapple-mango-lemonade',
  'floral-tide-gel': 'floral-tide',
  'healing-harmony-gel': 'healing-harmony',
};
const UNRECONCILED_ITEM_IDS = new Set(['F2YVC7OVRYJU575JXROKFHFT']);

export type LabelProductSnapshot = {
  slug: string;
  name: string;
  category: string;
  price: number | null;
  priceCents: number | null;
  priceVerified: boolean;
  size: string;
  ingredients: string[];
  squareVariationId?: string;
  source?: string;
};

export type LabelProductResolution = {
  // A printed label is not an independently payable order.
  payable: false;
  product: LabelProductSnapshot | null;
  productPath: string | null;
  reason: 'canonical_checkout_required' | 'not_found' | 'inactive' | 'identity_unverified';
};

export function normalizeLabelQuantity(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? '1'), 10);
  if (!Number.isFinite(parsed)) return LABEL_QUANTITY_MIN;
  return Math.min(LABEL_QUANTITY_MAX, Math.max(LABEL_QUANTITY_MIN, parsed));
}

function priceCents(source: any): number | null {
  const cents = source?.priceCents;
  if (typeof cents === 'number' && Number.isSafeInteger(cents) && cents > 0) return cents;
  const dollars = source?.price;
  if (typeof dollars !== 'number' || !Number.isFinite(dollars) || dollars <= 0) return null;
  const converted = Math.round(dollars * 100);
  return Number.isSafeInteger(converted) ? converted : null;
}

function sourceMatchesLabel(source: any, key: string) {
  return [source?.slug, source?.id, source?.name, source?.curatedProductId]
    .map(normalizeProductKey).filter(Boolean).includes(key);
}

export function resolveLabelProductFromCatalog(value: unknown, liveProducts: any[] = []): LabelProductResolution {
  const rawKey = normalizeProductKey(value);
  const key = LABEL_ALIASES[rawKey] || rawKey;
  const unavailable = (reason: 'not_found' | 'identity_unverified'): LabelProductResolution =>
    ({ payable: false, product: null, productPath: null, reason });
  if (!key || key.length > 120) return unavailable('not_found');

  const matches = liveProducts.filter(product => sourceMatchesLabel(product, key));
  // Name resemblance cannot collapse separate Square objects into one.
  if (new Set(matches.map(product => product.id || product.slug)).size > 1) {
    return unavailable('identity_unverified');
  }
  let source = matches[0];
  const fromLiveCatalog = Boolean(source);
  if (!source) {
    const curated = getProductBySlugOrId(key);
    source = curated ? toStorefrontProduct(curated) : null;
  }
  if (!source) return unavailable('not_found');
  if (UNRECONCILED_ITEM_IDS.has(source.id) || UNRECONCILED_ITEM_IDS.has(source.squareId)) {
    return unavailable('identity_unverified');
  }

  const slug = normalizeProductKey(source.slug || source.id || source.name);
  if (!slug || slug.length > 120) return unavailable('not_found');
  const category = String(source.category || source.categoryLabel || 'market');
  const inactive = ['inactive', 'sold_out'].includes(String(source.weeklyStatus || '').toLowerCase()) ||
    ['inactive', 'sold_out'].includes(String(source.inventoryStatus || '').toLowerCase()) ||
    category.toLowerCase() === 'inactive' || source.squareIsArchived === true;
  const variations = Array.isArray(source.variations) ? source.variations : [];
  const requestedVariation = source.variationId || source.squareData?.variationId || source.catalogObjectId;
  const variation = variations.find((v: any) => v.id === requestedVariation) || variations[0];
  const variationId = typeof variation?.id === 'string' && /^[A-Z0-9]{20,}$/i.test(variation.id)
    ? variation.id : undefined;
  const cents = priceCents(source);
  const stock = source.currentStock ?? source.stock;
  const priceVerified = Boolean(fromLiveCatalog && !inactive && source.checkoutReady === true &&
    source.inStock !== false && typeof stock === 'number' && Number.isSafeInteger(stock) && stock > 0 &&
    variationId && cents !== null && priceCents(variation) === cents);

  return {
    payable: false,
    product: {
      slug, name: String(source.name || key), category,
      price: priceVerified && cents !== null ? cents / 100 : null,
      priceCents: priceVerified ? cents : null,
      priceVerified,
      size: String(source.size || variation?.name || source.sizes?.[0] || 'Market item'),
      ingredients: Array.isArray(source.ingredients)
        ? source.ingredients.map((ingredient: any) => typeof ingredient === 'string' ? ingredient : ingredient?.name)
          .filter(Boolean).map(String) : [],
      squareVariationId: variationId,
      source: source.source,
    },
    productPath: inactive ? null : `/product/${encodeURIComponent(slug)}`,
    reason: inactive ? 'inactive' : 'canonical_checkout_required',
  };
}

export async function resolveLabelProduct(value: unknown): Promise<LabelProductResolution> {
  // This deployment's guarded catalog authority prevents Preview from reading
  // production through a hard-coded public origin. Curated outage fallback
  // can supply product copy only, never price or purchase eligibility.
  let products: any[] = [];
  try {
    const snapshot = await getStorefrontCatalogSnapshot({});
    products = Array.isArray(snapshot?.products) ? snapshot.products : [];
  } catch { /* Curated product copy below is explicitly non-payable. */ }
  return resolveLabelProductFromCatalog(value, products);
}
