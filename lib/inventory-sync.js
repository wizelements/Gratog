/**
 * Inventory Sync Service
 * Synchronizes inventory levels between Square and MongoDB
 */

import { connectToDatabase } from '@/lib/db-optimized';
import { createLogger } from '@/lib/logger';
import { openTursoPreview, tursoPreviewSelected } from '@/lib/checkout/turso-preview-runtime.mjs';
import { getTursoInventory, listTursoInventory, TursoInventoryError } from '@/lib/inventory/turso-inventory.mjs';

const logger = createLogger('InventorySync');

const SQUARE_API_BASE = 'https://connect.squareup.com/v2';
// ISS-029 FIX: Standardized Square API version across all modules
const SQUARE_VERSION = '2025-10-16';

// Low stock threshold for alerts
const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD || '10');

/**
 * Get Square API headers
 */
function getSquareHeaders() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('SQUARE_ACCESS_TOKEN is not configured');
  }
  
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Square-Version': SQUARE_VERSION,
    'Content-Type': 'application/json'
  };
}

/**
 * Full sync of inventory from Square catalog
 */
export async function syncInventoryFromSquare() {
  if (tursoPreviewSelected()) throw new TursoInventoryError('TURSO_SQUARE_STOCK_SYNC_NOT_CERTIFIED', 503);
  logger.info('Starting full inventory sync from Square');
  
  try {
    const locationId = process.env.SQUARE_LOCATION_ID;
    if (!locationId) {
      throw new Error('SQUARE_LOCATION_ID is not configured');
    }

    // Get catalog items
    const catalogResponse = await fetch(`${SQUARE_API_BASE}/catalog/list?types=ITEM`, {
      headers: getSquareHeaders()
    });

    if (!catalogResponse.ok) {
      throw new Error(`Failed to fetch catalog: ${catalogResponse.status}`);
    }

    const catalogData = await catalogResponse.json();
    const items = catalogData.objects || [];
    
    if (items.length === 0) {
      logger.warn('No catalog items found');
      return { synced: 0, items: [] };
    }

    // Get catalog object IDs for inventory lookup
    const catalogObjectIds = [];
    items.forEach(item => {
      if (item.item_data?.variations) {
        item.item_data.variations.forEach(variation => {
          catalogObjectIds.push(variation.id);
        });
      }
    });

    // Batch retrieve inventory counts
    const inventoryResponse = await fetch(`${SQUARE_API_BASE}/inventory/counts/batch-retrieve`, {
      method: 'POST',
      headers: getSquareHeaders(),
      body: JSON.stringify({
        catalog_object_ids: catalogObjectIds,
        location_ids: [locationId]
      })
    });

    if (!inventoryResponse.ok) {
      throw new Error(`Failed to fetch inventory: ${inventoryResponse.status}`);
    }

    const inventoryData = await inventoryResponse.json();
    const inventoryCounts = inventoryData.counts || [];

    // Create inventory map
    const inventoryMap = new Map();
    inventoryCounts.forEach(count => {
      inventoryMap.set(count.catalog_object_id, {
        quantity: parseInt(count.quantity || '0'),
        state: count.state,
        calculatedAt: count.calculated_at
      });
    });

    // Update MongoDB
    const { db } = await connectToDatabase();
    const updates = [];

    for (const item of items) {
      const variations = item.item_data?.variations || [];
      let totalStock = 0;
      
      variations.forEach(variation => {
        const inv = inventoryMap.get(variation.id);
        if (inv) {
          totalStock += inv.quantity;
        }
      });

      updates.push({
        updateOne: {
          filter: { squareId: item.id },
          update: {
            $set: {
              stock: totalStock,
              inventoryLastSync: new Date(),
              lowStock: totalStock <= LOW_STOCK_THRESHOLD
            }
          }
        }
      });
    }

    if (updates.length > 0) {
      await db.collection('products').bulkWrite(updates);
    }

    logger.info('Inventory sync completed', { synced: updates.length });

    return {
      synced: updates.length,
      items: items.map(i => ({
        id: i.id,
        name: i.item_data?.name,
        stock: inventoryMap.get(i.item_data?.variations?.[0]?.id)?.quantity || 0
      }))
    };
  } catch (error) {
    logger.error('Inventory sync failed', { error: error.message });
    throw error;
  }
}

/**
 * Update inventory level for a single item
 */
export async function updateInventoryLevel(catalogObjectId, quantity, variationId = null) {
  if (tursoPreviewSelected()) throw new TursoInventoryError('TURSO_SQUARE_STOCK_REPLACEMENT_NOT_CERTIFIED', 503);
  logger.info('Updating inventory level', { catalogObjectId, quantity });

  try {
    const { db } = await connectToDatabase();
    
    const filter = variationId 
      ? { 'variations.squareId': variationId }
      : { squareId: catalogObjectId };

    const result = await db.collection('products').updateOne(
      filter,
      {
        $set: {
          stock: quantity,
          inventoryLastSync: new Date(),
          lowStock: quantity <= LOW_STOCK_THRESHOLD
        }
      }
    );

    if (result.modifiedCount === 0) {
      logger.warn('No product found to update', { catalogObjectId });
    }

    return {
      success: result.modifiedCount > 0,
      modifiedCount: result.modifiedCount
    };
  } catch (error) {
    logger.error('Failed to update inventory level', { error: error.message });
    throw error;
  }
}

