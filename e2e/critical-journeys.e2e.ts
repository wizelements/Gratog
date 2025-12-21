import { test, expect, Page } from '@playwright/test';

/**
 * Critical User Journeys E2E Tests
 * Tests the most important user workflows across all browsers and devices
 */

test.describe('Critical User Journey: Browse & Purchase', () => {
  test('should complete full purchase flow', async ({ page }) => {
    // 1. Homepage loads
    await page.goto('/');
    await expect(page).toHaveTitle(/Taste of Gratitude/);
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 5000 });

    // 2. Navigate to catalog
    await page.click('text=Shop Now');
    await page.waitForURL('/catalog');
    
    // 3. Verify products load
    const productCount = await page.locator('[data-testid="product-card"]').count();
    expect(productCount).toBeGreaterThan(0);

    // 4. Click first product
    await page.click('[data-testid="product-card"]:first-child');
    await expect(page.locator('[data-testid="product-title"]')).toBeVisible();

    // 5. Add to cart
    await page.click('[data-testid="add-to-cart-button"]');
    await expect(page.locator('[data-testid="cart-notification"]')).toBeVisible();

    // 6. Navigate to cart
    await page.click('[data-testid="cart-icon"]');
    await page.waitForURL('/cart');

    // 7. Verify cart item
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
    const cartTotal = await page.locator('[data-testid="cart-total"]').textContent();
    expect(cartTotal).toMatch(/\$\d+\.\d{2}/);

    // 8. Proceed to checkout
    await page.click('[data-testid="checkout-button"]');
    await page.waitForURL('/checkout');

    // 9. Enter contact info (Stage 1: Details)
    await page.fill('[data-testid="firstName"]', 'John');
    await page.fill('[data-testid="lastName"]', 'Doe');
    await page.fill('[data-testid="email"]', 'john@example.com');
    await page.fill('[data-testid="phone"]', '404-555-0123');

    // 10. Select fulfillment
    await page.click('[data-testid="fulfillment-delivery"]');
    await page.fill('[data-testid="address-street"]', '123 Main St');
    await page.fill('[data-testid="address-city"]', 'Atlanta');
    await page.selectOption('[data-testid="address-state"]', 'GA');
    await page.fill('[data-testid="address-zip"]', '30301');

    // 11. Proceed to review
    await page.click('[data-testid="continue-button"]');
    await page.waitForURL(/checkout.*review/);

    // 12. Verify review page
    await expect(page.locator('text=Review Your Order')).toBeVisible();
    await expect(page.locator('[data-testid="review-contact"]')).toBeVisible();
    await expect(page.locator('[data-testid="review-fulfillment"]')).toBeVisible();

    // 13. Proceed to payment
    await page.click('[data-testid="proceed-payment-button"]');
    
    // 14. Fill payment info (using test card)
    const frameHandle = await page.$('[data-testid="square-iframe"]');
    if (frameHandle) {
      const frame = await frameHandle.contentFrame();
      if (frame) {
        await frame.fill('[aria-label="Card number"]', '4111111111111111');
        await frame.fill('[aria-label="MM/YY"]', '1225');
        await frame.fill('[aria-label="CVV"]', '123');
      }
    }

    // 15. Submit payment
    await page.click('[data-testid="pay-button"]');

    // 16. Verify confirmation
    await page.waitForURL(/order-confirmation|thank-you/, { timeout: 10000 });
    await expect(page.locator('text=Order Confirmed')).toBeVisible();
    await expect(page.locator('[data-testid="order-id"]')).toBeVisible();

    // 17. Verify cart cleared
    const updatedCartCount = await page.locator('[data-testid="cart-count"]').textContent();
    expect(updatedCartCount).toBe('0');
  });

  test('should handle validation errors gracefully', async ({ page }) => {
    await page.goto('/checkout');
    
    // Try to submit without required fields
    await page.click('[data-testid="continue-button"]');

    // Verify error messages appear
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Last name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();

    // Fill with invalid email
    await page.fill('[data-testid="email"]', 'not-an-email');
    await expect(page.locator('text=Invalid email')).toBeVisible();

    // Fill with invalid phone
    await page.fill('[data-testid="phone"]', 'abc');
    await expect(page.locator('text=Invalid phone')).toBeVisible();

    // Fill correctly
    await page.fill('[data-testid="firstName"]', 'Jane');
    await page.fill('[data-testid="lastName"]', 'Smith');
    await page.fill('[data-testid="email"]', 'jane@example.com');
    await page.fill('[data-testid="phone"]', '404-555-0124');

    // Verify errors clear
    await expect(page.locator('text=required')).not.toBeVisible();
  });
});

