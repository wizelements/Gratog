import { getProductBySlugOrId } from '@/data/products';
import { findUnapprovedCurrentMenuItem } from '@/lib/order-admission';

/**
 * Shared client/server eligibility for market preorders.
 * Square stock 0 means no ready-to-ship inventory, but an explicitly approved,
 * active made-to-order market item can still be reserved for a future batch.
 * Never permit archived, disabled or unconnected Square items.
 */
export function isMarketPreorderPermitted(product: any): boolean {
  if (findUnapprovedCurrentMenuItem([product])) return false;
  if (!product || product.available === false || product.soldOut === true ||
      product.squareIsArchived === true || product.isArchived === true ||
      product.inventoryStatus === 'sold_out' || product.inventoryStatus === 'inactive' ||
      product.weeklyStatus === 'inactive' || product.weeklyStatus === 'sold_out' ||
      product.checkoutReady === false) return false;

  const curated = getProductBySlugOrId(
    product.curatedProductId || product.slug || product.id || ''
  );
  const explicitlyPreorderable = Boolean(
    curated?.preorderOnly &&
    curated?.marketPickupOnly &&
    curated?.activeWeeklyMenu &&
    curated?.weeklyStatus === 'active' &&
    curated?.soldOut !== true &&
    curated?.inventoryStatus !== 'sold_out' &&
    curated?.inventoryStatus !== 'inactive'
  );
  const currentlyOutOfStock =
    product.inStock === false || product.purchaseStatus === 'out_of_stock';

  if (currentlyOutOfStock) {
    return explicitlyPreorderable;
  }
  return true;
}
