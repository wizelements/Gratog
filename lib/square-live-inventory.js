/**
 * Read-only, location-scoped Square inventory. Never infer a count from the
 * catalog, seed stock from a constant, or interpret unreported stock as zero.
 */
const MAX_PAGE_COUNT = 40;
const MAX_VARIATIONS_PER_BATCH = 1000;
const API_VERSION = '2026-09-16';

export async function readSquareLiveInventory(variationIds, options = {}) {
  const env = options.env || process.env;
  const token = String(options.token || env.SQUARE_ACCESS_TOKEN || '').trim();
  const locationId = String(options.locationId || env.SQUARE_LOCATION_ID || '').trim();
  const environment = options.environment || env.SQUARE_ENVIRONMENT;
  const fetcher = options.fetcher || fetch;
  if (!token || !locationId || !['production', 'sandbox'].includes(environment)) {
    throw new Error('SQUARE_INVENTORY_CONFIGURATION_REQUIRED');
  }
  const uniqueIds = [...new Set((variationIds || []).filter(id =>
    typeof id === 'string' && id.length > 0))];
  const counts = new Map();
  const base = environment === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';

  for (let offset = 0; offset < uniqueIds.length; offset += MAX_VARIATIONS_PER_BATCH) {
    const group = uniqueIds.slice(offset, offset + MAX_VARIATIONS_PER_BATCH);
    const groupSet = new Set(group);
    const cursors = new Set();
    let cursor = null;
    for (let page = 0; page < MAX_PAGE_COUNT; page++) {
      const response = await fetcher(base + '/v2/inventory/counts/batch-retrieve', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token,
          'Square-Version': API_VERSION, 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalog_object_ids: group, location_ids: [locationId],
          states: ['IN_STOCK'], limit: 1000, ...(cursor ? { cursor } : {}) }),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('SQUARE_INVENTORY_READ_FAILED');
      const pageData = await response.json();
      for (const item of pageData.counts || []) {
        if (!groupSet.has(item.catalog_object_id) ||
            item.location_id !== locationId || item.state !== 'IN_STOCK') continue;
        const amount = Number(item.quantity);
        if (!Number.isSafeInteger(amount) || amount < 0) {
          throw new Error('SQUARE_INVALID_INVENTORY_COUNT');
        }
        const prior = counts.get(item.catalog_object_id);
        if (!prior || String(item.calculated_at || '') >= String(prior.calculatedAt || '')) {
          counts.set(item.catalog_object_id, {
            quantity: amount, calculatedAt: item.calculated_at || null,
          });
        }
      }
      cursor = pageData.cursor || null;
      if (!cursor) break;
      if (cursors.has(cursor) || page === MAX_PAGE_COUNT - 1) {
        throw new Error('SQUARE_INVENTORY_PAGINATION_FAILED');
      }
      cursors.add(cursor);
    }
  }
  return counts;
}

export function inventoryForVariation(counts, variation) {
  if (!variation?.id || variation.itemVariationData?.trackInventory === false) {
    return { quantity: null, countStatus: 'unknown' };
  }
  const count = counts.get(variation.id);
  return count
    ? { quantity: count.quantity, countStatus: 'reported', calculatedAt: count.calculatedAt }
    : { quantity: null, countStatus: 'unknown' };
}
