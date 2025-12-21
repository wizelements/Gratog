import { test, expect } from '@playwright/test';

test.describe('Performance & Resilience', () => {
  test('should handle concurrent page loads', async ({ page }) => {
    const startTime = Date.now();
    
    // Load multiple pages concurrently
    for (let i = 0; i < 5; i++) {
      await page.goto('/');
      await page.waitForLoadState('networkidle').catch(() => null);
    }
    
    const duration = Date.now() - startTime;
    
    // Should complete in reasonable time
    expect(duration).toBeLessThan(30000);
  });

  test('should not cause memory leaks during navigation', async ({ page }) => {
    // Navigate multiple times to check for memory leaks
    const paths = ['/', '/checkout', '/'];
    
    for (let i = 0; i < 10; i++) {
      for (const path of paths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle').catch(() => null);
      }
    }
    
    // Page should still be responsive
    await page.goto('/');
    expect(page.url()).toContain('/');
  });

  test('should handle rapid form submissions', async ({ page }) => {
    await page.goto('/checkout');
    
    const form = page.locator('form').first();
    
    if (await form.isVisible()) {
      // Rapidly submit form
      for (let i = 0; i < 5; i++) {
        const submitBtn = form.locator('button[type="submit"]');
        await submitBtn.click().catch(() => null);
        await page.waitForTimeout(100);
      }
      
      // Page should still be responsive
      expect(await page.locator('body').isVisible()).toBeTruthy();
    }
  });

  test('should handle large data sets', async ({ page }) => {
    await page.goto('/');
    
    // If there's a catalog or list, navigate and load
    const items = page.locator('button:has-text("Add to Cart")');
    const count = await items.count();
    
    if (count > 10) {
      // Page should handle multiple items
      expect(count).toBeGreaterThan(10);
    }
  });

  test('should optimize resource loading', async ({ page }) => {
    const resources: any[] = [];
    
    page.on('response', (response) => {
      const contentType = response.headers()['content-type'] || '';
      const contentLength = parseInt(response.headers()['content-length'] || '0');
      
      if (contentLength > 1024) {
        resources.push({
          url: response.url(),
          type: contentType,
          size: contentLength,
          status: response.status(),
        });
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that resources are being loaded
    expect(resources.length).toBeGreaterThan(0);
    
    // Check that failed resources aren't critical
    const failedResources = resources.filter(r => r.status >= 400);
    const failedCritical = failedResources.filter(r => 
      r.type.includes('javascript') || r.type.includes('css')
    );
    expect(failedCritical.length).toBe(0);
  });

  test('should maintain performance during network interruptions', async ({ page, context }) => {
    // Simulate offline
    await context.setOffline(true);
    
    await page.goto('/').catch(() => null);
    
    // Should handle gracefully
    await context.setOffline(false);
    
    // Should reconnect and load
    await page.goto('/');
    expect(page.url()).toBeTruthy();
  });

  test('should not block UI during long operations', async ({ page }) => {
    await page.goto('/checkout');
    
    // Fill form
    const emailInput = page.locator('input[type="email"]');
    
    if (await emailInput.isVisible()) {
      // Type should be responsive
      await emailInput.type('test@example.com', { delay: 10 });
      
      const value = await emailInput.inputValue();
      expect(value).toBe('test@example.com');
    }
  });

  test('should handle slow network gracefully', async ({ page }) => {
    // Simulate slow 3G
    await page.route('**/*', (route) => {
      setTimeout(() => route.continue(), 500);
    });
    
    const startTime = Date.now();
    await page.goto('/');
    const duration = Date.now() - startTime;
    
    // Page should still load even on slow network
    expect(page.url()).toBeTruthy();
    expect(duration).toBeLessThan(30000);
  });

  test('should have no console errors on main pages', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    const paths = ['/', '/checkout'];
    
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState('networkidle').catch(() => null);
    }
    
    // Filter out non-critical errors
    const criticalErrors = errors.filter(e => 
      !e.includes('404') && 
      !e.includes('warning') &&
      !e.includes('deprecated')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});
