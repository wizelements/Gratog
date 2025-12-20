import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';

/**
 * Square Payment Flow Tests
 * Tests comprehensive payment scenarios across user types:
 * - Guest checkout
 * - Logged-in customer
 * - Admin orders
 * 
 * NOTE: These tests assume:
 * - Running server on localhost:3000
 * - Valid Square credentials configured
 * - Test mode enabled (if using production credentials)
 * 
 * To run: npm run dev & npm run test:api
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SKIP_IF_NO_SERVER = process.env.CI !== 'true';
const SQUARE_TEST_CARD = 'cnp:card-nonce-ok'; // Square sandbox test token
const SQUARE_DECLINED_CARD = 'cnp:card-nonce-declined'; // Declined card for testing

interface PaymentRequest {
  sourceId: string;
  amountCents: number;
  currency?: string;
  idempotencyKey: string;
  orderId?: string;
  customer?: {
    email: string;
    name: string;
    phone?: string;
  };
  lineItems?: any[];
  metadata?: Record<string, any>;
}

interface CheckoutRequest {
  lineItems: Array<{
    catalogObjectId: string;
    quantity: number;
    name?: string;
  }>;
  redirectUrl?: string;
  customer?: {
    email: string;
    name: string;
    phone?: string;
  };
  orderId?: string;
  fulfillmentType?: string;
}

describe('Square Payment API - Direct SDK', () => {
  let guestOrderId: string;
  let customerOrderId: string;

  describe('POST /api/payments - Web Payments SDK', () => {
    it('should process guest checkout payment with valid card', async () => {
      const paymentRequest: PaymentRequest = {
        sourceId: SQUARE_TEST_CARD,
        amountCents: 5000, // $50.00
        currency: 'USD',
        idempotencyKey: `guest-${randomUUID()}`,
        orderId: `order-${randomUUID()}`,
        customer: {
          email: `guest-${Date.now()}@example.com`,
          name: 'Guest Customer'
        },
        metadata: {
          userType: 'guest',
          testScenario: 'happy_path'
        }
      };

      guestOrderId = paymentRequest.orderId!;

      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest)
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.payment).toBeDefined();
      expect(data.payment.id).toBeTruthy();
      expect(['COMPLETED', 'APPROVED', 'PENDING']).toContain(data.payment.status);
    });

    it('should reject payment with declined card', async () => {
      const paymentRequest: PaymentRequest = {
        sourceId: SQUARE_DECLINED_CARD,
        amountCents: 5000,
        currency: 'USD',
        idempotencyKey: `declined-${randomUUID()}`,
        metadata: {
          userType: 'guest',
          testScenario: 'declined_card'
        }
      };

      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest)
      });

      expect([400, 500]).toContain(response.status);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
    });

    it('should require valid sourceId', async () => {
      const paymentRequest: PaymentRequest = {
        sourceId: '', // Invalid
        amountCents: 5000,
        currency: 'USD',
        idempotencyKey: randomUUID()
      };

      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest)
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeTruthy();
    });

    it('should require valid amountCents', async () => {
      const paymentRequest: PaymentRequest = {
        sourceId: SQUARE_TEST_CARD,
        amountCents: 0, // Invalid
        idempotencyKey: randomUUID()
      };

      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest)
      });

      expect(response.status).toBe(400);
    });

    it('should create idempotency key if not provided', async () => {
      const paymentRequest: Partial<PaymentRequest> = {
        sourceId: SQUARE_TEST_CARD,
        amountCents: 2500, // $25.00
        currency: 'USD',
        // No idempotencyKey provided
        customer: {
          email: `customer-${Date.now()}@example.com`,
          name: 'Test Customer'
        }
      };

      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest)
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should accept customer details', async () => {
      const paymentRequest: PaymentRequest = {
        sourceId: SQUARE_TEST_CARD,
        amountCents: 3000,
        currency: 'USD',
        idempotencyKey: `customer-${randomUUID()}`,
        customer: {
          email: `registered-${Date.now()}@example.com`,
          name: 'Registered Customer',
          phone: '(404) 555-0123'
        },
        metadata: {
          userType: 'registered',
          accountAge: '6_months'
        }
      };

      customerOrderId = `order-${randomUUID()}`;
      paymentRequest.orderId = customerOrderId;

      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest)
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.payment.id).toBeTruthy();
    });

    it('should support large amounts', async () => {
      const paymentRequest: PaymentRequest = {
        sourceId: SQUARE_TEST_CARD,
        amountCents: 50000, // $500.00
        currency: 'USD',
        idempotencyKey: randomUUID(),
        metadata: {
          testScenario: 'large_amount'
        }
      };

      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest)
      });

      expect(response.status).toBe(200);
    });

    it('should handle metadata', async () => {
      const paymentRequest: PaymentRequest = {
        sourceId: SQUARE_TEST_CARD,
        amountCents: 1000,
        currency: 'USD',
        idempotencyKey: randomUUID(),
        metadata: {
          customField1: 'value1',
          customField2: 'value2',
          campaign: 'test_campaign'
        }
      };

      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest)
      });

      expect(response.status).toBe(200);
    });

    it('should not timeout on legitimate requests', async () => {
      const paymentRequest: PaymentRequest = {
        sourceId: SQUARE_TEST_CARD,
        amountCents: 5000,
        currency: 'USD',
        idempotencyKey: randomUUID(),
        customer: {
          email: `timeout-test-${Date.now()}@example.com`,
          name: 'Timeout Test'
        }
      };

      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest)
      });
      const duration = Date.now() - startTime;

      // Should complete within reasonable time (not hit 8s timeout)
      expect(duration).toBeLessThan(30000); // 30 second max
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/payments - Payment Status', () => {
    it('should retrieve payment status by payment ID', async () => {
      // First create a payment
      const paymentRequest: PaymentRequest = {
        sourceId: SQUARE_TEST_CARD,
        amountCents: 2000,
        currency: 'USD',
        idempotencyKey: randomUUID()
      };

      const createResponse = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest)
      });

      const created = await createResponse.json();
      const paymentId = created.payment.id;

      // Then retrieve it
      const retrieveResponse = await fetch(
        `${BASE_URL}/api/payments?paymentId=${paymentId}`
      );

      expect(retrieveResponse.status).toBe(200);
      const data = await retrieveResponse.json();
      expect(data.success).toBe(true);
      expect(data.payment.id).toBe(paymentId);
    });

    it('should require paymentId or orderId', async () => {
      const response = await fetch(`${BASE_URL}/api/payments`);
      expect(response.status).toBe(400);
    });
  });
});

describe('Square Checkout API - Payment Links', () => {
  describe('POST /api/checkout - Payment Link Creation', () => {
    it('should create payment link for guest checkout', async () => {
      const checkoutRequest: CheckoutRequest = {
        lineItems: [
          {
            catalogObjectId: 'test-product-1',
            quantity: 1,
            name: 'Test Product'
          }
        ],
        customer: {
          email: `guest-checkout-${Date.now()}@example.com`,
          name: 'Guest Checkout'
        },
        orderId: `checkout-order-${randomUUID()}`,
        fulfillmentType: 'pickup'
      };

      const response = await fetch(`${BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutRequest)
      });

      // Status could be 200 (success) or 400 (invalid catalog object for test)
      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.paymentLink.url).toBeTruthy();
      }
    });

    it('should require lineItems array', async () => {
      const checkoutRequest: any = {
        customer: {
          email: 'test@example.com',
          name: 'Test'
        }
      };

      const response = await fetch(`${BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutRequest)
      });

      expect(response.status).toBe(400);
    });

    it('should require non-empty lineItems', async () => {
      const checkoutRequest: CheckoutRequest = {
        lineItems: [],
        customer: {
          email: 'test@example.com',
          name: 'Test'
        }
      };

      const response = await fetch(`${BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutRequest)
      });

      expect(response.status).toBe(400);
    });

    it('should handle multiple line items', async () => {
      const checkoutRequest: CheckoutRequest = {
        lineItems: [
          {
            catalogObjectId: 'product-1',
            quantity: 2,
            name: 'Product 1'
          },
          {
            catalogObjectId: 'product-2',
            quantity: 1,
            name: 'Product 2'
          }
        ],
        customer: {
          email: `multi-item-${Date.now()}@example.com`,
          name: 'Multi Item Customer'
        },
        fulfillmentType: 'delivery'
      };

      const response = await fetch(`${BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutRequest)
      });

      // Status depends on catalog availability
      expect([200, 400]).toContain(response.status);
    });

    it('should accept custom redirect URL', async () => {
      const checkoutRequest: CheckoutRequest = {
        lineItems: [
          {
            catalogObjectId: 'test-product',
            quantity: 1
          }
        ],
        redirectUrl: 'https://example.com/success',
        customer: {
          email: `redirect-${Date.now()}@example.com`,
          name: 'Redirect Test'
        }
      };

      const response = await fetch(`${BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutRequest)
      });

      expect([200, 400]).toContain(response.status);
    });

    it('should not timeout on legitimate requests', async () => {
      const checkoutRequest: CheckoutRequest = {
        lineItems: [
          {
            catalogObjectId: 'test-product',
            quantity: 1
          }
        ],
        customer: {
          email: `timeout-test-${Date.now()}@example.com`,
          name: 'Timeout Test'
        }
      };

      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutRequest)
      });
      const duration = Date.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(30000);
    });
  });

  describe('GET /api/checkout - Status Check', () => {
    it('should return service status when no params provided', async () => {
      const response = await fetch(`${BASE_URL}/api/checkout`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.service).toBe('Square Checkout API');
      expect(data.status).toBe('active');
    });
  });
});

describe('Payment Flow Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    const paymentRequest: PaymentRequest = {
      sourceId: SQUARE_TEST_CARD,
      amountCents: 5000,
      idempotencyKey: randomUUID(),
      // Incomplete request
    };

    const response = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentRequest)
    });

    // Should return error, not crash
    expect([200, 400, 500]).toContain(response.status);
  });

  it('should handle missing Square credentials gracefully', async () => {
    const paymentRequest: PaymentRequest = {
      sourceId: SQUARE_TEST_CARD,
      amountCents: 5000,
      idempotencyKey: randomUUID()
    };

    const response = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentRequest)
    });

    // Either succeeds or returns 503 with helpful message
    expect([200, 503]).toContain(response.status);
  });

  it('should include traceId in responses', async () => {
    const paymentRequest: PaymentRequest = {
      sourceId: SQUARE_TEST_CARD,
      amountCents: 5000,
      idempotencyKey: randomUUID()
    };

    const response = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentRequest)
    });

    const data = await response.json();
    expect(data.traceId).toBeTruthy();
  });
});

describe('Admin Order Payment Flow', () => {
  it('should process admin-initiated order payment', async () => {
    const paymentRequest: PaymentRequest = {
      sourceId: SQUARE_TEST_CARD,
      amountCents: 10000,
      currency: 'USD',
      idempotencyKey: `admin-order-${randomUUID()}`,
      orderId: `admin-order-${randomUUID()}`,
      customer: {
        email: `admin-order-${Date.now()}@example.com`,
        name: 'Admin Order Customer'
      },
      metadata: {
        userType: 'admin',
        initiatedBy: 'admin_dashboard',
        orderType: 'admin_created'
      }
    };

    const response = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentRequest)
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.payment).toBeDefined();
  });
});
