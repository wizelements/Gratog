/**
 * SQUARE PAYMENT TESTS - PHASE 1: Environment Configuration
 * 
 * Tests all environment variables, configuration, and setup requirements
 * for Square payment integration.
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('Square Environment Configuration Tests', () => {
  describe('Critical Environment Variables', () => {
    it('should have NEXT_PUBLIC_SQUARE_APPLICATION_ID defined', () => {
      const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
      expect(appId).toBeDefined();
      expect(appId).not.toBe('');
      expect(appId).toMatch(/^sq0idp-/);
      expect(appId.length).toBeGreaterThan(20);
    });

    it('should have NEXT_PUBLIC_SQUARE_LOCATION_ID defined', () => {
      const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
      expect(locationId).toBeDefined();
      expect(locationId).not.toBe('');
      expect(locationId.length).toBeGreaterThan(5);
    });

    it('should have SQUARE_ACCESS_TOKEN defined', () => {
      const token = process.env.SQUARE_ACCESS_TOKEN;
      expect(token).toBeDefined();
      expect(token).not.toBe('');
      // Should be either sandbox or production token
      const isSandbox = token?.startsWith('sandbox-');
      const isProduction = token?.startsWith('EAAA') || token?.startsWith('sq0atp-');
      expect(isSandbox || isProduction).toBe(true);
    });

    it('should have SQUARE_ENVIRONMENT defined', () => {
      const env = process.env.SQUARE_ENVIRONMENT;
      expect(env).toBeDefined();
      expect(['production', 'sandbox']).toContain(env?.toLowerCase());
    });

    it('should have SQUARE_LOCATION_ID defined', () => {
      const locationId = process.env.SQUARE_LOCATION_ID;
      expect(locationId).toBeDefined();
      expect(locationId).not.toBe('');
    });
  });

  describe('Environment Variable Consistency', () => {
    it('should have matching location IDs between public and private vars', () => {
      const publicId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
      const privateId = process.env.SQUARE_LOCATION_ID;
      if (publicId && privateId) {
        expect(publicId).toBe(privateId);
      }
    });

    it('should have matching application IDs', () => {
      const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
      const altAppId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
      if (appId && altAppId) {
        expect(appId).toBe(altAppId);
      }
    });

    it('should have token/environment match (sandbox token with sandbox env)', () => {
      const token = process.env.SQUARE_ACCESS_TOKEN;
      const env = process.env.SQUARE_ENVIRONMENT;
      
      if (token && env) {
        const isSandboxToken = token.startsWith('sandbox-');
        const isSandboxEnv = env.toLowerCase() === 'sandbox';
        const isProductionToken = token.startsWith('EAAA') || token.startsWith('sq0atp-');
        const isProductionEnv = env.toLowerCase() === 'production';
        
        if (isSandboxToken) {
          expect(isSandboxEnv).toBe(true);
        }
        if (isProductionToken) {
          expect(isProductionEnv).toBe(true);
        }
      }
    });
  });

  describe('Optional Configuration', () => {
    it('should check for webhook signature key', () => {
      const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
      // Not required but recommended for production
      if (key) {
        expect(key.length).toBeGreaterThan(10);
      }
    });

    it('should check for OAuth client secret', () => {
      const secret = process.env.SQUARE_OAUTH_CLIENT_SECRET;
      // Optional for OAuth flow
      if (secret) {
        expect(secret.length).toBeGreaterThan(20);
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should not have placeholder values', () => {
      const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
      const token = process.env.SQUARE_ACCESS_TOKEN;
      
      expect(appId).not.toMatch(/YOUR_/i);
      expect(appId).not.toMatch(/REPLACE/i);
      expect(appId).not.toMatch(/TODO/i);
      expect(token).not.toMatch(/YOUR_/i);
      expect(token).not.toMatch(/REPLACE/i);
    });

    it('should not have test/example values', () => {
      const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
      const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
      
      expect(appId).not.toBe('test');
      expect(appId).not.toBe('example');
      expect(locationId).not.toBe('test');
      expect(locationId).not.toBe('example');
    });

    it('should not have whitespace in credentials', () => {
      const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
      const token = process.env.SQUARE_ACCESS_TOKEN;
      const locationId = process.env.SQUARE_LOCATION_ID;
      
      if (appId) expect(appId).toBe(appId.trim());
      if (token) expect(token).toBe(token.trim());
      if (locationId) expect(locationId).toBe(locationId.trim());
    });
  });
});
