import { logger } from '@/lib/logger';

export const INVENTORY_COLLECTION = 'inventory';
export const INVENTORY_EVENTS_COLLECTION = 'inventory_events';

// Never manufacture physical stock for a catalog row without verified evidence.
const DEFAULT_STOCK = 0;
const DEFAULT_LOW_STOCK_THRESHOLD = Number(process.env.DEFAULT_LOW_STOCK_THRESHOLD || 5);

function normalizeOrderItem(item) {
  const productId = item?.id || item?.productId || item?.squareId;
  const quantity = Number(item?.quantity || 0);

  return {
    productId,
    quantity,
    name: item?.name || 'Unknown product',
    variationId: item?.variationId || item?.catalogObjectId || null,
  };
}

export async function syncInventoryWithCatalog(db, products, options = {}) {
  const pruneMissing = options.pruneMissing !== false;
  const source = options.source || 'square_catalog_sync';
  const now = new Date();

  if (!Array.isArray(products)) {
    throw new Error('products must be an array');
  }

  const productIds = products
    .map((product) => product?.id)
    .filter(Boolean);

  const existingInventory = await db.collection(INVENTORY_COLLECTION)
    .find({ productId: { $in: productIds } })
    .toArray();

  const existingMap = new Map(existingInventory.map((item) => [item.productId, item]));

  const operations = products
    .filter((product) => product?.id)
    .map((product) => {
      const existing = existingMap.get(product.id);
      const primaryVariation = product.variations?.[0] || {};
      const lowStockThreshold = existing?.lowStockThreshold
        ?? primaryVariation.inventoryAlertThreshold
        ?? DEFAULT_LOW_STOCK_THRESHOLD;
      // Use existing inventory doc value first, then Square's catalog-level
      // inventoryCount, then aggregate from variations, then DEFAULT_STOCK.
      const currentStock = existing?.currentStock
        ?? (product.inventoryCount !== undefined ? Number(product.inventoryCount) : undefined)
        ?? ((product.variations || []).some(v => v.inventoryCount !== undefined)
          ? (product.variations || []).reduce((sum, v) => sum + Number(v.inventoryCount || 0), 0)
          : undefined)
        ?? DEFAULT_STOCK;

      return {
        updateOne: {
          filter: { productId: product.id },
          update: {
            $set: {
              productName: product.name,
              productSlug: product.slug || null,
              squareId: product.squareId || product.id,
              variationIds: (product.variations || []).map((variation) => variation.id).filter(Boolean),
              lowStockThreshold,
              currentStock,
              stockSource: existing?.stockSource || 'unverified',
              stockVerifiedAt: existing?.stockVerifiedAt || null,
              isActive: true,
              lastCatalogSyncAt: now,
              updatedAt: now,
            },
            $setOnInsert: {
              productId: product.id,
              source,
              createdAt: now,
              lastRestocked: now,
              stockHistory: [
                {
                  date: now,
                  adjustment: currentStock,
                  reason: 'Initial stock allocation from catalog sync',
                  adjustedBy: 'system',
                },
              ],
            },
          },
          upsert: true,
        },
      };
    });

  if (operations.length > 0) {
    await db.collection(INVENTORY_COLLECTION).bulkWrite(operations, { ordered: false });
  }

  let prunedCount = 0;
  if (pruneMissing) {
    const pruneQuery = productIds.length > 0
      ? { productId: { $nin: productIds } }
      : {};
    const pruneResult = await db.collection(INVENTORY_COLLECTION).deleteMany(pruneQuery);
    prunedCount = pruneResult.deletedCount || 0;
  }

  if (operations.length > 0 || prunedCount > 0) {
    await db.collection(INVENTORY_EVENTS_COLLECTION).insertOne({
      type: 'catalog_reconcile',
      syncedProducts: operations.length,
      prunedProducts: prunedCount,
      source,
      createdAt: now,
    });
  }

  return {
    synced: operations.length,
    pruned: prunedCount,
  };
}

export async function applyInventorySnapshot(db, products) {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  const productIds = products.map((product) => product.id).filter(Boolean);
  if (productIds.length === 0) {
    return products;
  }

  const inventoryItems = await db.collection(INVENTORY_COLLECTION)
    .find({ productId: { $in: productIds } })
    .project({ productId: 1, currentStock: 1, lowStockThreshold: 1, stockSource: 1, stockVerifiedAt: 1 })
    .toArray();

  const inventoryMap = new Map(inventoryItems.map((item) => [item.productId, item]));

  return products.map((product) => {
    const inventory = inventoryMap.get(product.id);
    const stockVerified = Boolean(inventory?.stockVerifiedAt &&
      ['square_inventory_rest', 'merchant_physical_count'].includes(inventory?.stockSource));
    const currentStock = stockVerified ? Number(inventory.currentStock) : null;
    const allowsPreorder = product.preorderOnly === true ||
      product.acceptsPreorders === true || product.isPreorder === true;
    if (!stockVerified || !Number.isSafeInteger(currentStock) || currentStock < 0) {
      return {
        ...product,
        stock: null,
        currentStock: null,
        inventoryVerified: false,
        inStock: false,
        checkoutReady: false,
        checkoutUnavailableReason: 'Physical inventory has not been verified for checkout. Ask about the next batch.',
        availability: 'unknown',
        purchaseStatus: allowsPreorder ? 'preorder' : 'out_of_stock',
        isPreorder: allowsPreorder,
      };
    }
    return {
      ...product,
      stock: currentStock,
      currentStock,
      inventoryVerified: true,
      stockSource: inventory.stockSource,
      stockVerifiedAt: inventory.stockVerifiedAt,
      lowStockThreshold: Number(inventory.lowStockThreshold || DEFAULT_LOW_STOCK_THRESHOLD),
      inStock: currentStock > 0,
      checkoutReady: currentStock > 0 && product.checkoutReady !== false,
      availability: currentStock > 0 ? 'in_stock' : 'out_of_stock',
      purchaseStatus: product.preorderOnly === true ? 'preorder' :
        currentStock > 0 ? 'in_stock' : allowsPreorder ? 'preorder' : 'out_of_stock',
      isPreorder: Boolean(product.preorderOnly === true || (currentStock <= 0 && allowsPreorder)),
    };
  });
}

