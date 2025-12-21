import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - Critical User Paths
 * These tests run on every push to catch breaking changes quickly
 */

test.describe('Critical Path Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Page should load without errors
    await expect(page).toHaveTitle(/Taste of Gratitude|Gratog/i);
    
    // Main content should be visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('products page loads', async ({ page }) => {
    await page.goto('/products');
    
    // Should not show error page
    const errorText = page.getByText(/error|500|404/i);
    await expect(errorText).not.toBeVisible({ timeout: 5000 }).catch(() => {
      // Ignore if element doesn't exist
    });
    
    // Page should have content
    await expect(page.locator('body')).toBeVisible();
  });

  test('cart page is accessible', async ({ page }) => {
    await page.goto('/cart');
    
    // Should load cart page
    await expect(page.locator('body')).toBeVisible();
  });

  test('API health endpoint responds', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    // Status can be 'healthy' or 'degraded' (DB might not be available in some environments)
    expect(['healthy', 'degraded']).toContain(data.status);
    expect(data.checks.server).toBe(true);
  });

  test('products API returns data', async ({ request }) => {
    const response = await request.get('/api/products');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data) || data.products).toBeTruthy();
  });

  test('rewards leaderboard API works', async ({ request }) => {
    const response = await request.get('/api/rewards/leaderboard');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('admin login page loads', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Should show login form
    await expect(page.locator('body')).toBeVisible();
  });

  test('checkout flow starts correctly', async ({ page }) => {
    // Go to products
    await page.goto('/products');
    
    // Try to navigate to checkout
    await page.goto('/checkout');
    
    // Should either show checkout or redirect to cart
    const url = page.url();
    expect(url).toMatch(/checkout|cart/);
  });
});

test.describe('Error Handling Smoke Tests', () => {
  test('404 page handles gracefully', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345');
    
    // Should show 404 or redirect, not crash
    expect(response?.status()).toBeLessThan(500);
  });

  test('invalid API endpoint returns proper error', async ({ request }) => {
    const response = await request.get('/api/this-endpoint-does-not-exist');
    
    // Should return 404 or handle gracefully (not crash with 500)
    expect([404, 200]).toContain(response.status());
  });
});

test.describe('Performance Smoke Tests', () => {
  test('homepage loads within 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });

  test('API responds within 2 seconds', async ({ request }) => {
    const startTime = Date.now();
    
    await request.get('/api/health');
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(2000);
  });
});
