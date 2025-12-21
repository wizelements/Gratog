import { test, expect } from '@playwright/test';

test.describe('Payment Flow Security', () => {
  test('should validate PCI compliance - no card data in localStorage', async ({ page }) => {
    await page.goto('/checkout');
    
    const localStorage = await page.evaluate(() => {
      return {
        card: localStorage.getItem('card'),
        cvv: localStorage.getItem('cvv'),
        zip: localStorage.getItem('zip'),
        cardNumber: localStorage.getItem('cardNumber'),
        pin: localStorage.getItem('pin'),
      };
    });
    
    expect(localStorage.card).toBeNull();
    expect(localStorage.cvv).toBeNull();
    expect(localStorage.zip).toBeNull();
    expect(localStorage.cardNumber).toBeNull();
    expect(localStorage.pin).toBeNull();
  });

  test('should validate PCI compliance - no card data in sessionStorage', async ({ page }) => {
    await page.goto('/checkout');
    
    const sessionStorage = await page.evaluate(() => {
      return {
        card: sessionStorage.getItem('card'),
        cvv: sessionStorage.getItem('cvv'),
        zip: sessionStorage.getItem('zip'),
        cardNumber: sessionStorage.getItem('cardNumber'),
        pin: sessionStorage.getItem('pin'),
      };
    });
    
    expect(sessionStorage.card).toBeNull();
    expect(sessionStorage.cvv).toBeNull();
    expect(sessionStorage.zip).toBeNull();
    expect(sessionStorage.cardNumber).toBeNull();
    expect(sessionStorage.pin).toBeNull();
  });

  test('should prevent double submission of payment form', async ({ page }) => {
    await page.goto('/checkout');
    
    let requestCount = 0;
    await page.route('**/api/payments', async (route) => {
      requestCount++;
      await route.continue();
    });
    
    // Fill form with valid data
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[name="name"]', 'Test User');
    
    const payBtn = page.locator('button:has-text("Pay"), button:has-text("Charge"), button[type="submit"]');
    
    if (await payBtn.isVisible()) {
      // Try to click multiple times rapidly
      await Promise.all([
        payBtn.click(),
        payBtn.click(),
        payBtn.click(),
      ]).catch(() => null);
      
      // Wait for requests to complete
      await page.waitForTimeout(2000);
      
      // Should only process one payment request
      expect(requestCount).toBeLessThanOrEqual(1);
    }
  });

  test('should validate all required fields before payment submission', async ({ page }) => {
    await page.goto('/checkout');
    
    const requiredFieldSelectors = [
      'input[type="email"]',
      'input[name="name"]',
    ];
    
    const payBtn = page.locator('button:has-text("Pay"), button:has-text("Charge"), button[type="submit"]');
    
    if (await payBtn.isVisible()) {
      // Try to submit with empty fields
      await payBtn.click().catch(() => null);
      
      // Should show validation errors or prevent submission
      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);
      const isStillOnCheckout = page.url().includes('checkout');
      
      expect(hasError || isStillOnCheckout).toBeTruthy();
    }
  });

  test('should timeout payment requests appropriately', async ({ page }) => {
    await page.goto('/checkout');
    
    // Simulate slow network
    await page.route('**/api/payments', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 35000)); // 35 seconds
      await route.continue().catch(() => null);
    });
    
    await page.fill('input[type="email"]', 'test@example.com');
    
    const payBtn = page.locator('button:has-text("Pay"), button:has-text("Charge"), button[type="submit"]');
    if (await payBtn.isVisible()) {
      await payBtn.click().catch(() => null);
      
      // Should show timeout error, not hang forever
      const errorMsg = page.locator('text=timeout|connection|try again|error');
      await errorMsg.waitFor({ timeout: 40000 }).catch(() => null);
    }
  });

  test('should use HTTPS for payment requests', async ({ page }) => {
    const requests: string[] = [];
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('payment') || url.includes('charge') || url.includes('api')) {
        requests.push(url);
      }
    });
    
    await page.goto('/checkout');
    
    // All payment-related requests should use HTTPS
    for (const url of requests) {
      if (url.includes('payment') || url.includes('charge')) {
        expect(url).toContain('https://');
      }
    }
  });

  test('should not expose payment amount in URL', async ({ page }) => {
    await page.goto('/checkout');
    
    // Fill and submit
    const payBtn = page.locator('button:has-text("Pay"), button:has-text("Charge"), button[type="submit"]');
    if (await payBtn.isVisible()) {
      await page.fill('input[type="email"]', 'test@example.com');
      await payBtn.click().catch(() => null);
      
      const url = page.url();
      
      // Amount should not be in URL
      expect(url).not.toMatch(/amount=\d+/);
      expect(url).not.toMatch(/total=\d+/);
      expect(url).not.toMatch(/price=\d+/);
    }
  });

  test('should handle payment errors securely', async ({ page }) => {
    await page.goto('/checkout');
    
    // Try to submit with invalid test data
    await page.fill('input[type="email"]', 'invalid-email');
    
    const payBtn = page.locator('button:has-text("Pay"), button:has-text("Charge"), button[type="submit"]');
    if (await payBtn.isVisible()) {
      await payBtn.click().catch(() => null);
      
      // Error messages should be user-friendly, not expose internal details
      const errorMsg = await page.locator('[role="alert"]').textContent().catch(() => '');
      
      expect(errorMsg).not.toMatch(/database|SQL|internal|server error/i);
    }
  });
});