/**
 * Read-only, fail-closed stock admission BEFORE contacting the payment processor.
 * A negative stock balance or absent inventory record is not permission to
 * charge a customer for a future batch. Bounded inventory must be configured
 * first; confirmed future-batch requests use the no-charge inquiry workflow.
 *
 * This check cannot eliminate a race with another concurrent purchase:
 * true no-oversell certification requires an atomic stock reservation lease.
 */
export async function checkInventoryForPayment(db, items) {
  const quantities = new Map();
  for (const raw of Array.isArray(items) ? items : []) {
    const item = normalizeOrderItem(raw);
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
      return { valid: false, code: 'INVALID_ORDER_ITEMS' };
    }
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
  }
  if (quantities.size === 0) return { valid: false, code: 'INVALID_ORDER_ITEMS' };
  const docs = await db.collection(INVENTORY_COLLECTION)
    .find({ productId: { $in: [...quantities.keys()] } })
    .project({ productId: 1, currentStock: 1, stockVerifiedAt: 1, stockSource: 1 })
    .toArray();
  const availableByProduct = new Map(docs.map(doc => [doc.productId,
    doc.stockVerifiedAt && ['square_inventory_rest', 'merchant_physical_count'].includes(doc.stockSource)
      ? Number(doc.currentStock) : null]));
  for (const [productId, quantity] of quantities) {
    const available = availableByProduct.get(productId);
    if (!Number.isFinite(available) || available < quantity) {
      return { valid: false, code: 'INVENTORY_UNAVAILABLE', productId };
    }
  }
  return { valid: true };
}

export async function consumeInventoryForPaidOrder(db, payload) {
  const now = new Date();
  const orderId = payload?.orderId;
  const orderNumber = payload?.orderNumber || orderId;
  const actor = payload?.actor || 'system';
  const items = (payload?.items || [])
    .map(normalizeOrderItem)
    .filter((item) => item.productId && item.quantity > 0);

  if (!orderId || items.length === 0) {
    return { success: false, debited: 0, reason: 'missing_order_or_items' };
  }

  const alreadyProcessed = await db.collection(INVENTORY_EVENTS_COLLECTION).findOne({
    type: 'order_debit',
    orderId,
  });

  if (alreadyProcessed) {
    return { success: true, debited: 0, skipped: true, reason: 'already_processed' };
  }

  for (const item of items) {
    const result = await db.collection(INVENTORY_COLLECTION).findOneAndUpdate(
      {
        productId: item.productId,
        currentStock: { $gte: item.quantity },
      },
      {
        $inc: { currentStock: -item.quantity },
        $set: { updatedAt: now },
        $push: {
          stockHistory: {
            date: now,
            adjustment: -item.quantity,
            reason: `Order ${orderNumber} paid`,
            adjustedBy: actor,
          },
        },
      },
      { returnDocument: 'after', includeResultMetadata: true }
    );

    if (!result.value) {
      logger.warn('Inventory', 'Insufficient inventory for paid order item', {
        orderId,
        productId: item.productId,
        requested: item.quantity,
      });
      throw new Error(`Insufficient inventory for product ${item.productId}`);
    }
  }

  await db.collection(INVENTORY_EVENTS_COLLECTION).insertOne({
    type: 'order_debit',
    orderId,
    orderNumber,
    actor,
    items,
    createdAt: now,
  });

  return { success: true, debited: items.length, skipped: false };
}

export async function restockInventoryForCancelledOrder(db, payload) {
  const now = new Date();
  const orderId = payload?.orderId;
  const orderNumber = payload?.orderNumber || orderId;
  const actor = payload?.actor || 'admin';
  const items = (payload?.items || [])
    .map(normalizeOrderItem)
    .filter((item) => item.productId && item.quantity > 0);

  if (!orderId || items.length === 0) {
    return { success: false, restocked: 0, reason: 'missing_order_or_items' };
  }

  const alreadyRestocked = await db.collection(INVENTORY_EVENTS_COLLECTION).findOne({
    type: 'order_credit',
    orderId,
  });

  if (alreadyRestocked) {
    return { success: true, restocked: 0, skipped: true, reason: 'already_processed' };
  }

  const operations = items.map((item) => ({
    updateOne: {
      filter: { productId: item.productId },
      update: {
        $inc: { currentStock: item.quantity },
        $set: { updatedAt: now },
        $setOnInsert: {
          productId: item.productId,
          productName: item.name,
          source: 'order_restock',
          createdAt: now,
          lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
          stockHistory: [],
          lastRestocked: now,
        },
        $push: {
          stockHistory: {
            date: now,
            adjustment: item.quantity,
            reason: `Order ${orderNumber} cancelled`,
            adjustedBy: actor,
          },
        },
      },
      upsert: true,
    },
  }));

  await db.collection(INVENTORY_COLLECTION).bulkWrite(operations, { ordered: false });
  await db.collection(INVENTORY_EVENTS_COLLECTION).insertOne({
    type: 'order_credit',
    orderId,
    orderNumber,
    actor,
    items,
    createdAt: now,
  });

  return { success: true, restocked: items.length, skipped: false };
}
