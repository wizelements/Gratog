import { test, expect } from '@playwright/test';

test.describe('API Security', () => {
  test('should require API authentication for protected endpoints', async ({ page }) => {
    // Try to access protected API endpoint without auth
    const response = await page.goto('/api/admin/orders').catch(() => null);
    
    if (response) {
      // Should return 401, 403, or redirect to login
      expect([401, 403]).toContain(response.status());
    }
  });

  test('should not expose sensitive API keys in responses', async ({ page }) => {
    const responses: any[] = [];
    
    page.on('response', async (response) => {
      try {
        const text = await response.text();
        responses.push({
          url: response.url(),
          body: text,
          status: response.status(),
        });
      } catch {
        // Binary response, skip
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that no secret keys are exposed
    for (const res of responses) {
      if (res.body) {
        expect(res.body).not.toContain('sk_test_');
        expect(res.body).not.toContain('sk_live_');
        expect(res.body).not.toContain('secret_key');
        expect(res.body).not.toContain('private_key');
      }
    }
  });

  test('should properly validate API request methods', async ({ page }) => {
    // Try invalid HTTP methods on API endpoints
    const response = await page.context().request.put('/api/config', {
      data: { test: true },
    }).catch(() => null);
    
    // Should return 405 Method Not Allowed or similar
    if (response) {
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('should include security headers in API responses', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers();
    
    // API responses should have security headers
    expect(headers?.['x-content-type-options']).toBeDefined();
    expect(headers?.['content-security-policy']).toBeDefined();
  });

  test('should validate content-type in requests', async ({ page }) => {
    const capturedRequests: any[] = [];
    
    page.on('request', (request) => {
      if (request.method() === 'POST') {
        capturedRequests.push({
          url: request.url(),
          contentType: request.postDataJSON().catch(() => null),
        });
      }
    });
    
    await page.goto('/checkout');
    
    // POST requests should have proper content-type
    for (const req of capturedRequests) {
      if (req.url.includes('/api/')) {
        const headers = req.headers || {};
        // Content-Type should be set
        expect(headers['content-type']).toBeDefined();
      }
    }
  });

  test('should not expose internal API details', async ({ page }) => {
    // Try to access internal API info
    const response = await page.goto('/api/internal').catch(() => null);
    
    if (response?.status() === 404) {
      const content = await page.content();
      
      // 404 should not expose internal paths
      expect(content).not.toMatch(/\/src\//);
      expect(content).not.toMatch(/\/app\//);
    }
  });

  test('should handle API errors securely', async ({ page }) => {
    const errorResponses: any[] = [];
    
    page.on('response', async (response) => {
      if (response.status() >= 400) {
        try {
          const body = await response.text();
          errorResponses.push(body);
        } catch {
          // Skip binary responses
        }
      }
    });
    
    // Trigger some errors
    await page.goto('/api/nonexistent').catch(() => null);
    
    // Error responses should not expose sensitive info
    for (const errBody of errorResponses) {
      expect(errBody).not.toMatch(/SQL|database|MySQL|PostgreSQL/i);
      expect(errBody).not.toMatch(/\/home\/\w+/);
      expect(errBody).not.toMatch(/C:\\Users\\/);
    }
  });

  test('should not allow CORS from untrusted origins', async ({ page, context }) => {
    const response = await context.request.get('/', {
      headers: {
        'Origin': 'https://evil.com',
      },
    }).catch(() => null);
    
    if (response) {
      const corsHeader = response.headers()['access-control-allow-origin'];
      
      // Should not allow untrusted origins
      if (corsHeader) {
        expect(corsHeader).not.toBe('*');
        expect(corsHeader).not.toContain('evil.com');
      }
    }
  });

  test('should validate request payload size', async ({ page }) => {
    // Try to send extremely large payload
    const largePayload = 'x'.repeat(1000000); // 1MB
    
    const response = await page.context().request.post('/api/orders', {
      data: { description: largePayload },
    }).catch(() => null);
    
    // Should either reject or limit the payload
    if (response) {
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });
});
