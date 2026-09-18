import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';
import { getProductBySlugOrId, normalizeProductKey, toStorefrontProduct } from '@/data/products';

export const LABEL_QUANTITY_MIN = 1;
export const LABEL_QUANTITY_MAX = 6;

const LABEL_ALIASES: Record<string, string> = {
  'pineapple-mango': 'pineapple-mango-lemonade',
  'floral-tide-gel': 'floral-tide',
  'healing-harmony-gel': 'healing-harmony',
};

export type LabelProductSnapshot = {
  slug: string;
  name: string;
  category: string;
  price: number;
  priceCents: number;
  size: string;
  ingredients: string[];
  squareVariationId?: string;
  source?: string;
};

export type LabelProductResolution =
  | { payable: true; product: LabelProductSnapshot; reason: null }
  | { payable: false; product: LabelProductSnapshot | null; reason: 'not_found' | 'no_price' | 'inactive' };

export function normalizeLabelQuantity(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? '1'), 10);
  if (!Number.isFinite(parsed)) return LABEL_QUANTITY_MIN;
  return Math.min(LABEL_QUANTITY_MAX, Math.max(LABEL_QUANTITY_MIN, parsed));
}

function asIngredientNames(source: any): string[] {
  if (!Array.isArray(source?.ingredients)) return [];
  return source.ingredients
    .map((ingredient: any) => typeof ingredient === 'string' ? ingredient : ingredient?.name)
    .filter(Boolean)
    .map(String);
}

function getPriceCents(source: any): number {
  if (Number.isFinite(Number(source?.priceCents)) && Number(source.priceCents) > 0) {
    return Math.round(Number(source.priceCents));
  }

  const price = Number(source?.price);
  if (Number.isFinite(price) && price > 0) {
    return Math.round(price * 100);
  }

  const firstVariation = Array.isArray(source?.variations) ? source.variations[0] : null;
  if (Number.isFinite(Number(firstVariation?.priceCents)) && Number(firstVariation.priceCents) > 0) {
    return Math.round(Number(firstVariation.priceCents));
  }

  const variationPrice = Number(firstVariation?.price);
  return Number.isFinite(variationPrice) && variationPrice > 0
    ? Math.round(variationPrice * 100)
    : 0;
}

function getSquareVariationId(source: any): string | undefined {
  const candidate =
    source?.squareData?.variationId ||
    source?.variationId ||
    source?.catalogObjectId ||
    source?.variations?.[0]?.id;

  if (!candidate) return undefined;
  const value = String(candidate);
  if (value.startsWith('tog-')) return undefined;
  return value.length > 20 && /^[A-Z0-9]+$/i.test(value) ? value : undefined;
}

function sourceMatchesLabel(source: any, key: string) {
  const keys = [source?.slug, source?.id, source?.name, source?.curatedProductId]
    .map(normalizeProductKey)
    .filter(Boolean);
  return keys.includes(key);
}

export function resolveLabelProductFromCatalog(value: unknown, liveProducts: any[] = []): LabelProductResolution {
  const rawKey = normalizeProductKey(value);
  const key = LABEL_ALIASES[rawKey] || rawKey;
  if (!key) return { payable: false, product: null, reason: 'not_found' };

  let source = liveProducts.find((product) => sourceMatchesLabel(product, key));

  if (!source) {
    const curated = getProductBySlugOrId(key);
    source = curated ? toStorefrontProduct(curated) : null;
  }

  if (!source) return { payable: false, product: null, reason: 'not_found' };

  const priceCents = getPriceCents(source);
  const price = priceCents / 100;
  const slug = normalizeProductKey(source.slug || source.id || source.name || key);
  const weeklyStatus = String(source.weeklyStatus || '').toLowerCase();
  const inventoryStatus = String(source.inventoryStatus || '').toLowerCase();
  const category = String(source.category || source.categoryLabel || 'market');

  const product: LabelProductSnapshot = {
    slug,
    name: String(source.name || key),
    category,
    price,
    priceCents,
    size: String(source.size || source.variations?.[0]?.name || source.sizes?.[0] || 'Market item'),
    ingredients: asIngredientNames(source),
    squareVariationId: getSquareVariationId(source),
    source: source.source,
  };

  if (
    weeklyStatus === 'inactive' ||
    inventoryStatus === 'inactive' ||
    category.toLowerCase() === 'inactive'
  ) {
    return { payable: false, product, reason: 'inactive' };
  }

  if (priceCents <= 0) {
    return { payable: false, product, reason: 'no_price' };
  }

  // Deliberately independent of activeWeeklyMenu / soldOut. A physical item
  // already in a customer's hand remains payable even when online merchandising
  // changes. Live Square price/variation data wins whenever available.
  return { payable: true, product, reason: null };
}

export async function resolveLabelProduct(value: unknown): Promise<LabelProductResolution> {
  try {
    const snapshot = await getStorefrontCatalogSnapshot({});
    return resolveLabelProductFromCatalog(value, snapshot.products || []);
  } catch {
    return resolveLabelProductFromCatalog(value, []);
  }
}
