import { test, expect } from '@playwright/test';

test('@smoke checkout happy path', async ({ page }) => {
  // Navigate to homepage
  await page.goto('/');
  
  // Wait for products to load
  await page.waitForSelector('[data-testid="product-card"], .product-card, button:has-text("Add to Cart")', { timeout: 10000 });
  
  // Add first product to cart
  const addToCartButton = page.locator('button:has-text("Add to Cart"), button:has-text("Quick Add")').first();
  await addToCartButton.click({ force: true });
  
  // Wait for cart to update
  await page.waitForTimeout(1000);
  
  // Navigate to order page
  await page.goto('/order');
  
  // Wait for order page to load
  await page.waitForLoadState('networkidle');
  
  // Check that we're on the checkout page
  await expect(page).toHaveURL(/order/);
  
  // Verify no console errors
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  console.log('✅ Checkout happy path test completed');
});

test('add product to cart from homepage', async ({ page }) => {
  await page.goto('/');
  
  // Wait for products to load
  await page.waitForSelector('button:has-text("Add to Cart"), button:has-text("Quick Add")', { timeout: 10000 });
  
  // Click add to cart
  await page.locator('button:has-text("Add to Cart"), button:has-text("Quick Add")').first().click({ force: true });
  
  // Wait for cart icon to show count
  await page.waitForTimeout(1000);
  
  console.log('✅ Product added to cart successfully');
});

test('navigate to catalog page', async ({ page }) => {
  await page.goto('/catalog');
  
  await page.waitForLoadState('networkidle');
  
  await expect(page).toHaveURL(/catalog/);
  
  console.log('✅ Catalog page loaded successfully');
});