test.describe('Error Handling & Recovery', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.context().setOffline(true);

    // Navigate to page
    await page.goto('/');

    // Should show offline message or allow cached content
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    const cachedContent = page.locator('[data-testid="product-card"]');

    const isOfflineShown = await offlineIndicator.isVisible();
    const hasContent = await cachedContent.count();

    expect(isOfflineShown || hasContent > 0).toBeTruthy();

    // Restore connection
    await page.context().setOffline(false);

    // Reload should succeed
    await page.reload();
    await expect(page.locator('[data-testid="product-card"]')).toBeVisible();
  });

  test('should show error boundary UI on component crash', async ({ page }) => {
    // Navigate to a page with error boundary
    await page.goto('/');

    // Inject error in a non-critical component
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('testError', {
        detail: { message: 'Test component error' }
      }));
    });

    // Page should still be interactive
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();

    // Navigation should still work
    await page.click('[data-testid="home-link"]');
    await expect(page).toHaveURL('/');
  });

  test('should recover from form submission failure', async ({ page }) => {
    await page.goto('/checkout');

    // Fill form
    await page.fill('[data-testid="firstName"]', 'John');
    await page.fill('[data-testid="lastName"]', 'Doe');
    await page.fill('[data-testid="email"]', 'john@example.com');
    await page.fill('[data-testid="phone"]', '404-555-0123');

    // Simulate network error during submission
    await page.route('**/api/checkout/**', route => route.abort());

    await page.click('[data-testid="continue-button"]');

    // Should show error message
    await expect(page.locator('text=Something went wrong')).toBeVisible();

    // Should show retry button
    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();

    // Form data should persist
    const firstNameValue = await page.inputValue('[data-testid="firstName"]');
    expect(firstNameValue).toBe('John');

    // Restore API and retry
    await page.unroute('**/api/checkout/**');
    await retryButton.click();

    // Should proceed
    await page.waitForURL(/checkout.*review/, { timeout: 5000 });
  });
});

test.describe('Accessibility & Keyboard Navigation', () => {
  test('should be navigable with keyboard only', async ({ page }) => {
    await page.goto('/');

    // Tab through header
    await page.press('body', 'Tab');
    let focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focused).toBeTruthy();

    // Navigate to first product
    while (focused !== 'product-card') {
      await page.press('body', 'Tab');
      focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      if (focused === 'main-content') break; // Prevent infinite loop
    }

    // Enter should open product
    await page.press('body', 'Enter');
    await page.waitForURL(/products\//, { timeout: 5000 });
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check for aria-labels
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const hasLabel = !!text || !!ariaLabel;
      expect(hasLabel).toBeTruthy();
    }

    // Check for form labels
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const ariaLabel = await input.getAttribute('aria-label');
      const associatedLabel = await page.locator(`label[for="${await input.getAttribute('id')}"]`).count();
      const hasLabel = !!ariaLabel || associatedLabel > 0;
      expect(hasLabel).toBeTruthy();
    }
  });
});

test.describe('Performance Checks', () => {
  test('should meet performance budgets', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      const lcp = lcpEntries[lcpEntries.length - 1];

      return {
        fcp: fcp?.startTime || 0,
        lcp: lcp?.startTime || 0,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      };
    });

    // FCP should be under 2.5s (3s budget)
    expect(metrics.fcp).toBeLessThan(3000);

    // LCP should be under 4s
    expect(metrics.lcp).toBeLessThan(4000);

    // DOM should be under 1.5s
    expect(metrics.domContentLoaded).toBeLessThan(1500);
  });

  test('should not have excessive layout shifts', async ({ page }) => {
    await page.goto('/');

    const cls = await page.evaluate(() => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only count unexpected shifts
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
      
      return new Promise(resolve => {
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
      });
    }) as number;

    // CLS should be under 0.1
    expect(cls).toBeLessThan(0.1);
  });
});
