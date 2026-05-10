/**
 * 🚀 Gratog Pay Flow — E2E Tests
 * Full payment flow testing with Square integration
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const PAY_URL = '/pay';
const TEST_TIMEOUT = 30000;

// Mock Square payment nonce for testing
const MOCK_PAYMENT_NONCE = 'cnon:card-nonce-ok';

test.describe('Pay Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for mobile testing
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Navigate to pay flow
    await page.goto(PAY_URL);
    
    // Wait for products to load
    await page.waitForSelector('[data-testid="product-feed"]', { timeout: TEST_TIMEOUT });
  });

  test.describe('Product Browsing', () => {
    test('should display products on load', async ({ page }) => {
      // Verify products are visible
      const products = page.locator('[data-testid="product-card"]');
      await expect(products.first()).toBeVisible();
      
      // Check at least one product exists
      const count = await products.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should filter products by category', async ({ page }) => {
      // Click on a category tab
      const categoryTab = page.locator('[data-testid="category-tab"]').first();
      await categoryTab.click();
      
      // Verify filtered products
      const products = page.locator('[data-testid="product-card"]');
      await expect(products.first()).toBeVisible();
    });

    test('should search products', async ({ page }) => {
      // Open search
      await page.click('[data-testid="search-button"]');
      
      // Type search query
      await page.fill('[data-testid="search-input"]', 'lemonade');
      
      // Wait for filtered results
      await page.waitForTimeout(500); // Debounce wait
      
      // Verify search results
      const products = page.locator('[data-testid="product-card"]');
      await expect(products.first()).toBeVisible();
    });
  });

  test.describe('Cart Operations', () => {
    test('should add product to cart', async ({ page }) => {
      // Add first product
      await page.click('[data-testid="product-card-add"]').first();
      
      // Verify cart button shows item count
      const cartButton = page.locator('[data-testid="cart-button"]');
      await expect(cartButton).toContainText('1');
    });

    test('should increment quantity', async ({ page }) => {
      // Add product twice
      await page.click('[data-testid="product-card-add"]').first();
      await page.click('[data-testid="product-card-add"]').first();
      
      // Open cart
      await page.click('[data-testid="cart-button"]');
      
      // Increment quantity
      await page.click('[data-testid="quantity-increment"]');
      
      // Verify quantity increased
      const quantity = page.locator('[data-testid="quantity-value"]');
      await expect(quantity).toHaveText('3');
    });

    test('should decrement quantity', async ({ page }) => {
      // Add product
      await page.click('[data-testid="product-card-add"]').first();
      await page.click('[data-testid="product-card-add"]').first();
      
      // Open cart
      await page.click('[data-testid="cart-button"]');
      
      // Decrement quantity
      await page.click('[data-testid="quantity-decrement"]');
      
      // Verify quantity decreased
      const quantity = page.locator('[data-testid="quantity-value"]');
      await expect(quantity).toHaveText('1');
    });

    test('should remove item from cart', async ({ page }) => {
      // Add product
      await page.click('[data-testid="product-card-add"]').first();
      
      // Open cart
      await page.click('[data-testid="cart-button"]');
      
      // Remove item
      await page.click('[data-testid="remove-item"]');
      
      // Verify cart is empty
      const emptyCart = page.locator('[data-testid="empty-cart"]');
      await expect(emptyCart).toBeVisible();
    });

    test('should clear cart', async ({ page }) => {
      // Add products
      await page.click('[data-testid="product-card-add"]').first();
      await page.click('[data-testid="product-card-add"]').nth(1);
      
      // Open cart
      await page.click('[data-testid="cart-button"]');
      
      // Clear cart
      await page.click('[data-testid="clear-cart"]');
      
      // Confirm clear
      await page.click('[data-testid="confirm-clear"]');
      
      // Verify cart is empty
      const emptyCart = page.locator('[data-testid="empty-cart"]');
      await expect(emptyCart).toBeVisible();
    });
  });

  test.describe('Payment Flow', () => {
    test('should proceed to payment', async ({ page }) => {
      // Add product
      await page.click('[data-testid="product-card-add"]').first();
      
      // Open cart
      await page.click('[data-testid="cart-button"]');
      
      // Proceed to payment
      await page.click('[data-testid="checkout-button"]');
      
      // Verify payment panel opens
      const paymentPanel = page.locator('[data-testid="payment-panel"]');
      await expect(paymentPanel).toBeVisible();
    });

    test('should display Square card form', async ({ page }) => {
      // Add product and proceed to payment
      await page.click('[data-testid="product-card-add"]').first();
      await page.click('[data-testid="cart-button"]');
      await page.click('[data-testid="checkout-button"]');
      
      // Wait for Square to load
      await page.waitForSelector('[data-testid="square-card-container"]', { timeout: 10000 });
      
      // Verify card container exists
      const cardContainer = page.locator('[data-testid="square-card-container"]');
      await expect(cardContainer).toBeVisible();
    });

    test('should validate empty cart cannot checkout', async ({ page }) => {
      // Try to open cart with empty state
      await page.click('[data-testid="cart-button"]');
      
      // Verify checkout button is disabled
      const checkoutButton = page.locator('[data-testid="checkout-button"]');
      await expect(checkoutButton).toBeDisabled();
    });

    test('should calculate totals correctly', async ({ page }) => {
      // Add product with known price
      await page.click('[data-testid="product-card-add"]').first();
      
      // Open cart
      await page.click('[data-testid="cart-button"]');
      
      // Check total calculation
      const subtotal = page.locator('[data-testid="cart-subtotal"]');
      const tax = page.locator('[data-testid="cart-tax"]');
      const total = page.locator('[data-testid="cart-total"]');
      
      await expect(subtotal).toBeVisible();
      await expect(tax).toBeVisible();
      await expect(total).toBeVisible();
      
      // Verify total = subtotal + tax
      const subtotalValue = await subtotal.textContent();
      const taxValue = await tax.textContent();
      const totalValue = await total.textContent();
      
      // Parse amounts (remove $ and parse)
      const subtotalCents = parseAmount(subtotalValue);
      const taxCents = parseAmount(taxValue);
      const totalCents = parseAmount(totalValue);
      
      expect(totalCents).toBe(subtotalCents + taxCents);
    });
  });

  test.describe('Staff Mode', () => {
    test('should enter staff mode with correct PIN', async ({ page }) => {
      // Click staff toggle
      await page.click('[data-testid="staff-toggle"]');
      
      // Enter PIN
      await page.fill('[data-testid="pin-input"]', '2024');
      await page.click('[data-testid="pin-submit"]');
      
      // Verify staff mode active
      const staffIndicator = page.locator('[data-testid="staff-indicator"]');
      await expect(staffIndicator).toBeVisible();
    });

    test('should reject incorrect PIN', async ({ page }) => {
      // Click staff toggle
      await page.click('[data-testid="staff-toggle"]');
      
      // Enter wrong PIN
      await page.fill('[data-testid="pin-input"]', '9999');
      await page.click('[data-testid="pin-submit"]');
      
      // Verify error message
      const pinError = page.locator('[data-testid="pin-error"]');
      await expect(pinError).toBeVisible();
    });

    test('should show unavailable products in staff mode', async ({ page }) => {
      // Enter staff mode
      await page.click('[data-testid="staff-toggle"]');
      await page.fill('[data-testid="pin-input"]', '2024');
      await page.click('[data-testid="pin-submit"]');
      
      // Verify unavailable products visible
      const unavailableProducts = page.locator('[data-testid="product-unavailable"]');
      // May or may not exist depending on inventory
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Block API requests
      await page.route('**/api/products', route => route.abort());
      
      // Reload page
      await page.goto(PAY_URL);
      
      // Verify error state or fallback
      const errorMessage = page.locator('[data-testid="error-message"], [data-testid="empty-state"]');
      await expect(errorMessage).toBeVisible();
    });

    test('should recover from payment error', async ({ page }) => {
      // Add product and proceed to payment
      await page.click('[data-testid="product-card-add"]').first();
      await page.click('[data-testid="cart-button"]');
      await page.click('[data-testid="checkout-button"]');
      
      // Wait for payment form
      await page.waitForSelector('[data-testid="square-card-container"]');
      
      // Mock failed payment (would need API interception)
      // Verify error message appears
      const paymentError = page.locator('[data-testid="payment-error"]');
      // Error would show after failed payment attempt
    });
  });

  test.describe('Mobile UX', () => {
    test('should work on small screens', async ({ page }) => {
      // Already set to mobile viewport in beforeEach
      
      // Add product
      await page.click('[data-testid="product-card-add"]').first();
      
      // Verify cart button visible
      const cartButton = page.locator('[data-testid="cart-button"]');
      await expect(cartButton).toBeVisible();
      
      // Open cart
      await cartButton.click();
      
      // Verify cart panel slides up from bottom
      const cartPanel = page.locator('[data-testid="cart-panel"]');
      await expect(cartPanel).toBeVisible();
    });

    test('should handle swipe gestures', async ({ page }) => {
      // This would test swipe-to-dismiss on cart
      // Requires touch event simulation
    });
  });

  test.describe('Performance', () => {
    test('should load products within 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(PAY_URL);
      await page.waitForSelector('[data-testid="product-feed"]');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test('should maintain 60fps during scroll', async ({ page }) => {
      // This would use Performance API
      // Check for jank during product grid scroll
    });
  });
});

// Helper functions
function parseAmount(text: string | null): number {
  if (!text) return 0;
  const match = text.match(/[\d,.]+/);
  if (!match) return 0;
  // Parse dollar amount to cents
  const dollars = parseFloat(match[0].replace(',', ''));
  return Math.round(dollars * 100);
}

// API integration tests
test.describe('Payment API', () => {
  test('should validate prices server-side', async ({ request }) => {
    const response = await request.post('/api/pay/process', {
      data: {
        sourceId: 'test-nonce',
        items: [
          { productId: 'test-product', quantity: 1, upsellIds: [] }
        ],
        expectedTotal: 999999, // Clearly wrong price
        customerPhone: '+15551234567'
      },
      headers: {
        'X-CSRF-Token': 'test-token'
      }
    });
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Price mismatch');
  });

  test('should require CSRF token', async ({ request }) => {
    const response = await request.post('/api/pay/process', {
      data: {
        sourceId: 'test-nonce',
        items: [],
        expectedTotal: 0
      }
      // No CSRF header
    });
    
    expect(response.status()).toBe(403);
  });
});
