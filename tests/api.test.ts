/**
 * Product Link Reactor - API Tests
 * Tests for the REST API endpoints
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as catalogGet } from '../app/api/v1/catalog/route';
import { GET as healthGet } from '../app/api/v1/health/route';

// Mock database functions
jest.mock('../lib/database', () => ({
  queryCatalog: jest.fn(),
  getHealthMetrics: jest.fn()
}));

// Mock Redis/cache
jest.mock('../lib/redis', () => ({
  Cache: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn()
  },
  RateLimit: {
    check: jest.fn().mockReturnValue(true),
    getStatus: jest.fn().mockReturnValue({
      count: 1,
      remaining: 99,
      resetTime: Date.now() + 60000
    })
  }
}));

describe('Catalog API', () => {
  beforeAll(() => {
    // Mock database response
    const { queryCatalog } = require('../lib/database');
    queryCatalog.mockResolvedValue({
      items: [
        {
          slug: 'test-product',
          title: 'Test Product',
          description: 'A test product',
          variants: [{
            sku: 'TEST-001',
            options: {},
            price_cents: 1000,
            currency: 'USD',
            availability: 'in_stock'
          }],
          images: [{
            url: 'https://example.com/image.jpg',
            alt: 'Test Image'
          }],
          source_url: 'https://example.com/products/test',
          active: true
        }
      ],
      nextCursor: null,
      etag: 'test-etag'
    });
  });
  
  afterAll(() => {
    jest.restoreAllMocks();
  });
  
  it('should return catalog data successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/catalog');
    
    const response = await catalogGet(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.items).toBeDefined();
    expect(data.items).toHaveLength(1);
    expect(data.items[0].title).toBe('Test Product');
    expect(data.meta).toBeDefined();
    expect(data.meta.source).toBe('product_link');
  });
  
  it('should handle query parameters correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/catalog?q=test&limit=10&in_stock=1');
    
    const response = await catalogGet(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.meta.query.q).toBe('test');
    expect(data.meta.query.limit).toBe(10);
    expect(data.meta.query.in_stock).toBe('1');
  });
  
  it('should set proper cache headers', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/catalog');
    
    const response = await catalogGet(request);
    
    expect(response.headers.get('Cache-Control')).toBe('s-maxage=60, stale-while-revalidate=300');
    expect(response.headers.get('ETag')).toBe('test-etag');
    expect(response.headers.get('X-Cache')).toBe('MISS');
  });
  
  it('should handle rate limiting', async () => {
    const { RateLimit } = require('../lib/redis');
    RateLimit.check.mockReturnValueOnce(false);
    
    const request = new NextRequest('http://localhost:3000/api/v1/catalog');
    
    const response = await catalogGet(request);
    
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
  });
  
  it('should validate query parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/catalog?limit=invalid');
    
    const response = await catalogGet(request);
    
    expect(response.status).toBe(500); // Validation error
  });
});

describe('Health API', () => {
  beforeAll(() => {
    const { getHealthMetrics } = require('../lib/database');
    getHealthMetrics.mockResolvedValue({
      total_products: 10,
      total_variants: 15,
      crawl_success_rate: 95.5,
      avg_freshness_minutes: 30,
      unknown_stock_percentage: 5.0,
      oldest_crawl_minutes: 45,
      pending_crawls: 3
    });
  });
  
  it('should return healthy status', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/health');
    
    const response = await healthGet(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.services.database).toBe(true);
    expect(data.services.redis).toBe(true);
    expect(data.metrics.total_products).toBe(10);
    expect(data.metrics.crawl_success_rate).toBe(95.5);
  });
  
  it('should return degraded status when crawl rate is low', async () => {
    const { getHealthMetrics } = require('../lib/database');
    getHealthMetrics.mockResolvedValueOnce({
      total_products: 10,
      total_variants: 15,
      crawl_success_rate: 30.0, // Low success rate
      avg_freshness_minutes: 30,
      unknown_stock_percentage: 5.0,
      oldest_crawl_minutes: 45,
      pending_crawls: 3
    });
    
    const request = new NextRequest('http://localhost:3000/api/v1/health');
    
    const response = await healthGet(request);
    const data = await response.json();
    
    expect(data.status).toBe('degraded');
  });
  
  it('should return unhealthy status when database is down', async () => {
    const { getHealthMetrics } = require('../lib/database');
    getHealthMetrics.mockRejectedValueOnce(new Error('Database connection failed'));
    
    const request = new NextRequest('http://localhost:3000/api/v1/health');
    
    const response = await healthGet(request);
    const data = await response.json();
    
    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.services.database).toBe(false);
  });
  
  it('should set proper headers for monitoring', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/health');
    
    const response = await healthGet(request);
    
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    expect(response.headers.get('X-Response-Time')).toContain('ms');
    expect(response.headers.get('X-Environment')).toBeDefined();
  });
});

describe('Error Handling', () => {
  it('should handle database errors gracefully', async () => {
    const { queryCatalog } = require('../lib/database');
    queryCatalog.mockRejectedValueOnce(new Error('Database error'));
    
    const request = new NextRequest('http://localhost:3000/api/v1/catalog');
    
    const response = await catalogGet(request);
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(data.message).toBe('Database error');
  });
  
  it('should include response time in error responses', async () => {
    const { queryCatalog } = require('../lib/database');
    queryCatalog.mockRejectedValueOnce(new Error('Test error'));
    
    const request = new NextRequest('http://localhost:3000/api/v1/catalog');
    
    const response = await catalogGet(request);
    
    expect(response.headers.get('X-Response-Time')).toContain('ms');
  });
});
