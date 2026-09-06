import { beforeEach, describe, expect, it, vi } from 'vitest';

const connection = vi.hoisted(() => ({ all: vi.fn() }));
vi.mock('@/lib/db/turso', () => ({ getTursoConnection: () => connection }));

import { applyInventorySnapshot } from '@/lib/custom-inventory';
import { getInventorySnapshots } from '@/lib/inventory/turso-repository';

describe('Turso inventory reads', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses bounded parameterized reads and preserves opaque catalog IDs', async () => {
    const ids = Array.from({ length: 101 }, (_, index) => `square:${index}`);
    connection.all
      .mockResolvedValueOnce([{ product_id: ids[0], current_stock: 4, low_stock_threshold: 2 }])
      .mockResolvedValueOnce([]);

    const result = await getInventorySnapshots(ids);

    expect(connection.all).toHaveBeenCalledTimes(2);
    expect(connection.all.mock.calls[0][0]).toContain('product_id IN (');
    expect(connection.all.mock.calls[0][0]).not.toContain(ids[0]);
    expect(connection.all.mock.calls[0].slice(1)).toEqual(ids.slice(0, 100));
    expect(connection.all.mock.calls[1].slice(1)).toEqual(ids.slice(100));
    expect(result.get(ids[0])).toEqual({ productId: ids[0], currentStock: 4, lowStockThreshold: 2 });
  });

  it('applies local stock while retaining projected Square identity', async () => {
    connection.all.mockResolvedValue([
      { product_id: 'square:ginger', current_stock: 0, low_stock_threshold: 3 },
    ]);
    const source = [{ id: 'square:ginger', name: 'Ginger', inStock: true, squareId: 'square:ginger' }];

    await expect(applyInventorySnapshot(source)).resolves.toEqual([{
      ...source[0], stock: 0, currentStock: 0, lowStockThreshold: 3, inStock: false,
      availability: 'out_of_stock', purchaseStatus: 'preorder', isPreorder: true,
    }]);
  });

  it('retains projected sold-out semantics when no inventory row exists', async () => {
    connection.all.mockResolvedValue([]);
    const product = { id: 'square:guest', inStock: false, name: 'Guest item' };

    const [result] = await applyInventorySnapshot([product]);

    expect(result).toMatchObject({
      id: product.id, stock: 0, availability: 'out_of_stock',
      purchaseStatus: 'preorder', isPreorder: true,
    });
  });
});
