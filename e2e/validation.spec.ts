import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  
  await page.waitForLoadState('networkidle');
  
  // Check for key elements - use first() to handle multiple headings
  await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible({ timeout: 10000 });
  
  console.log('✅ Homepage validation passed');
});

test('products API returns data', async ({ page }) => {
  const response = await page.request.get('/api/products');
  
  expect(response.status()).toBe(200);
  
  const data = await response.json();
  // Handle both array and object with products property
  const products = Array.isArray(data) ? data : (data.products || data);
  expect(Array.isArray(products) || typeof products === 'object').toBeTruthy();
  
  const productCount = Array.isArray(products) ? products.length : Object.keys(products).length;
  expect(productCount).toBeGreaterThan(0);
  
  console.log(`✅ Products API returned ${productCount} products`);
});

test('health check endpoint works', async ({ page }) => {
  const response = await page.request.get('/api/health');
  
  expect(response.status()).toBe(200);
  
  const data = await response.json();
  // Accept both 'healthy' and 'ok'
  expect(data.status).toMatch(/healthy|ok/i);
  
  console.log('✅ Health check passed');
});
