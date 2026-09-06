import { debitPaidOrder, getInventorySnapshots, reconcileInventory, restockCancelledOrder } from '@/lib/inventory/turso-repository';

export const INVENTORY_COLLECTION = 'inventory';
export const INVENTORY_EVENTS_COLLECTION = 'inventory_events';

const DEFAULT_STOCK = Number(process.env.DEFAULT_PRODUCT_STOCK || 25);
const DEFAULT_LOW_STOCK_THRESHOLD = Number(process.env.DEFAULT_LOW_STOCK_THRESHOLD || 5);

export async function syncInventoryWithCatalog(db, products, options = {}) {
  return reconcileInventory(products,options);
}

export async function applyInventorySnapshot(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  const productIds = products.map((product) => product.id).filter(Boolean);
  if (productIds.length === 0) {
    return products;
  }

  const inventoryMap = await getInventorySnapshots(productIds);

  return products.map((product) => {
    const inventory = inventoryMap.get(product.id);
    if (!inventory) {
      // No inventory doc — fall back to the product's own inStock flag
      // (set by syncToUnified from Square catalog data).
      // This ensures sold-out products show badges even before a webhook fires.
      if (product.inStock === false) {
        return {
          ...product,
          stock: 0,
          currentStock: 0,
          lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
          availability: 'out_of_stock',
          purchaseStatus: 'preorder',
          isPreorder: true,
        };
      }
      return product;
    }

    const currentStock = Number(inventory.currentStock || 0);

    return {
      ...product,
      stock: currentStock,
      currentStock,
      lowStockThreshold: Number(inventory.lowStockThreshold || DEFAULT_LOW_STOCK_THRESHOLD),
      inStock: currentStock > 0,
      availability: currentStock > 0 ? 'in_stock' : 'out_of_stock',
      purchaseStatus: currentStock > 0 ? 'in_stock' : 'preorder',
      isPreorder: currentStock <= 0,
    };
  });
}

export async function consumeInventoryForPaidOrder(db, payload) {
  return debitPaidOrder(payload);
}

export async function restockInventoryForCancelledOrder(db, payload) {
  return restockCancelledOrder(payload);
}
