import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const logger = createLogger('InventoryReconcile');

const SQUARE_API_BASE = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2025-10-16';

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  if (isVercelCron) return true;
  if (!cronSecret) return false;
  return request.headers.get('Authorization') === `Bearer ${cronSecret}`;
}

function getSquareHeaders() {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error('SQUARE_ACCESS_TOKEN not configured');
  return {
    Authorization: `Bearer ${token}`,
    'Square-Version': SQUARE_VERSION,
    'Content-Type': 'application/json',
  };
}

/**
 * GET /api/cron/inventory-reconcile
 *
 * Pulls actual inventory counts from Square and writes them to:
 *   - inventory collection (source of truth for applyInventorySnapshot)
 *   - unified_products.inStock (denormalised flag)
 *   - square_catalog_items.inventoryCount (denormalised)
 */
export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const locationId = process.env.SQUARE_LOCATION_ID;
    if (!locationId) throw new Error('SQUARE_LOCATION_ID not configured');

    // 1. Fetch all catalog items to build variationId → productId map
    const catalogRes = await fetch(`${SQUARE_API_BASE}/catalog/list?types=ITEM`, {
      headers: getSquareHeaders(),
    });
    if (!catalogRes.ok) throw new Error(`Catalog fetch failed: ${catalogRes.status}`);
    const catalogData = await catalogRes.json();
    const items = catalogData.objects || [];

    const variationToProduct = new Map();
    const allVariationIds = [];
    items.forEach((item) => {
      const vars = item.item_data?.variations || [];
      vars.forEach((v) => {
        variationToProduct.set(v.id, {
          productId: item.id,
          productName: item.item_data?.name || 'Unknown',
        });
        allVariationIds.push(v.id);
      });
    });

    // 2. Batch-retrieve inventory counts from Square
    const invRes = await fetch(`${SQUARE_API_BASE}/inventory/counts/batch-retrieve`, {
      method: 'POST',
      headers: getSquareHeaders(),
      body: JSON.stringify({
        catalog_object_ids: allVariationIds,
        location_ids: [locationId],
      }),
    });
    if (!invRes.ok) throw new Error(`Inventory fetch failed: ${invRes.status}`);
    const invData = await invRes.json();
    const counts = invData.counts || [];

    // 3. Aggregate per-product stock
    const productStock = new Map(); // productId → totalStock
    counts.forEach((c) => {
      const mapping = variationToProduct.get(c.catalog_object_id);
      if (!mapping) return;
      const qty = parseInt(c.quantity || '0', 10);
      productStock.set(
        mapping.productId,
        (productStock.get(mapping.productId) || 0) + qty
      );
    });

    // Products with no inventory counts at all → stock 0
    items.forEach((item) => {
      if (!productStock.has(item.id)) {
        productStock.set(item.id, 0);
      }
    });

    // 4. Write to MongoDB
    const { db } = await connectToDatabase();
    const now = new Date();
    const results = { updated: 0, soldOut: 0, inStock: 0 };

    for (const [productId, stock] of productStock) {
      const mapping = [...variationToProduct.values()].find(
        (m) => items.find((i) => i.id === productId)
      );
      const productName =
        items.find((i) => i.id === productId)?.item_data?.name || 'Unknown';
      const slug = productName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const inStock = stock > 0;
      const varIds = items
        .find((i) => i.id === productId)
        ?.item_data?.variations?.map((v) => v.id)
        .filter(Boolean) || [];

      // Update inventory collection (applyInventorySnapshot source)
      await db.collection('inventory').updateOne(
        { productId },
        {
          $set: {
            productName,
            productSlug: slug || null,
            squareId: productId,
            variationIds: varIds,
            currentStock: stock,
            isActive: true,
            updatedAt: now,
            lastCatalogSyncAt: now,
          },
          $setOnInsert: {
            productId,
            createdAt: now,
            source: 'square_inventory_reconcile',
            lowStockThreshold: 5,
            stockHistory: [],
            lastRestocked: now,
          },
        },
        { upsert: true }
      );

      // Update unified_products.inStock
      await db.collection('unified_products').updateOne(
        { id: productId },
        { $set: { inStock, updatedAt: now } }
      );

      // Update square_catalog_items
      await db.collection('square_catalog_items').updateOne(
        { id: productId },
        { $set: { inventoryCount: stock, inStock, lastInventoryUpdate: now } }
      );

      results.updated++;
      if (inStock) results.inStock++;
      else results.soldOut++;
    }

    logger.info('Inventory reconciliation complete', results);

    return NextResponse.json({
      success: true,
      ...results,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Inventory reconciliation failed', { error: message });
    return NextResponse.json(
      { success: false, error: message, durationMs: Date.now() - startedAt },
      { status: 500 }
    );
  }
}
