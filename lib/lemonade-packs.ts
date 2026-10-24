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
  const cents = typeof line.unitPriceCents === 'number' ? line.unitPriceCents
    : typeof line.priceCents === 'number' ? line.priceCents
    : typeof line.price === 'number' ? Math.round(line.price * 100) : null;
  const size = String(line.subtitle || line.variantLabel || line.size || '').trim();
  return known && cents === LEMONADE_UNIT_CENTS &&
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
  const eligibleBottles = lines.reduce((n, item) =>
    n + (isApprovedLemonadeLine(item) && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0
      ? Number(item.quantity) : 0), 0);
  let best = { discountCents: 0, fourPacks: 0, sixPacks: 0, eligibleBottles };
  for (let sixPacks = 0; sixPacks <= Math.floor(eligibleBottles / 6); sixPacks++) {
    const fourPacks = Math.floor((eligibleBottles - 6 * sixPacks) / 4);
    const discountCents = sixPacks * 895 + fourPacks * 397;
    if (discountCents > best.discountCents) {
      best = { discountCents, fourPacks, sixPacks, eligibleBottles };
    }
  }
  return best;
}
