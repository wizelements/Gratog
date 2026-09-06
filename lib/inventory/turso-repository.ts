import { getTursoConnection } from '@/lib/db/turso';

export type InventorySnapshot = {
  productId: string;
  currentStock: number;
  lowStockThreshold: number;
};

const READ_BATCH_SIZE = 100;

/**
 * Reads inventory by the canonical product IDs produced by the Square/unified
 * catalog projection. IDs are treated as opaque strings; they are never
 * regenerated or interpreted as Mongo ObjectIds.
 */
export async function getInventorySnapshots(
  productIds: string[],
): Promise<Map<string, InventorySnapshot>> {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  const snapshots = new Map<string, InventorySnapshot>();
  const db = getTursoConnection();

  for (let offset = 0; offset < uniqueIds.length; offset += READ_BATCH_SIZE) {
    const batch = uniqueIds.slice(offset, offset + READ_BATCH_SIZE);
    const placeholders = batch.map(() => '?').join(',');
    const rows = await db.all(
      `SELECT product_id, current_stock, low_stock_threshold
       FROM inventory
       WHERE active = 1 AND product_id IN (${placeholders})`,
      ...batch,
    );

    for (const row of rows) {
      const productId = String(row.product_id);
      snapshots.set(productId, {
        productId,
        currentStock: Number(row.current_stock ?? 0),
        lowStockThreshold: Number(row.low_stock_threshold ?? 0),
      });
    }
  }

  return snapshots;
}
