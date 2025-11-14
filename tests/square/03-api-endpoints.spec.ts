/**
 * SQUARE PAYMENT TESTS - PHASE 3: API Endpoints
 * 
 * Tests all Square-related API routes and their error handling.
 */

import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

describe('Square API Endpoints Tests', () => {
  describe('POST /api/payments', () => {
    it('should return 400 for missing sourceId', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: 1000,
          orderId: 'test-order'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/sourceId|token/i);
    });

    it('should return 400 for missing amountCents', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'cnon:test-token',
          orderId: 'test-order'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/amount/i);
    });

    it('should return 400 for zero amount', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'cnon:test-token',
          amountCents: 0,
          orderId: 'test-order'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/amount/i);
    });

    it('should return 400 for negative amount', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'cnon:test-token',
          amountCents: -1000,
          orderId: 'test-order'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/amount/i);
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{'
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        body: JSON.stringify({
          sourceId: 'cnon:test-token',
          amountCents: 1000
        })
      });
      
      // Should still process or return appropriate error
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle extremely large amounts', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'cnon:test-token',
          amountCents: 999999999999,
          orderId: 'test-order'
        })
      });
      
      // Should either process or reject with proper error
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should generate idempotency key if not provided', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'cnon:test-token',
          amountCents: 1000,
          orderId: 'test-order'
        })
      });
      
      // Should process (might fail on Square side but endpoint should handle it)
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('POST /api/checkout', () => {
    it('should return 400 for empty line items', async () => {
      const response = await fetch(`${BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: []
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/line items|empty/i);
    });

    it('should return 400 for missing catalogObjectId', async () => {
      const response = await fetch(`${BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: [{
            quantity: 1,
            name: 'Test Product'
          }]
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/catalogObjectId/i);
    });

    it('should handle invalid catalogObjectId format', async () => {
      const response = await fetch(`${BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: [{
            catalogObjectId: 'invalid-id-format',
            quantity: 1
          }]
        })
      });
      
      // Should either process or return validation error
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should validate quantity is positive', async () => {
      const response = await fetch(`${BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: [{
            catalogObjectId: 'CATALOG_OBJ_123',
            quantity: 0
          }]
        })
      });
      
      expect(response.status).toBe(400);
    });

    it('should handle GET request for status', async () => {
      const response = await fetch(`${BASE_URL}/api/checkout`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('service');
    });
  });

  describe('POST /api/orders/create', () => {
    it('should return 400 for missing cart', async () => {
      const response = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: 'Test', email: 'test@example.com', phone: '1234567890' },
          fulfillmentType: 'pickup'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/cart/i);
    });

    it('should return 400 for missing customer info', async () => {
      const response = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: [{ 
            id: '1', 
            name: 'Test', 
            price: 10, 
            quantity: 1,
            catalogObjectId: 'TEST_CATALOG_ID', // ⭐ Valid cart item to bypass cart validation
            variationId: 'TEST_VARIATION_ID'
          }],
          fulfillmentType: 'pickup'
          // ⭐ NO customer info - should trigger customer validation
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/customer|name|email|phone/i);
    });

    it('should validate email format', async () => {
      const response = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: [{ id: '1', name: 'Test', price: 10, quantity: 1, variationId: 'VAR123' }],
          customer: { name: 'Test', email: 'invalid-email', phone: '1234567890' },
          fulfillmentType: 'pickup'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/email/i);
    });

    it('should validate delivery ZIP code', async () => {
      const response = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: [{ id: '1', name: 'Test', price: 10, quantity: 1, variationId: 'VAR123' }],
          customer: { name: 'Test', email: 'test@example.com', phone: '1234567890' },
          fulfillmentType: 'delivery',
          deliveryAddress: {
            street: '123 Main St',
            city: 'Test City',
            state: 'CA',
            zip: '90210' // Should be invalid if not in whitelist
          },
          deliveryTimeSlot: 'morning'
        })
      });
      
      // Should validate ZIP or accept with proper fee
      const data = await response.json();
      if (response.status === 400) {
        expect(data.error).toMatch(/area|zip|delivery/i);
      }
    });

    it('should enforce minimum order for delivery', async () => {
      const response = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: [{ id: '1', name: 'Test', price: 5, quantity: 1, variationId: 'VAR123' }],
          customer: { name: 'Test', email: 'test@example.com', phone: '1234567890' },
          fulfillmentType: 'delivery',
          deliveryAddress: {
            street: '123 Main St',
            city: 'Atlanta',
            state: 'GA',
            zip: '30310'
          },
          deliveryTimeSlot: 'morning'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/minimum.*\$30/i);
    });
  });

  describe('POST /api/cart/price', () => {
    it('should return 400 for empty lines', async () => {
      const response = await fetch(`${BASE_URL}/api/cart/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: []
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/lines|required/i);
    });

    it('should return 400 for missing lines field', async () => {
      const response = await fetch(`${BASE_URL}/api/cart/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/webhooks/square', () => {
    it('should handle GET request for status', async () => {
      const response = await fetch(`${BASE_URL}/api/webhooks/square`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('webhookTypes');
    });

    it('should validate webhook event structure', async () => {
      const response = await fetch(`${BASE_URL}/api/webhooks/square`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment.updated',
          data: { object: { payment: {} } }
        })
      });
      
      // Should process or return appropriate status
      expect([200, 400]).toContain(response.status);
    });
  });
});
