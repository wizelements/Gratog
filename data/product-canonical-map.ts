/**
 * Product Canonical Map
 *
 * Maps legacy, duplicate, and removed product identifiers to their canonical
 * product. This is the single source of truth for deduplication when merging
 * Square catalog products with curated weekly market products.
 *
 * LIVE-06: The live public catalog previously exposed duplicate products.
 * This map ensures that any Square product matching a legacy ID, slug, or name
 * is either redirected to its canonical product or excluded from the storefront.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CanonicalStatus =
  | 'canonical'       // Active, intended public product
  | 'legacy_rename'    // Renamed product → canonical product
  | 'archived_duplicate' // Duplicate of a canonical product, now archived
  | 'removed';         // Should never appear in the public catalog

export interface CanonicalEntry {
  /** The canonical product ID (slug format, e.g. "grateful-defense"). */
  canonicalId: string;
  /** The canonical product slug (usually same as canonicalId). */
  canonicalSlug: string;
  /** The canonical display name. */
  canonicalName: string;
  /** Why this entry exists. */
  status: CanonicalStatus;
  /** Human-readable explanation. */
  reason: string;
}

// ---------------------------------------------------------------------------
// Canonical map
//
// Keys are ALL known identifiers (id, slug, name, and normalised variants)
// for legacy, duplicate, or removed products. Values describe the canonical
// product they should resolve to.
// ---------------------------------------------------------------------------

const CANONICAL_MAP: Record<string, CanonicalEntry> = {
  // ---- Legacy renames ----------------------------------------------------

  // "Grateful Guardian" was the original name for the Elderberry Ginger Shot.
  // The owner confirmed "Grateful Defense" (slug: grateful-defense) is the
  // intended public name.
  'grateful-guardian': {
    canonicalId: 'grateful-defense',
    canonicalSlug: 'grateful-defense',
    canonicalName: 'Elderberry Ginger Shot',
    status: 'legacy_rename',
    reason: 'Grateful Guardian was the original name. Owner confirmed "Grateful Defense" (Elderberry Ginger Shot) is the intended public name.',
  },
  'gratefulguardian': {
    canonicalId: 'grateful-defense',
    canonicalSlug: 'grateful-defense',
    canonicalName: 'Elderberry Ginger Shot',
    status: 'legacy_rename',
    reason: 'Normalised variant of Grateful Guardian.',
  },

  // "Elderberry Moss" is an older name for the elderberry gel path.
  // The canonical gel is "Elderberry Apple Gel" (slug: elderberry-apple-gel).
  'elderberry-moss': {
    canonicalId: 'elderberry-apple-gel',
    canonicalSlug: 'elderberry-apple-gel',
    canonicalName: 'Elderberry Apple Gel',
    status: 'legacy_rename',
    reason: 'Elderberry Moss is a legacy name. Elderberry Apple Gel is the current product.',
  },

  // "Pineapple Basil" — archived seasonal, not a rename of an active product,
  // but we record it so Square data matching this slug is filtered.
  'pineapple-basil': {
    canonicalId: 'pineapple-basil',
    canonicalSlug: 'pineapple-basil',
    canonicalName: 'Pineapple Basil',
    status: 'removed',
    reason: 'Archived seasonal product. Should not appear in the active public catalog.',
  },

  // "Apple Cranberry" — archived seasonal.
  'apple-cranberry': {
    canonicalId: 'apple-cranberry',
    canonicalSlug: 'apple-cranberry',
    canonicalName: 'Apple Cranberry',
    status: 'removed',
    reason: 'Archived seasonal product. Should not appear in the active public catalog.',
  },

  // "Rejuvenate" — discontinued catalog item.
  'rejuvenate': {
    canonicalId: 'rejuvenate',
    canonicalSlug: 'rejuvenate',
    canonicalName: 'Rejuvenate',
    status: 'removed',
    reason: 'Discontinued catalog item. Should not appear in the active public catalog.',
  },

  // ---- Archived duplicates ------------------------------------------------

  // "Blue Lotus Gel" is a duplicate of "Blue Lotus" in the Square catalog.
  // The curated data archives it; this entry ensures Square-sourced duplicates
  // are also caught.
  'blue-lotus-gel': {
    canonicalId: 'blue-lotus-gel',
    canonicalSlug: 'blue-lotus-gel',
    canonicalName: 'Blue Lotus Gel',
    status: 'archived_duplicate',
    reason: 'Blue Lotus Gel is a duplicate of Blue Lotus in the Square catalog. Archived in curated data; Square duplicates must also be filtered.',
  },
  'bluelotusgel': {
    canonicalId: 'blue-lotus-gel',
    canonicalSlug: 'blue-lotus-gel',
    canonicalName: 'Blue Lotus Gel',
    status: 'archived_duplicate',
    reason: 'Normalised variant of Blue Lotus Gel (duplicate).',
  },

  // ---- Removed products (must NEVER appear in public catalog) ------------

  // Strawberry Milk Tea / Strawberry Milk Boba — not a current product.
  // The owner confirmed it should be removed/hidden from the public catalog.
  'strawberry-milk-tea': {
    canonicalId: 'strawberry-milk-tea',
    canonicalSlug: 'strawberry-milk-tea',
    canonicalName: 'Strawberry Milk Tea',
    status: 'removed',
    reason: 'Strawberry Milk Tea is not a current Taste of Gratitude product. Owner confirmed removal from the public catalog.',
  },
  'strawberrymilktea': {
    canonicalId: 'strawberry-milk-tea',
    canonicalSlug: 'strawberry-milk-tea',
    canonicalName: 'Strawberry Milk Tea',
    status: 'removed',
    reason: 'Normalised variant of Strawberry Milk Tea.',
  },
  'strawberry-milk-boba': {
    canonicalId: 'strawberry-milk-boba',
    canonicalSlug: 'strawberry-milk-boba',
    canonicalName: 'Strawberry Milk Boba',
    status: 'removed',
    reason: 'Strawberry Milk Boba is not a current Taste of Gratitude product. Owner confirmed removal from the public catalog.',
  },
  'strawberrymilkboba': {
    canonicalId: 'strawberry-milk-boba',
    canonicalSlug: 'strawberry-milk-boba',
    canonicalName: 'Strawberry Milk Boba',
    status: 'removed',
    reason: 'Normalised variant of Strawberry Milk Boba.',
  },

  // Boba — the generic "Boba" product is intentionally archived.
  'boba': {
    canonicalId: 'boba',
    canonicalSlug: 'boba',
    canonicalName: 'Boba',
    status: 'removed',
    reason: 'Boba is intentionally archived so old catalog entries do not appear in the active weekly market menu.',
  },
  'boba-discontinued': {
    canonicalId: 'boba',
    canonicalSlug: 'boba',
    canonicalName: 'Boba',
    status: 'removed',
    reason: 'Boba (discontinued ID variant) is intentionally archived.',
  },

  // Taro — archived, not a current product.
  'taro': {
    canonicalId: 'taro',
    canonicalSlug: 'taro',
    canonicalName: 'Taro',
    status: 'removed',
    reason: 'Taro is intentionally archived so stale catalog entries do not drift into the active storefront.',
  },
  'taro-discontinued': {
    canonicalId: 'taro',
    canonicalSlug: 'taro',
    canonicalName: 'Taro',
    status: 'removed',
    reason: 'Taro (discontinued ID variant) is intentionally archived.',
  },

  // Matcha — archived, not a current product.
  'matcha': {
    canonicalId: 'matcha',
    canonicalSlug: 'matcha',
    canonicalName: 'Matcha',
    status: 'removed',
    reason: 'Matcha is intentionally archived so discontinued cafe-style products do not appear in the active market funnel.',
  },
  'matcha-discontinued': {
    canonicalId: 'matcha',
    canonicalSlug: 'matcha',
    canonicalName: 'Matcha',
    status: 'removed',
    reason: 'Matcha (discontinued ID variant) is intentionally archived.',
  },
};

