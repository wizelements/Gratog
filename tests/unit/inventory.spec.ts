import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock MongoDB
const mockDb = {
  collection: vi.fn().mockReturnValue({
    find: vi.fn().mockReturnValue({
      project: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { id: 'prod_1', name: 'Sea Moss Gel', stock: 5, lowStock: true },
          { id: 'prod_2', name: 'Golden Moss', stock: 20, lowStock: false }
        ])
      })
    }),
    findOne: vi.fn().mockResolvedValue({
      id: 'prod_1',
      name: 'Sea Moss Gel',
      stock: 5,
      lowStock: true,
      inventoryLastSync: new Date()
    }),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    bulkWrite: vi.fn().mockResolvedValue({ modifiedCount: 2 })
  })
};

vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({ db: mockDb })
}));

vi.stubEnv('LOW_STOCK_THRESHOLD', '10');

describe('Inventory Sync Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getInventoryStatus', () => {
    it('should return inventory status for a product', async () => {
      const { getInventoryStatus } = await import('@/lib/inventory-sync');
      
      const result = await getInventoryStatus('prod_1');
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('prod_1');
      expect(result?.stock).toBe(5);
      expect(result?.lowStock).toBe(true);
      expect(result?.available).toBe(true);
    });

    it('should indicate unavailable when stock is 0', async () => {
      mockDb.collection().findOne.mockResolvedValueOnce({
        id: 'prod_3',
        name: 'Out of Stock Product',
        stock: 0,
        lowStock: true
      });

      const { getInventoryStatus } = await import('@/lib/inventory-sync');
      
      const result = await getInventoryStatus('prod_3');
      
      expect(result?.available).toBe(false);
    });

    it('should return null for non-existent product', async () => {
      mockDb.collection().findOne.mockResolvedValueOnce(null);

      const { getInventoryStatus } = await import('@/lib/inventory-sync');
      
      const result = await getInventoryStatus('non_existent');
      
      expect(result).toBeNull();
    });
  });

  describe('checkLowStock', () => {
    it('should return low stock items', async () => {
      const { checkLowStock } = await import('@/lib/inventory-sync');
      
      const result = await checkLowStock();
      
      expect(result.threshold).toBe(10);
      expect(result.items).toHaveLength(2);
      expect(result.count).toBe(2);
    });
  });

  describe('updateInventoryLevel', () => {
    it('should update inventory for a product', async () => {
      const { updateInventoryLevel } = await import('@/lib/inventory-sync');
      
      const result = await updateInventoryLevel('catalog_obj_1', 25);
      
      expect(result.success).toBe(true);
      expect(result.modifiedCount).toBe(1);
    });

    it('should set lowStock flag when quantity is below threshold', async () => {
      const { updateInventoryLevel } = await import('@/lib/inventory-sync');
      
      await updateInventoryLevel('catalog_obj_1', 5);
      
      expect(mockDb.collection().updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            lowStock: true
          })
        })
      );
    });
  });

  describe('reserveInventory', () => {
    it('should decrement stock for order items', async () => {
      const { reserveInventory } = await import('@/lib/inventory-sync');
      
      const result = await reserveInventory([
        { productId: 'prod_1', quantity: 2 },
        { productId: 'prod_2', quantity: 1 }
      ]);
      
      expect(result.expected).toBe(2);
      expect(mockDb.collection().bulkWrite).toHaveBeenCalled();
    });
  });

  describe('releaseInventory', () => {
    it('should increment stock when order cancelled', async () => {
      const { releaseInventory } = await import('@/lib/inventory-sync');
      
      const result = await releaseInventory([
        { productId: 'prod_1', quantity: 2 }
      ]);
      
      expect(result.success).toBe(true);
      expect(mockDb.collection().bulkWrite).toHaveBeenCalled();
    });
  });
});
