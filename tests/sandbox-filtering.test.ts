/**
 * Sandbox Product Filtering Tests
 * Ensures sandbox products never appear on production site
 * Tests multiple filtering vectors for defense-in-depth
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  isSandboxProduct, 
  filterOutSandboxProducts,
  validateNoSandboxProducts,
  sanitizeProductForClient 
} from '@/lib/sandbox-detection';

describe('Sandbox Product Detection', () => {
  describe('isSandboxProduct', () => {
    it('should detect source marker', () => {
      expect(isSandboxProduct({ source: 'sandbox_sync' })).toBe(true);
    });

    it('should detect id pattern', () => {
      expect(isSandboxProduct({ id: 'sandbox-test-123' })).toBe(true);
      expect(isSandboxProduct({ id: 'SANDBOX-test' })).toBe(true);
    });

    it('should detect squareId pattern', () => {
      expect(isSandboxProduct({ squareId: 'sandbox-square-456' })).toBe(true);
    });

    it('should detect sync environment marker', () => {
      expect(isSandboxProduct({ _squareSyncEnv: 'sandbox' })).toBe(true);
    });

    it('should not flag production products', () => {
      expect(isSandboxProduct({ 
        id: 'prod-001',
        source: 'square_sync',
        squareId: 'sq_catalog_001'
      })).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isSandboxProduct(null)).toBe(false);
      expect(isSandboxProduct(undefined)).toBe(false);
      expect(isSandboxProduct({})).toBe(false);
    });
  });

  describe('filterOutSandboxProducts', () => {
    const productList = [
      {
        id: 'prod-001',
        name: 'Real Product 1',
        source: 'square_sync'
      },
      {
        id: 'sandbox-test-001',
        name: 'Sandbox Test 1',
        source: 'sandbox_sync'
      },
      {
        id: 'prod-002',
        name: 'Real Product 2',
        source: 'square_sync'
      },
      {
        id: 'sandbox-test-002',
        name: 'Sandbox Test 2',
        source: 'sandbox_sync'
      }
    ];

    it('should remove all sandbox products', () => {
      const filtered = filterOutSandboxProducts(productList);
      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe('prod-001');
      expect(filtered[1].id).toBe('prod-002');
    });

    it('should preserve production products', () => {
      const filtered = filterOutSandboxProducts(productList);
      expect(filtered.every(p => !p.id.match(/^sandbox-/i))).toBe(true);
    });

    it('should handle empty array', () => {
      const filtered = filterOutSandboxProducts([]);
      expect(filtered).toEqual([]);
    });

    it('should handle non-array input', () => {
      expect(filterOutSandboxProducts(null)).toEqual([]);
      expect(filterOutSandboxProducts(undefined)).toEqual([]);
    });
  });

  describe('validateNoSandboxProducts', () => {
    it('should pass validation for production-only products', () => {
      const products = [
        { id: 'prod-001', name: 'Real 1', source: 'square_sync' },
        { id: 'prod-002', name: 'Real 2', source: 'square_sync' }
      ];
      expect(() => validateNoSandboxProducts(products)).not.toThrow();
    });

    it('should throw error if sandbox products present', () => {
      const products = [
        { id: 'prod-001', name: 'Real 1', source: 'square_sync' },
        { id: 'sandbox-001', name: 'Sandbox', source: 'sandbox_sync' }
      ];
      expect(() => validateNoSandboxProducts(products)).toThrow();
    });

    it('should include count in error', () => {
      const products = [
        { id: 'sandbox-001', source: 'sandbox_sync' },
        { id: 'sandbox-002', source: 'sandbox_sync' }
      ];
      try {
        validateNoSandboxProducts(products);
      } catch (error) {
        expect(error.count).toBe(2);
      }
    });
  });

  describe('sanitizeProductForClient', () => {
    const product = {
      id: 'prod-001',
      name: 'Test Product',
      description: 'A test product',
      price: 29.99,
      priceCents: 2999,
      source: 'square_sync', // Should be removed
      _squareSyncEnv: 'sandbox', // Should be removed
      _syncedAt: new Date(), // Should be removed
      squareData: {
        catalogObjectId: 'sq_001',
        variationId: 'sq_var_001',
        categoryId: 'sq_cat_001',
        secret: 'should-be-removed' // Should be removed
      }
    };

    it('should keep safe fields', () => {
      const safe = sanitizeProductForClient(product);
      expect(safe.id).toBe('prod-001');
      expect(safe.name).toBe('Test Product');
      expect(safe.price).toBe(29.99);
    });

    it('should remove internal fields', () => {
      const safe = sanitizeProductForClient(product);
      expect(safe.source).toBeUndefined();
      expect(safe._squareSyncEnv).toBeUndefined();
      expect(safe._syncedAt).toBeUndefined();
    });

    it('should sanitize squareData', () => {
      const safe = sanitizeProductForClient(product);
      expect(safe.squareData.catalogObjectId).toBe('sq_001');
      expect(safe.squareData.secret).toBeUndefined(); // Extra fields removed
    });

    it('should handle null input', () => {
      expect(sanitizeProductForClient(null)).toBeNull();
    });
  });

  describe('Defense in Depth', () => {
    it('should filter sandbox from search results even if query allows it', () => {
      // This tests the real-world scenario where $or search might bypass $nor
      const searchResults = [
        { id: 'prod-real', name: 'Sea Moss Gel', source: 'square_sync' },
        { id: 'sandbox-search-test', name: 'Sea Moss Test', source: 'sandbox_sync' }
      ];

      const filtered = filterOutSandboxProducts(searchResults);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('prod-real');
    });

    it('should handle multiple sandbox detection vectors', () => {
      const products = [
        { id: 'sandbox-by-id' },
        { squareId: 'sandbox-by-squareid' },
        { source: 'sandbox_sync' },
        { _squareSyncEnv: 'sandbox' }
      ];

      expect(filterOutSandboxProducts(products)).toHaveLength(0);
    });
  });
});

describe('API Response Safety', () => {
  it('should not expose internal sync markers in API response', () => {
    const rawProduct = {
      id: 'prod-001',
      name: 'Test',
      source: 'square_sync',
      _squareSyncEnv: 'production',
      _syncedAt: new Date(),
      _syncedFrom: 'square_api'
    };

    const safe = sanitizeProductForClient(rawProduct);
    
    const dangerousFields = ['source', '_squareSyncEnv', '_syncedAt', '_syncedFrom'];
    dangerousFields.forEach(field => {
      expect(safe).not.toHaveProperty(field);
    });
  });

  it('should validate complete product list before returning', () => {
    const response = [
      { id: 'prod-001', name: 'Real' },
      { id: 'prod-002', name: 'Real' },
      { id: 'sandbox-001', name: 'Sandbox', source: 'sandbox_sync' }
    ];

    expect(() => validateNoSandboxProducts(response, 'test')).toThrow();
  });
});
