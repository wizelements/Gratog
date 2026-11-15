import type { MarketQrItem } from '@/lib/market-qr-policy';

export type FlavorDirection = 'tropical' | 'fresh-herbs' | 'bright-citrus';
export type IngredientToAvoid = 'none' | 'ginger' | 'pineapple' | 'sea-moss';

const FLAVOR_SIGNALS: Record<FlavorDirection, readonly string[]> = {
  tropical: ['passion', 'guava', 'pineapple', 'melon', 'watermelon', 'strawberry'],
  'fresh-herbs': ['mint', 'basil', 'parsley', 'beet'],
  'bright-citrus': ['lemon', 'lime', 'ginger'],
};

const AVOID_SIGNALS: Record<Exclude<IngredientToAvoid, 'none'>, string> = {
  ginger: 'ginger',
  pineapple: 'pineapple',
  'sea-moss': 'sea moss',
};

export function findMarketFlavors(
  products: readonly MarketQrItem[],
  direction: FlavorDirection,
  avoid: IngredientToAvoid,
): MarketQrItem[] {
  const signals = FLAVOR_SIGNALS[direction];
  const exclusion = avoid === 'none' ? '' : AVOID_SIGNALS[avoid];
  return products
    .filter((item) => {
      if (item.kind !== 'lemonade' || item.availability !== 'ask_at_booth') return false;
      // No safe inference from an unknown ingredient list.
      if (!item.ingredients?.length) return false;
      const ingredients = item.ingredients.join(' ').toLowerCase();
      return !exclusion || !ingredients.includes(exclusion);
    })
    .map((item, index) => ({
      item,
      index,
      score: signals.filter(signal =>
        item.ingredients.some(ingredient => ingredient.toLowerCase().includes(signal))
      ).length,
    }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map(candidate => candidate.item);
}
