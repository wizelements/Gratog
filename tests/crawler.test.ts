/**
 * Product Link Reactor - Crawler Tests
 * Tests for the crawling and parsing functionality
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { crawlUrl, discoverProductUrls } from '../lib/crawler';
import { ProductZ } from '../types/product';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Product Crawler', () => {
  beforeAll(() => {
    // Set test environment variables
    process.env.CRAWL_RPS = '10';
    process.env.POLITENESS_MIN_MS = '100';
    process.env.POLITENESS_MAX_MS = '200';
  });
  
  afterAll(() => {
    jest.restoreAllMocks();
  });
  
  describe('JSON-LD Product Parsing', () => {
    it('should parse valid JSON-LD product data', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Product",
              "name": "Organic Sea Moss Gel",
              "description": "Premium wildcrafted sea moss gel",
              "brand": {
                "@type": "Brand",
                "name": "Taste of Gratitude"
              },
              "offers": {
                "@type": "Offer",
                "price": "35.00",
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock"
              },
              "image": [
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg"
              ]
            }
            </script>
          </head>
          <body></body>
        </html>
      `;
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });
      
      const product = await crawlUrl('https://example.com/products/sea-moss');
      
      expect(product).toBeTruthy();
      expect(product?.title).toBe('Organic Sea Moss Gel');
      expect(product?.description).toBe('Premium wildcrafted sea moss gel');
      expect(product?.brand).toBe('Taste of Gratitude');
      expect(product?.variants).toHaveLength(1);
      expect(product?.variants[0].price_cents).toBe(3500);
      expect(product?.variants[0].currency).toBe('USD');
      expect(product?.images).toHaveLength(2);
      
      // Validate with Zod schema
      expect(() => ProductZ.parse(product)).not.toThrow();
    });
    
    it('should handle multiple products in JSON-LD', async () => {
      const mockHtml = `
        <script type="application/ld+json">
        [{
          "@type": "Product",
          "name": "Product 1"
        }, {
          "@type": "Product",
          "name": "Product 2",
          "offers": {
            "price": "20.00",
            "priceCurrency": "USD"
          }
        }]
        </script>
      `;
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });
      
      const product = await crawlUrl('https://example.com/products/test');
      
      expect(product).toBeTruthy();
      expect(product?.title).toBe('Product 2'); // Should pick the one with offers
    });
  });
  
  describe('DOM Fallback Parsing', () => {
    it('should parse product from DOM when JSON-LD is not available', async () => {
      const mockHtml = `
        <html>
          <head>
            <title>Premium Sea Moss - $25.99</title>
            <meta name="description" content="High quality sea moss supplement" />
          </head>
          <body>
            <h1>Premium Sea Moss</h1>
            <p class="price">$25.99</p>
            <img src="/images/seamoss.jpg" alt="Sea Moss Product" />
            <img src="/images/seamoss2.jpg" alt="Sea Moss Nutrition" />
          </body>
        </html>
      `;
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });
      
      const product = await crawlUrl('https://example.com/products/premium-sea-moss');
      
      expect(product).toBeTruthy();
      expect(product?.title).toBe('Premium Sea Moss');
      expect(product?.variants).toHaveLength(1);
      expect(product?.variants[0].price_cents).toBe(2599);
      expect(product?.images).toHaveLength(2);
      expect(product?.slug).toBe('premium-sea-moss');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle HTTP errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      await expect(crawlUrl('https://example.com/invalid')).rejects.toThrow('Network error');
    });
    
    it('should handle invalid HTML gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('Invalid HTML content')
      });
      
      const product = await crawlUrl('https://example.com/invalid-page');
      expect(product).toBeNull();
    });
    
    it('should handle malformed JSON-LD', async () => {
      const mockHtml = `
        <script type="application/ld+json">
        { invalid json }
        </script>
      `;
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });
      
      const product = await crawlUrl('https://example.com/malformed');
      expect(product).toBeNull();
    });
  });
  
  describe('URL Discovery', () => {
    it('should discover product URLs from collection pages', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="/products/sea-moss-gel">Sea Moss Gel</a>
            <a href="/products/irish-moss">Irish Moss</a>
            <a href="/collections/supplements">Supplements</a>
            <a href="/about">About</a>
          </body>
        </html>
      `;
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });
      
      const urls = await discoverProductUrls('https://example.com');
      
      expect(urls).toContain('https://example.com/products/sea-moss-gel');
      expect(urls).toContain('https://example.com/products/irish-moss');
      expect(urls).not.toContain('https://example.com/about');
    });
  });
  
  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const startTime = Date.now();
      
      // Mock successful responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><h1>Test</h1></html>')
      });
      
      // Make multiple requests
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(crawlUrl(`https://example.com/test${i}`));
      }
      
      await Promise.all(promises);
      
      const elapsed = Date.now() - startTime;
      
      // Should take some time due to politeness delay
      expect(elapsed).toBeGreaterThan(200); // At least 200ms for politeness
    });
  });
});

describe('Product Validation', () => {
  it('should validate product schema correctly', () => {
    const validProduct = {
      slug: 'test-product',
      title: 'Test Product',
      description: 'A test product',
      variants: [{
        sku: 'TEST-001',
        options: {},
        price_cents: 1000,
        currency: 'USD',
        availability: 'in_stock' as const
      }],
      images: [{
        url: 'https://example.com/image.jpg',
        alt: 'Test Image'
      }],
      source_url: 'https://example.com/products/test',
      active: true
    };
    
    expect(() => ProductZ.parse(validProduct)).not.toThrow();
  });
  
  it('should reject invalid product schema', () => {
    const invalidProduct = {
      slug: '', // Invalid: empty slug
      title: 'Test Product',
      variants: [], // Invalid: no variants
      source_url: 'invalid-url' // Invalid: not a URL
    };
    
    expect(() => ProductZ.parse(invalidProduct)).toThrow();
  });
});