// ---------------------------------------------------------------------------
// Normalisation helper (mirrors normalizeProductKey from products.ts)
// ---------------------------------------------------------------------------

function normalizeKey(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the canonical product ID for a legacy ID/slug/name, or `null` if
 * the identifier is already canonical (i.e. not in the legacy map).
 *
 * For `legacy_rename` entries, the returned ID is the active product to use
 * instead. For `archived_duplicate` and `removed` entries, the returned ID
 * is the entry's own key (the product should be filtered out of the catalog
 * entirely, not remapped).
 */
export function getCanonicalProductId(idOrSlug: string): string | null {
  const key = normalizeKey(idOrSlug);
  if (!key) return null;

  const entry = CANONICAL_MAP[key];
  if (!entry) return null;

  // Legacy renames resolve to a different canonical product.
  if (entry.status === 'legacy_rename') {
    return entry.canonicalId;
  }

  // Archived duplicates and removed products map to themselves — the caller
  // should use isRemovedProduct() to decide whether to filter them.
  return entry.canonicalId;
}

/**
 * Returns `true` for products that must NEVER appear in the public catalog.
 * This includes `removed` and `archived_duplicate` entries.
 */
export function isRemovedProduct(idOrSlug: string): boolean {
  const key = normalizeKey(idOrSlug);
  if (!key) return false;

  const entry = CANONICAL_MAP[key];
  if (!entry) return false;

  return entry.status === 'removed' || entry.status === 'archived_duplicate';
}

/**
 * Returns the full canonical entry for a product identifier, or `null` if
 * the identifier is not in the legacy map.
 */
export function getCanonicalEntry(idOrSlug: string): CanonicalEntry | null {
  const key = normalizeKey(idOrSlug);
  if (!key) return null;
  return CANONICAL_MAP[key] ?? null;
}

/**
 * Returns `true` if the identifier is a legacy rename (i.e. it maps to a
 * different canonical product that should be shown instead).
 */
export function isLegacyRename(idOrSlug: string): boolean {
  const key = normalizeKey(idOrSlug);
  if (!key) return false;
  const entry = CANONICAL_MAP[key];
  return entry?.status === 'legacy_rename';
}

/**
 * Returns all canonical entries (useful for debugging and catalog rebuilds).
 */
export function getAllCanonicalEntries(): Record<string, CanonicalEntry> {
  return { ...CANONICAL_MAP };
}

/**
 * Returns the set of all product IDs that are removed or archived duplicates,
 * in normalised key form. Useful for bulk-filtering a product list.
 */
export function getRemovedProductKeys(): Set<string> {
  const keys = new Set<string>();
  for (const [key, entry] of Object.entries(CANONICAL_MAP)) {
    if (entry.status === 'removed' || entry.status === 'archived_duplicate') {
      keys.add(key);
    }
  }
  return keys;
}