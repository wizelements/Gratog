/**
 * Dedicated in-person market QR policy.
 * A menu listing, owner-reported count, and a Square product do not by
 * themselves authorize an in-person digital charge.
 */
import { getActiveMarketPickups } from '@/data/markets';
import { CURRENT_MENU } from '@/lib/square-menu-stock';
import { approvedUnitPriceCents } from '@/lib/merchant-pricing';

export const MARKET_INFORMATIONAL_CATEGORIES = Object.freeze([
  { id: 'boba', label: 'Boba & Milk Teas', detail: 'Prepared to order at the booth. Ask about current flavors, milk options and allergens.' },
  { id: 'refreshers', label: 'Refreshers', detail: 'Ask which freshly prepared refreshers are on today\'s menu.' },
  { id: 'shots', label: 'Wellness Shots', detail: 'Ask about available shot blends and ingredients at the booth.' },
  { id: 'teas', label: 'Teas & Warm Drinks', detail: 'Ask which hot and iced teas or seasonal specialties are being served.' },
  { id: 'food', label: 'Market Food & Specials', detail: 'Ask about freshly prepared food and seasonal offerings.' },
]);

const LEGACY_MARKET_IDS: Record<string, string> = {
  'serenbe-farmers-market': 'serenbe',
  'dunwoody-farmers-market': 'dunwoody',
  'sandy-springs-market': '',
};
const normalize = (value: unknown): string => String(value || '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function resolveMarketQrId(raw: unknown): string | null {
  const key = normalize(raw);
  const canonical = Object.prototype.hasOwnProperty.call(LEGACY_MARKET_IDS, key)
    ? LEGACY_MARKET_IDS[key] : key;
  return getActiveMarketPickups().some(market => market.id === canonical) ? canonical : null;
}

export interface MarketQrItem {
  slug: string;
  name: string;
  kind: 'lemonade' | 'juice' | 'gel';
  approvedPriceCents: number;
  ingredients: string[];
  allergens: string[];
  description: string;
  /** Always false until separately certified market-session checkout exists. */
  digitalPurchaseEnabled: false;
  availability: 'ask_at_booth';
}

const fallbackIngredients: Record<string, string[]> = {
  'calm-waters': ['Blue spirulina', 'Lemon', 'Ashwagandha', 'Celtic sea salt', 'Agave'],
  supplemint: ['Mint', 'Ginger', 'Lemon', 'Sea moss gel', 'Agave', 'Alkaline water'],
  'gracious-roots': ['Beet', 'Apple', 'Lemon', 'Ginger', 'Parsley', 'Pineapple', 'Sea moss gel', 'Agave', 'Alkaline water'],
  'kissed-by-gods': ['Basil', 'Chlorophyll', 'Lemon', 'Ginger', 'Sea moss gel', 'Agave', 'Alkaline water'],
  'melon-rita': ['Melon', 'Watermelon', 'Strawberry', 'Celtic sea salt', 'Lemon', 'Ginger', 'Lime', 'Sea moss gel', 'Agave', 'Alkaline water'],
  'passion-guava-pineapple': ['Passion fruit', 'Guava', 'Pineapple', 'Lemon', 'Agave', 'Alkaline water'],
  apg: ['Apple', 'Pineapple', 'Lemon', 'Ginger'],
  'herbal-vibe': ['Apple', 'Pineapple', 'Lemon', 'Ginger', 'Oregano', 'Oregano oil', 'Mint'],
};

function cleanIngredients(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((ingredient) => {
    if (typeof ingredient === 'string') return ingredient.trim();
    if (ingredient && typeof ingredient === 'object') return String((ingredient as { name?: unknown }).name || '').trim();
    return '';
  }).filter(Boolean).slice(0, 24);
}

export function buildMarketQrMenu(products: any[]): MarketQrItem[] {
  const catalog = Array.isArray(products) ? products : [];
  return CURRENT_MENU.map(target => {
    // Only explicit current merchant-approved identities can appear. A broad
    // category or Square's sellable flag is never proof of approval.
    const matches = catalog.filter(product =>
      [product?.name, product?.slug, product?.curatedProductId].some(identity =>
        target.aliases.some(alias => normalize(alias) === normalize(identity)) ||
        normalize(target.slug) === normalize(identity)));
    const live = matches.length === 1 ? matches[0] : null;
    const cents = approvedUnitPriceCents({ slug: target.slug, name: target.name });
    if (cents === null) throw new Error('MARKET_PRICE_APPROVAL_MISSING: ' + target.slug);
    const sourceIngredients = cleanIngredients(live?.ingredients);
    const ingredients = fallbackIngredients[target.slug] || sourceIngredients;
    const allergens = Array.isArray(live?.allergens)
      ? live.allergens.filter((x: unknown): x is string => typeof x === 'string').slice(0, 12)
      : [];
    return {
      slug: target.slug,
      name: target.name,
      kind: target.kind as MarketQrItem['kind'],
      approvedPriceCents: cents,
      ingredients,
      allergens,
      description: typeof live?.shortDescription === 'string' ? live.shortDescription :
        typeof live?.description === 'string' ? live.description : '',
      digitalPurchaseEnabled: false as const,
      availability: 'ask_at_booth' as const,
    };
  });
}

/**
 * A future online-market checkout must have its own session-specific ledger,
 * atomic holds and server-verified Square payments. There is deliberately no
 * cart or purchase endpoint in this read-only QR release.
 */
export function canPurchaseFromMarketQr(item: Pick<MarketQrItem, 'digitalPurchaseEnabled'>): boolean {
  return false;
}
