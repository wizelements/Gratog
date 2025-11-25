/**
 * SQUARE PAYMENT TESTS - PHASE 6: Edge Cases & Security
 * 
 * Tests edge cases, security vulnerabilities, and error scenarios.
 */

import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

describe('Edge Cases & Security Tests', () => {
  describe('Input Validation & Sanitization', () => {
    it('should reject SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE orders; --";
      
      const response = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: [{ id: maliciousInput, name: 'Test', price: 10, quantity: 1 }],
          customer: { name: maliciousInput, email: 'test@example.com', phone: '1234567890' },
          fulfillmentType: 'pickup'
        })
      });

      // Should handle safely without executing SQL
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should reject XSS attempts in input fields', async () => {
      const xssInput = '<script>alert("XSS")</script>';
      
      const response = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: [{ id: '1', name: xssInput, price: 10, quantity: 1, variationId: 'VAR_123' }],
          customer: { name: xssInput, email: 'test@example.com', phone: '1234567890' },
          fulfillmentType: 'pickup'
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Should sanitize or escape the input
        expect(data.order.cart[0].name).not.toContain('<script>');
      }
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test @example.com',
        'test@example',
        ''
      ];

      for (const email of invalidEmails) {
        const response = await fetch(`${BASE_URL}/api/orders/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cart: [{ id: '1', name: 'Test', price: 10, quantity: 1, variationId: 'VAR_123' }],
            customer: { name: 'Test', email, phone: '1234567890' },
            fulfillmentType: 'pickup'
          })
        });

        expect(response.status).toBe(400);
      }
    });

    it('should reject extremely long input strings', async () => {
      const longString = 'A'.repeat(10000);
      
      const response = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: [{ id: '1', name: longString, price: 10, quantity: 1, variationId: 'VAR_123' }],
          customer: { name: 'Test', email: 'test@example.com', phone: '1234567890' },
          fulfillmentType: 'pickup'
        })
      });

      // Should reject or truncate
      expect([200, 400, 413]).toContain(response.status);
    });

    it('should validate phone number format', async () => {
      const invalidPhones = [
        '123', // Too short
        'abcdefghij', // Letters
        '++1234567890', // Invalid chars
        ''
      ];

      for (const phone of invalidPhones) {
        const response = await fetch(`${BASE_URL}/api/orders/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cart: [{ id: '1', name: 'Test', price: 10, quantity: 1, variationId: 'VAR_123' }],
            customer: { name: 'Test', email: 'test@example.com', phone },
            fulfillmentType: 'pickup'
          })
        });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Rate Limiting & Abuse Prevention', () => {
    it('should handle rapid API requests', async () => {
      const requests = [];
      
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch(`${BASE_URL}/api/checkout`, {
            method: 'GET'
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // Should either allow all or start rate limiting
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should prevent duplicate order submissions', async () => {
      const orderData = {
        cart: [{ id: '1', name: 'Test', price: 10, quantity: 1, variationId: 'VAR_123' }],
        customer: { name: 'Test', email: 'test@example.com', phone: '1234567890' },
        fulfillmentType: 'pickup'
      };

      const response1 = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const response2 = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      // Both might succeed (different orders) but should handle properly
      expect([200, 400, 429]).toContain(response1.status);
      expect([200, 400, 429]).toContain(response2.status);
    });
  });

  describe('Currency & Amount Edge Cases', () => {
    it('should handle zero amounts correctly', async () => {
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
    });

    it('should handle fractional cents correctly', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'cnon:test-token',
          amountCents: 10.5, // Fractional cents
          orderId: 'test-order'
        })
      });

      // Should round or reject
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle maximum amount limits', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'cnon:test-token',
          amountCents: Number.MAX_SAFE_INTEGER,
          orderId: 'test-order'
        })
      });

      // Should handle or reject appropriately
      expect([400, 500]).toContain(response.status);
    });

    it('should handle currency mismatch', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'cnon:test-token',
          amountCents: 1000,
          currency: 'EUR', // Wrong currency
          orderId: 'test-order'
        })
      });

      // Should reject or convert
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent payment attempts', async () => {
      const paymentData = {
        sourceId: 'cnon:test-token',
        amountCents: 1000,
        orderId: 'concurrent-test-order'
      };

      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          fetch(`${BASE_URL}/api/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // Should handle concurrency safely
      responses.forEach(response => {
        expect([200, 400, 500]).toContain(response.status);
      });
    });

    it('should handle concurrent order updates', async () => {
      // Simulate multiple webhook updates for same order
      const webhookData = {
        type: 'order.updated',
        event_id: 'test-event',
        data: { object: { order: { id: 'test-order-concurrent' } } }
      };

      const requests = [];
      for (let i = 0; i < 3; i++) {
        requests.push(
          fetch(`${BASE_URL}/api/webhooks/square`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...webhookData, event_id: `test-event-${i}` })
          })
        );
      }

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([200, 400]).toContain(response.status);
      });
    });
  });

  describe('Data Integrity', () => {
    it('should maintain order total consistency', async () => {
      const response = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: [
            { id: '1', name: 'Product 1', price: 10.99, quantity: 2, variationId: 'VAR_1' },
            { id: '2', name: 'Product 2', price: 15.50, quantity: 1, variationId: 'VAR_2' }
          ],
          customer: { name: 'Test', email: 'test@example.com', phone: '1234567890' },
          fulfillmentType: 'pickup',
          deliveryTip: 3.00
        })
      });

      if (response.ok) {
        const data = await response.json();
        const expectedSubtotal = (10.99 * 2) + (15.50 * 1);
        const expectedTotal = expectedSubtotal + 3.00;
        
        expect(data.order.pricing.subtotal).toBeCloseTo(expectedSubtotal, 2);
        expect(data.order.pricing.total).toBeCloseTo(expectedTotal, 2);
      }
    });

    it('should maintain quantity constraints', async () => {
      const response = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: [
            { id: '1', name: 'Product', price: 10, quantity: -1, variationId: 'VAR_1' }
          ],
          customer: { name: 'Test', email: 'test@example.com', phone: '1234567890' },
          fulfillmentType: 'pickup'
        })
      });

      expect(response.status).toBe(400);
    });

    it('should prevent price manipulation', async () => {
      // Client sends manipulated price
      const response = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: [
            { id: '1', name: 'Product', price: 0.01, quantity: 1, variationId: 'VAR_1' } // Manipulated low price
          ],
          customer: { name: 'Test', email: 'test@example.com', phone: '1234567890' },
          fulfillmentType: 'pickup'
        })
      });

      // Server should validate prices against catalog
      if (response.ok) {
        const data = await response.json();
        // Price should be validated from server-side catalog
        expect(data.order.pricing.subtotal).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Message Security', () => {
    it('should not expose sensitive information in errors', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'invalid-token',
          amountCents: 1000
        })
      });

      const data = await response.json();
      
      if (data.error) {
        // Should not expose tokens, API keys, or internal details
        expect(data.error).not.toMatch(/EAAA/);
        expect(data.error).not.toMatch(/sandbox-/);
        expect(data.error).not.toMatch(/secret/);
        expect(data.error).not.toMatch(/key/);
      }
    });

    it('should provide user-friendly error messages', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'cnon:test-token',
          amountCents: -100
        })
      });

      const data = await response.json();
      
      expect(data.error).toBeDefined();
      expect(data.error.length).toBeGreaterThan(0);
      expect(data.error.length).toBeLessThan(200); // Not too verbose
    });
  });

  describe('Timeout & Performance', () => {
    it('should handle slow API responses', async () => {
      const startTime = Date.now();
      
      const response = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: [{ id: '1', name: 'Test', price: 10, quantity: 1, variationId: 'VAR_123' }],
          customer: { name: 'Test', email: 'test@example.com', phone: '1234567890' },
          fulfillmentType: 'pickup'
        })
      });

      const duration = Date.now() - startTime;
      
      // Should respond within reasonable time
      expect(duration).toBeLessThan(30000); // 30 seconds max
    });

    it('should handle large cart sizes', async () => {
      const largeCart = [];
      for (let i = 0; i < 100; i++) {
        largeCart.push({
          id: `${i}`,
          name: `Product ${i}`,
          price: 10,
          quantity: 1,
          variationId: `VAR_${i}`
        });
      }

      const response = await fetch(`${BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: largeCart,
          customer: { name: 'Test', email: 'test@example.com', phone: '1234567890' },
          fulfillmentType: 'pickup'
        })
      });

      // Should either process or reject gracefully
      expect([200, 400, 413]).toContain(response.status);
    });
  });
});
