import { test, expect } from '@playwright/test';

test.describe('Data Protection', () => {
  test('should not expose sensitive data in DOM', async ({ page }) => {
    await page.goto('/checkout');
    await page.fill('input[type="email"]', 'test@example.com');
    
    const pageContent = await page.content();
    
    // Should not contain credit card patterns
    expect(pageContent).not.toMatch(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/);
    
    // Should not contain SSN patterns
    expect(pageContent).not.toMatch(/\d{3}-\d{2}-\d{4}/);
    
    // Should not contain secret API keys
    expect(pageContent).not.toContain('sk_test_');
    expect(pageContent).not.toContain('sk_live_');
  });

  test('should not expose sensitive data in network requests', async ({ page }) => {
    const capturedRequests: any[] = [];
    
    page.on('request', (request) => {
      capturedRequests.push({
        url: request.url(),
        postData: request.postData(),
      });
    });
    
    await page.goto('/checkout');
    await page.fill('input[name="email"]', 'test@example.com');
    
    // Check no sensitive data in URLs or request bodies
    for (const req of capturedRequests) {
      if (req.postData) {
        expect(req.postData).not.toContain('password=');
        expect(req.postData).not.toContain('cvv=');
        expect(req.postData).not.toContain('card=');
      }
      
      expect(req.url).not.toContain('password=');
      expect(req.url).not.toContain('token=');
    }
  });

  test('should use secure headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers();
    
    // Check for security headers
    if (headers?.['x-content-type-options']) {
      expect(headers['x-content-type-options']).toBe('nosniff');
    }
    
    if (headers?.['x-frame-options']) {
      expect(headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
    }
    
    if (headers?.['x-xss-protection']) {
      expect(['1; mode=block', '1']).toContain(headers['x-xss-protection']);
    }
  });

  test('should enforce HTTPS in production', async ({ page, context }) => {
    // Only check in production-like environments
    const baseURL = new URL(page.url()).origin;
    
    if (baseURL.includes('https')) {
      const response = await page.goto('/');
      expect(page.url()).toContain('https://');
    } else if (baseURL.includes('localhost') || baseURL.includes('127.0.0.1')) {
      // Allow HTTP for local development
      expect(page.url()).toContain('http://');
    }
  });

  test('should not cache sensitive pages', async ({ page }) => {
    const response = await page.goto('/checkout');
    const headers = response?.headers();
    
    // Check cache control headers
    const cacheControl = headers?.['cache-control'] || '';
    const pragma = headers?.['pragma'] || '';
    
    // Sensitive pages should not be cached
    if (page.url().includes('checkout') || page.url().includes('payment')) {
      expect(cacheControl.toLowerCase()).toMatch(/no-cache|no-store|private/);
    }
  });

  test('should sanitize error messages', async ({ page }) => {
    await page.goto('/checkout');
    
    // Trigger an error
    await page.fill('input[type="email"]', 'invalid');
    await page.fill('input[name="name"]', '<script>alert("xss")</script>');
    
    // Error message should not execute scripts
    const errorElement = page.locator('[role="alert"]');
    if (await errorElement.isVisible().catch(() => false)) {
      const errorText = await errorElement.textContent();
      expect(errorText).not.toContain('<script>');
      expect(errorText).not.toContain('javascript:');
    }
  });

  test('should not leak internal file paths', async ({ page }) => {
    // Trigger some errors to check error messages
    const response = await page.goto('/api/nonexistent').catch(() => null);
    
    if (response?.status() === 404) {
      const content = await page.content();
      
      // Should not expose file paths
      expect(content).not.toMatch(/\/home\/\w+\//);
      expect(content).not.toMatch(/\/var\/www\//);
      expect(content).not.toMatch(/C:\\Users\\/);
      expect(content).not.toMatch(/\/app\/.*\.js/);
    }
  });

  test('should not expose database errors', async ({ page }) => {
    // Try to trigger a database error
    await page.goto('/api/orders?id=invalid').catch(() => null);
    
    const content = await page.content();
    
    // Should not show SQL details
    expect(content).not.toMatch(/SQL|syntax|error in your SQL/i);
    expect(content).not.toMatch(/MySQL|PostgreSQL|MongoDB/i);
    expect(content).not.toMatch(/Table.*doesn't exist/i);
  });
});
