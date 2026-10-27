import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db-optimized', () => ({ connectToDatabase: vi.fn() }));
import { connectToDatabase } from '@/lib/db-optimized';
import { syncInventoryWithCatalog } from '@/lib/custom-inventory';
import { getUnifiedProducts } from '@/lib/product-sync-engine';

describe('Catalog sync never destroys merchant inventory or exposes QA catalog records', () => {
  function makeInventoryDb() {
    const inventory = {
      find: vi.fn(() => ({ toArray: async () => [] })),
      bulkWrite: vi.fn(async () => ({ modifiedCount: 1 })),
      deleteMany: vi.fn(async () => ({ deletedCount: 0 })),
    };
    const events = { insertOne: vi.fn(async () => ({})) };
    const db = { collection: vi.fn((name: string) => {
      if (name === 'inventory') return inventory;
      if (name === 'inventory_events') return events;
      throw new Error('Unexpected collection: ' + name);
    }) };
    return { db, inventory, events };
  }

  it('does not prune any inventory as a side effect of an ordinary Square catalog refresh', async () => {
    const { db, inventory } = makeInventoryDb();
    await syncInventoryWithCatalog(db as any, [{
      id: 'square-stock-item', name: 'In-stock drink',
      variations: [{ id: 'square-variation', inventoryCount: 2 }],
    }], { source: 'square_catalog_sync' });
    expect(inventory.bulkWrite).toHaveBeenCalledTimes(1);
    expect(inventory.deleteMany).not.toHaveBeenCalled();
  });

  it('even explicitly requested pruning cannot delete records outside the owned source or active reservations', async () => {
    const { db, inventory } = makeInventoryDb();
    await syncInventoryWithCatalog(db as any, [{ id: 'square-item', name: 'Drink' }], {
      source: 'square_catalog_sync', pruneMissing: true,
    });
    expect(inventory.deleteMany).toHaveBeenCalledTimes(1);
    expect(inventory.deleteMany).toHaveBeenCalledWith({
      source: 'square_catalog_sync',
      productId: { $nin: ['square-item'] },
      reservedUntil: { $exists: false },
    });
  });

  it('permanently excludes isolated certification products before any shopper filter is applied', async () => {
    const aggregate = vi.fn((pipeline: unknown) => ({ toArray: async () => [] }));
    vi.mocked(connectToDatabase).mockResolvedValue({
      db: { collection: () => ({ aggregate }) },
    } as any);
    await getUnifiedProducts({ search: 'strawberry' });
    expect(aggregate).toHaveBeenCalledTimes(1);
    const pipeline = aggregate.mock.calls[0][0] as any[];
    const exclusions = pipeline[0].$match.$and[0].$nor;
    const sourceClause = exclusions.find((x: any) => x.source?.$in);
    expect(sourceClause.source.$in).toContain('qa_isolated_preview_only');
    expect(sourceClause.source.$in).toContain('qa_browser_certification_only');
    const idRegex = exclusions.find((x: any) => x.id?.$regex).id.$regex as RegExp;
    expect(idRegex.test('cert-checkout-abc123')).toBe(true);
    expect(idRegex.test('cert-ui-test')).toBe(true);
    expect(idRegex.test('genuine-product-123')).toBe(false);
  });
});
