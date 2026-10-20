/**
 * Canonical live-catalog publication gate.
 *
 * Reconcile a Square-synced product against merchant-approved curated details
 * BEFORE strict integrity validation. Do not invent ingredients, narratives,
 * prices or stock for products that have no approved match.
 *
 * Exclude inactive/sold-out weekly products before adding any curated
 * fallbacks. Payment and inventory still require server-side verification.
 */
import {
  isInactiveCatalogItem,
  mergeWithCuratedProduct,
} from '@/data/products';

export function prepareLiveStorefrontProducts(products = []) {
  if (!Array.isArray(products)) return [];

  return products
    .filter(product => product && typeof product === 'object')
    .filter(product => !isInactiveCatalogItem(product))
    .filter(product => {
      const status = String(product.weeklyStatus || product.inventoryStatus || '').toLowerCase();
      return status !== 'inactive' && status !== 'sold_out' && product.activeWeeklyMenu !== false;
    })
    .map((product, index) => mergeWithCuratedProduct(product, index));
}
