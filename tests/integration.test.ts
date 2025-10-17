/**
 * Product Link Reactor - Integration Tests
 * End-to-end integration tests for the complete system
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Test configuration
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_ADMIN_KEY = process.env.TEST_ADMIN_API_KEY || 'dev-key-123';

describe('Product Link Reactor - Integration Tests', () => {
  let testProductUrl: string;
  
  beforeAll(() => {
    // Set up test environment
    testProductUrl = 'https://tasteofgratitude.shop/products/test-product';
  });
  
  describe('Health Check Integration', () => {
    it('should return health status', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(data.services).toBeDefined();
      expect(data.metrics).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
  });
  
  describe('Catalog API Integration', () => {
    it('should fetch catalog data', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/catalog`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.meta).toBeDefined();
      expect(data.meta.source).toBeDefined();
      
      // Validate product structure if products exist
      if (data.items.length > 0) {
        const product = data.items[0];
        expect(product.slug).toBeDefined();
        expect(product.title).toBeDefined();
        expect(Array.isArray(product.variants)).toBe(true);
        expect(Array.isArray(product.images)).toBe(true);
      }
    });
    
    it('should handle search queries', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/catalog?q=sea moss&limit=5`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.meta.query.q).toBe('sea moss');
      expect(data.meta.query.limit).toBe(5);
    });
    
    it('should respect cache headers', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/catalog`);
      
      expect(response.headers.get('Cache-Control')).toContain('s-maxage');
      expect(response.headers.get('ETag')).toBeDefined();
    });
  });
  
  describe('Product Detail Integration', () => {
    it('should fetch individual product', async () => {
      // First get a product slug from catalog
      const catalogResponse = await fetch(`${TEST_BASE_URL}/api/v1/catalog?limit=1`);
      const catalogData = await catalogResponse.json();
      
      if (catalogData.items.length > 0) {
        const slug = catalogData.items[0].slug;
        
        const response = await fetch(`${TEST_BASE_URL}/api/v1/products/${slug}`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.slug).toBe(slug);
        expect(data.title).toBeDefined();
        expect(Array.isArray(data.variants)).toBe(true);
        expect(data.meta).toBeDefined();
      }
    });
    
    it('should handle validation requests', async () => {
      const catalogResponse = await fetch(`${TEST_BASE_URL}/api/v1/catalog?limit=1`);
      const catalogData = await catalogResponse.json();
      
      if (catalogData.items.length > 0) {
        const slug = catalogData.items[0].slug;
        
        const response = await fetch(`${TEST_BASE_URL}/api/v1/products/${slug}?validate=1`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.meta.validated).toBe(true);
        expect(response.headers.get('X-Validated')).toBe('true');
      }
    });
    
    it('should return 404 for non-existent products', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/products/non-existent-slug`);
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('Admin API Integration', () => {
    it('should require authentication for admin endpoints', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/admin/reindex`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ full: false })
      });
      
      expect(response.status).toBe(401);
    });
    
    it('should allow authenticated admin requests', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/admin/reindex`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TEST_ADMIN_KEY}`
        }
      });
      
      // Should not be 401 (might be 404 if no job exists, but not unauthorized)
      expect(response.status).not.toBe(401);
    });
  });
  
  describe('Cron Job Integration', () => {
    it('should execute hourly reindex cron', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/cron/hourly-reindex`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET || 'test'}`
        }
      });
      
      // Should accept the request (might take time to complete)
      expect([200, 202].includes(response.status)).toBe(true);
    });
  });
  
  describe('Performance Integration', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await fetch(`${TEST_BASE_URL}/api/v1/catalog`);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
      
      const responseTimeHeader = response.headers.get('X-Response-Time');
      expect(responseTimeHeader).toContain('ms');
    });
    
    it('should handle concurrent requests', async () => {
      const requests = [];
      
      // Make 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        requests.push(fetch(`${TEST_BASE_URL}/api/v1/health`));
      }
      
      const responses = await Promise.all(requests);
      
      // All should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
      }
    });
  });
  
  describe('Error Handling Integration', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/catalog?limit=invalid`);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
    
    it('should include proper error headers', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/products/`);
      
      expect(response.headers.get('Content-Type')).toContain('application/json');
      expect(response.headers.get('X-Response-Time')).toContain('ms');
    });
  });
  
  describe('Cache Integration', () => {
    it('should serve cached responses with proper headers', async () => {
      // First request
      const response1 = await fetch(`${TEST_BASE_URL}/api/v1/catalog`);
      const etag1 = response1.headers.get('ETag');
      
      // Second request should potentially be cached
      const response2 = await fetch(`${TEST_BASE_URL}/api/v1/catalog`);
      const etag2 = response2.headers.get('ETag');
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // ETags should be consistent for same content
      if (etag1 && etag2) {
        expect(etag1).toBe(etag2);
      }
    });
  });
});

// Load test simulation
describe('Load Testing Simulation', () => {
  it('should handle burst traffic', async () => {
    const requests = [];
    const startTime = Date.now();
    
    // Simulate 20 concurrent requests
    for (let i = 0; i < 20; i++) {
      requests.push(
        fetch(`${TEST_BASE_URL}/api/v1/catalog?page=${i}`)
          .then(response => ({
            status: response.status,
            time: Date.now() - startTime
          }))
      );
    }
    
    const results = await Promise.all(requests);
    
    // Most requests should succeed
    const successCount = results.filter(r => r.status === 200).length;
    expect(successCount).toBeGreaterThan(15); // At least 75% success rate
    
    // No request should take too long
    const maxTime = Math.max(...results.map(r => r.time));
    expect(maxTime).toBeLessThan(10000); // All should complete within 10 seconds
  });
});
