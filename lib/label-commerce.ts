import { getProductBySlugOrId, normalizeProductKey } from '@/data/products';

export const LABEL_QUANTITY_MIN = 1;
export const LABEL_QUANTITY_MAX = 6;

export type LabelProductSnapshot = {
  slug: string;
  name: string;
  category: string;
  price: number;
  priceCents: number;
  size: string;
  ingredients: string[];
};

export type LabelProductResolution =
  | { payable: true; product: LabelProductSnapshot; reason: null }
  | { payable: false; product: LabelProductSnapshot | null; reason: 'not_found' | 'no_price' | 'inactive' };

export function normalizeLabelQuantity(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? '1'), 10);
  if (!Number.isFinite(parsed)) return LABEL_QUANTITY_MIN;
  return Math.min(LABEL_QUANTITY_MAX, Math.max(LABEL_QUANTITY_MIN, parsed));
}

export function resolveLabelProduct(value: unknown): LabelProductResolution {
  const source = getProductBySlugOrId(value);
  if (!source) {
    return { payable: false, product: null, reason: 'not_found' };
  }

  const price = Number(source.price);
  const priceCents = Number.isFinite(price) ? Math.round(price * 100) : 0;
  const product: LabelProductSnapshot = {
    slug: normalizeProductKey(source.slug || source.id),
    name: source.name,
    category: String(source.category || 'market'),
    price: Number.isFinite(price) ? price : 0,
    priceCents,
    size: source.sizes?.[0] || 'Market item',
    ingredients: Array.isArray(source.ingredients) ? source.ingredients.map(String) : [],
  };

  if (source.category === 'inactive' || source.weeklyStatus === 'inactive') {
    return { payable: false, product, reason: 'inactive' };
  }

  if (priceCents <= 0) {
    return { payable: false, product, reason: 'no_price' };
  }

  // Deliberately independent of the weekly-menu flag. A bottle in a customer's
  // hand remains payable even when the online market menu rotates.
  return { payable: true, product, reason: null };
}
