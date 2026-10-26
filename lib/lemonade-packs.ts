/**
 * Merchant-approved lemonade bundle promotion.
 * Both customer totals and server-authoritative prices use this pure policy.
 * Never discount an unidentified beverage or an unapproved size.
 */
export const LEMONADE_UNIT_CENTS = 1199;
export const LEMONADE_PACKS = Object.freeze([
  { size: 4, priceCents: 4399, regularCents: 4796, savingsCents: 397 },
  { size: 6, priceCents: 6299, regularCents: 7194, savingsCents: 895 },
] as const);

const ALLOWED = new Set([
  'strawberry-bliss', 'pineapple-mango', 'pineapple-mango-lemonade',
  'pineapple-basil', 'calm-waters', 'supplemint', 'strawberry-rita',
  'kissed-by-gods', 'gracious-roots', 'melon-rita',
]);

const normalize = (v: unknown) => typeof v === 'string'
  ? v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  : '';

type PackLine = {
  name?: unknown; slug?: unknown; curatedProductId?: unknown; id?: unknown;
  productId?: unknown; category?: unknown; subtitle?: unknown; size?: unknown;
  variantLabel?: unknown; quantity?: unknown; unitPriceCents?: unknown;
  priceCents?: unknown; price?: unknown;
};
export function isApprovedLemonadeLine(line: PackLine): boolean {
  const ids = [line.curatedProductId, line.slug, line.name, line.id, line.productId]
    .map(normalize);
  const known = ids.some((id) => ALLOWED.has(id));
  const category = normalize(line.category);
  const isLemonadeCategory = !category || category === 'lemonade' || category === 'lemonades' ||
    category.startsWith('lemonade-') || category.endsWith('-lemonades');
  const cents = typeof line.unitPriceCents === 'number' ? line.unitPriceCents
    : typeof line.priceCents === 'number' ? line.priceCents
    : typeof line.price === 'number' ? Math.round(line.price * 100) : null;
  const size = String(line.subtitle || line.variantLabel || line.size || '').trim();
  return known && isLemonadeCategory && cents === LEMONADE_UNIT_CENTS &&
    (!size || /^(16\s*oz|regular|standard|market item)(?:\b|$)/i.test(size));
}

/**
 * Optimize across any number of qualifying bottles, never leaving a 4-pack
 * when the same quantity could receive a greater six-pack discount.
 * Other items and extra singles are full price. Coupon stacking is prohibited.
 */
export function calculateLemonadePackDiscount(lines: PackLine[]): {
  discountCents: number; fourPacks: number; sixPacks: number; eligibleBottles: number;
} {
  const byFlavor = new Map<string, number>();
  let eligibleBottles = 0;
  for (const line of lines) {
    const quantity = Number(line.quantity);
    if (!isApprovedLemonadeLine(line) || !Number.isInteger(quantity) || quantity <= 0) continue;
    const flavor = normalize(line.name || line.curatedProductId || line.slug ||
      line.productId || line.id);
    if (!flavor) continue;
    eligibleBottles += quantity;
    byFlavor.set(flavor, (byFlavor.get(flavor) || 0) + quantity);
  }

  let best = { discountCents: 0, fourPacks: 0, sixPacks: 0, eligibleBottles };
  if (byFlavor.size < 2) return best;

  // Each pack needs at least two distinct flavors. The maximum that any
  // single flavor can occupy in a selection of P packs and Q bottles is Q-P.
  // Count only quantities we can actually allocate to mixed packs, not just
  // total bottles. This also prevents 8 of A + 1 of B from becoming two
  // fake mixed four-packs.
  for (let sixPacks = 0; sixPacks <= Math.floor(eligibleBottles / 6); sixPacks++) {
    for (let fourPacks = 0;
      6 * sixPacks + 4 * fourPacks <= eligibleBottles; fourPacks++) {
      const packCount = sixPacks + fourPacks;
      if (packCount === 0) continue;
      const packedBottles = 6 * sixPacks + 4 * fourPacks;
      const maxFromOneFlavor = packedBottles - packCount;
      const allocatable = [...byFlavor.values()].reduce((sum, count) =>
        sum + Math.min(count, maxFromOneFlavor), 0);
      if (allocatable < packedBottles) continue;
      const discountCents = sixPacks * 895 + fourPacks * 397;
      if (discountCents > best.discountCents) {
        best = { discountCents, fourPacks, sixPacks, eligibleBottles };
      }
    }
  }
  return best;
}
