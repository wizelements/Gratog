/**
 * SQUARE PAYMENT TESTS - PHASE 2: SDK Initialization
 * 
 * Tests Square SDK loading, initialization, and client creation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSquareClient, getSquareLocationId, getSquareApplicationId } from '@/lib/square';

describe('Square SDK Initialization Tests', () => {
  describe('getSquareClient()', () => {
    it('should create Square client without errors', () => {
      expect(() => getSquareClient()).not.toThrow();
    });

    it('should return SquareClient instance', () => {
      const client = getSquareClient();
      expect(client).toBeDefined();
      expect(client).toHaveProperty('catalog');
      expect(client).toHaveProperty('payments');
      expect(client).toHaveProperty('orders');
      expect(client).toHaveProperty('checkout');
    });

    it('should create new client instance on each call', () => {
      const client1 = getSquareClient();
      const client2 = getSquareClient();
      // Should be different instances to avoid caching issues
      expect(client1).not.toBe(client2);
    });

    it('should throw error if SQUARE_ACCESS_TOKEN is missing', () => {
      const originalToken = process.env.SQUARE_ACCESS_TOKEN;
      delete process.env.SQUARE_ACCESS_TOKEN;
      
      expect(() => getSquareClient()).toThrow(/SQUARE_ACCESS_TOKEN/);
      
      process.env.SQUARE_ACCESS_TOKEN = originalToken;
    });

    it('should throw error for invalid environment value', () => {
      const originalEnv = process.env.SQUARE_ENVIRONMENT;
      process.env.SQUARE_ENVIRONMENT = 'invalid';
      
      expect(() => getSquareClient()).toThrow(/Invalid SQUARE_ENVIRONMENT/);
      
      process.env.SQUARE_ENVIRONMENT = originalEnv;
    });

    it('should handle environment variable trimming', () => {
      const originalEnv = process.env.SQUARE_ENVIRONMENT;
      const originalToken = process.env.SQUARE_ACCESS_TOKEN;
      
      process.env.SQUARE_ENVIRONMENT = '  production  ';
      process.env.SQUARE_ACCESS_TOKEN = originalToken;
      
      expect(() => getSquareClient()).not.toThrow();
      
      process.env.SQUARE_ENVIRONMENT = originalEnv;
    });

    it('should warn on token/environment mismatch', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalEnv = process.env.SQUARE_ENVIRONMENT;
      const originalToken = process.env.SQUARE_ACCESS_TOKEN;
      
      // Production token with sandbox environment
      if (originalToken?.startsWith('EAAA')) {
        process.env.SQUARE_ENVIRONMENT = 'sandbox';
        getSquareClient();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Production token with sandbox environment/));
      }
      
      process.env.SQUARE_ENVIRONMENT = originalEnv;
      process.env.SQUARE_ACCESS_TOKEN = originalToken;
      consoleSpy.mockRestore();
    });
  });

  describe('getSquareLocationId()', () => {
    it('should return location ID', () => {
      const locationId = getSquareLocationId();
      expect(locationId).toBeDefined();
      expect(typeof locationId).toBe('string');
      expect(locationId.length).toBeGreaterThan(0);
    });

    it('should throw error if SQUARE_LOCATION_ID is missing', () => {
      const original = process.env.SQUARE_LOCATION_ID;
      delete process.env.SQUARE_LOCATION_ID;
      
      expect(() => getSquareLocationId()).toThrow(/SQUARE_LOCATION_ID/);
      
      process.env.SQUARE_LOCATION_ID = original;
    });
  });

  describe('getSquareApplicationId()', () => {
    it('should return application ID', () => {
      const appId = getSquareApplicationId();
      expect(appId).toBeDefined();
      expect(typeof appId).toBe('string');
      expect(appId).toMatch(/^sq0idp-/);
    });

    it('should throw error if NEXT_PUBLIC_SQUARE_APPLICATION_ID is missing', () => {
      const original = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
      delete process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
      
      expect(() => getSquareApplicationId()).toThrow(/NEXT_PUBLIC_SQUARE_APPLICATION_ID/);
      
      process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID = original;
    });
  });

  describe('Square Client API Structure', () => {
    let client: any;

    beforeEach(() => {
      client = getSquareClient();
    });

    it('should have catalog API', () => {
      expect(client.catalog).toBeDefined();
      // SDK v43 uses .list() and .batchGet() instead of listCatalog and batchRetrieveCatalogObjects
      expect(typeof client.catalog.list).toBe('function');
      expect(typeof client.catalog.batchGet).toBe('function');
    });

    it('should have payments API', () => {
      expect(client.payments).toBeDefined();
      expect(typeof client.payments.create).toBe('function');
      expect(typeof client.payments.get).toBe('function');
    });

    it('should have orders API', () => {
      expect(client.orders).toBeDefined();
      expect(typeof client.orders.create).toBe('function');
      expect(typeof client.orders.get).toBe('function');
    });

    it('should have checkout API', () => {
      expect(client.checkout).toBeDefined();
      // SDK v43 uses checkout.paymentLinks
      expect(client.checkout.paymentLinks).toBeDefined();
      expect(typeof client.checkout.paymentLinks.create).toBe('function');
      expect(typeof client.checkout.paymentLinks.get).toBe('function');
    });

    it('should have locations API', () => {
      expect(client.locations).toBeDefined();
      expect(typeof client.locations.list).toBe('function');
    });
  });
});