/**
 * Get items with low stock
 */
export async function checkLowStock() {
  if (tursoPreviewSelected()) {
    const items = (await listTursoInventory(await openTursoPreview()))
      .filter(item => item.isActive && item.currentStock <= LOW_STOCK_THRESHOLD);
    return { threshold: LOW_STOCK_THRESHOLD, items, count: items.length };
  }
  logger.info('Checking low stock items');

  try {
    const { db } = await connectToDatabase();

    const lowStockItems = await db.collection('products')
      .find({
        $or: [
          { stock: { $lte: LOW_STOCK_THRESHOLD } },
          { lowStock: true }
        ]
      })
      .project({
        id: 1,
        name: 1,
        stock: 1,
        squareId: 1
      })
      .toArray();

    logger.info('Low stock check completed', { count: lowStockItems.length });

    return {
      threshold: LOW_STOCK_THRESHOLD,
      items: lowStockItems,
      count: lowStockItems.length
    };
  } catch (error) {
    logger.error('Failed to check low stock', { error: error.message });
    throw error;
  }
}

/**
 * Get current inventory status for an item
 */
export async function getInventoryStatus(itemId) {
  if (tursoPreviewSelected()) {
    const db = await openTursoPreview();
    const matches = await db.all('SELECT id FROM products WHERE id=? OR square_catalog_id=?', itemId, itemId);
    if (matches.length > 1) throw new TursoInventoryError('TURSO_INVENTORY_IDENTITY_AMBIGUOUS', 409);
    if (!matches.length) return null;
    const item = await getTursoInventory(db, matches[0].id);
    if (!item) return null;
    return { id: item.id, name: item.name, stock: item.currentStock,
      lowStock: item.currentStock <= LOW_STOCK_THRESHOLD, lastSync: item.updatedAt,
      available: item.inStock, requiresReconciliation: item.requiresReconciliation };
  }
  try {
    const { db } = await connectToDatabase();

    const product = await db.collection('products').findOne(
      { $or: [{ id: itemId }, { squareId: itemId }] },
      { projection: { id: 1, name: 1, stock: 1, lowStock: 1, inventoryLastSync: 1 } }
    );

    if (!product) {
      return null;
    }

    return {
      id: product.id,
      name: product.name,
      stock: product.stock || 0,
      lowStock: product.lowStock || false,
      lastSync: product.inventoryLastSync,
      available: (product.stock || 0) > 0
    };
  } catch (error) {
    logger.error('Failed to get inventory status', { error: error.message, itemId });
    throw error;
  }
}

/**
 * Reserve inventory for an order (decrement stock)
 */
export async function reserveInventory(items) {
  if (tursoPreviewSelected()) throw new TursoInventoryError('TURSO_USE_ORDER_SCOPED_STOCK_RESERVATION', 503);
  logger.info('Reserving inventory', { itemCount: items.length });

  try {
    const { db } = await connectToDatabase();
    const operations = [];

    for (const item of items) {
      operations.push({
        updateOne: {
          filter: { 
            id: item.productId,
            stock: { $gte: item.quantity }
          },
          update: {
            $inc: { stock: -item.quantity },
            $set: { updatedAt: new Date() }
          }
        }
      });
    }

    const result = await db.collection('products').bulkWrite(operations);

    if (result.modifiedCount !== items.length) {
      logger.warn('Not all inventory reserved', { 
        expected: items.length, 
        reserved: result.modifiedCount 
      });
    }

    return {
      success: result.modifiedCount === items.length,
      reserved: result.modifiedCount,
      expected: items.length
    };
  } catch (error) {
    logger.error('Failed to reserve inventory', { error: error.message });
    throw error;
  }
}

/**
 * Release reserved inventory (increment stock)
 */
export async function releaseInventory(items) {
  if (tursoPreviewSelected()) throw new TursoInventoryError('TURSO_USE_ORDER_SCOPED_STOCK_RELEASE', 503);
  logger.info('Releasing inventory', { itemCount: items.length });

  try {
    const { db } = await connectToDatabase();
    const operations = [];

    for (const item of items) {
      operations.push({
        updateOne: {
          filter: { id: item.productId },
          update: {
            $inc: { stock: item.quantity },
            $set: { updatedAt: new Date() }
          }
        }
      });
    }

    const result = await db.collection('products').bulkWrite(operations);

    return {
      success: true,
      released: result.modifiedCount
    };
  } catch (error) {
    logger.error('Failed to release inventory', { error: error.message });
    throw error;
  }
}

const inventorySync = {
  syncInventoryFromSquare,
  updateInventoryLevel,
  checkLowStock,
  getInventoryStatus,
  reserveInventory,
  releaseInventory
};

export default inventorySync;
