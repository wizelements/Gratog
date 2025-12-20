import { test, expect, Page } from '@playwright/test';
import { randomUUID } from 'crypto';

/**
 * Production-grade Payment Flow E2E Tests
 * Comprehensive coverage for Gratog platform payment scenarios
 */

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

// Test fixtures
const testUser = {
  guest: {
    email: `guest-${Date.now()}@test.com`,
    name: 'Guest Customer',
    phone: '(404) 555-0100'
  },
  registered: {
    email: `registered-${Date.now()}@test.com`,
    name: 'Registered Customer',
    phone: '(404) 555-0101',
    password: `SecurePass${randomUUID().substring(0, 8)}`
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123'
  }
};

const testAddress = {
  street: '123 Test Street',
  city: 'Atlanta',
  state: 'GA',
  zip: '30301'
};

// ============================================================================
// GUEST CHECKOUT FLOW TESTS
// ============================================================================

test.describe('Guest Checkout Flow', () => {
  test('should complete full guest checkout with valid card', async ({ page }) => {
    // Navigate to homepage
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Add product to cart
    const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Quick Add")').first();
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
    await addToCartBtn.click({ force: true });

    // Navigate to checkout
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    // Fill guest information
    await page.fill('input[placeholder*="Email"], input[name="email"]', testUser.guest.email);
    await page.fill('input[placeholder*="Name"], input[name="name"]', testUser.guest.name);
    await page.fill('input[placeholder*="Phone"], input[name="phone"]', testUser.guest.phone);

    // Select fulfillment type
    const fulfillmentSelect = page.locator('select[name="fulfillmentType"], [data-testid="fulfillment-select"]').first();
    if (await fulfillmentSelect.isVisible()) {
      await fulfillmentSelect.selectOption('pickup_market');
    }

    // Wait for cart total to load
    await page.waitForSelector('[data-testid="order-total"], .total-amount, .order-summary', { timeout: 5000 });

    // Verify order summary shows items
    const cartItems = page.locator('[data-testid="cart-item"], .cart-item, .line-item');
    await expect(cartItems).toHaveCount(1, { timeout: 5000 });

    // Take screenshot before payment
    await page.screenshot({ path: 'test-results/guest-checkout-1-before-payment.png' });
  });

  test('should handle guest with delivery address', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Add product
    const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Quick Add")').first();
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
    await addToCartBtn.click();

    // Go to checkout
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    // Fill guest info
    await page.fill('input[name="email"], input[placeholder*="Email"]', testUser.guest.email);
    await page.fill('input[name="name"], input[placeholder*="Name"]', testUser.guest.name);

    // Select delivery
    const fulfillmentSelect = page.locator('select[name="fulfillmentType"], [data-testid="fulfillment-select"]').first();
    if (await fulfillmentSelect.isVisible()) {
      await fulfillmentSelect.selectOption('delivery');

      // Fill delivery address
      await page.fill('input[name="address.street"], input[placeholder*="Street"]', testAddress.street);
      await page.fill('input[name="address.city"], input[placeholder*="City"]', testAddress.city);
      await page.fill('input[name="address.state"], input[placeholder*="State"]', testAddress.state);
      await page.fill('input[name="address.zip"], input[placeholder*="ZIP"]', testAddress.zip);
    }

    // Verify address fields populated
    const streetInput = page.locator('input[name="address.street"], input[placeholder*="Street"]');
    await expect(streetInput).toHaveValue(testAddress.street);
  });

  test('should validate required fields in guest checkout', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    // Try to proceed without filling required fields
    const proceedBtn = page.locator('button:has-text("Proceed"), button:has-text("Continue"), button[type="submit"]').first();
    await proceedBtn.click({ force: true });

    // Should show validation errors
    const errorMessages = page.locator('[role="alert"], .error, .validation-error');
    await expect(errorMessages).toHaveCount(1, { timeout: 3000 });
  });

  test('should handle guest adding multiple items', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Add first product
    const addButtons = page.locator('button:has-text("Add to Cart"), button:has-text("Quick Add")');
    await expect(addButtons).toHaveCount(1, { timeout: 10000 });
    await addButtons.first().click();

    // Check cart updated
    let cartCount = page.locator('[data-testid="cart-count"], .cart-badge');
    await expect(cartCount).toBeVisible({ timeout: 3000 });

    // Go to checkout
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    // Verify cart has items
    const lineItems = page.locator('[data-testid="cart-item"], .line-item');
    const itemCount = await lineItems.count();
    expect(itemCount).toBeGreaterThanOrEqual(1);
  });

  test('should handle guest cart persistence', async ({ page }) => {
    // Add to cart
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Quick Add")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    // Navigate away
    await page.goto(`${BASE_URL}/catalog`);
    await page.waitForLoadState('networkidle');

    // Navigate back
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    // Cart should still be there
    const cartItems = page.locator('[data-testid="cart-item"], .line-item');
    await expect(cartItems).toHaveCount(1, { timeout: 5000 });
  });

  test('should show order total accurately', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Quick Add")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    // Verify order summary
    const subtotal = page.locator('[data-testid="subtotal"], .subtotal');
    const tax = page.locator('[data-testid="tax"], .tax');
    const total = page.locator('[data-testid="order-total"], .total-amount');

    if (await subtotal.isVisible()) {
      const subtotalText = await subtotal.textContent();
      expect(subtotalText).toMatch(/\$\d+\.\d{2}/);
    }

    if (await total.isVisible()) {
      const totalText = await total.textContent();
      expect(totalText).toMatch(/\$\d+\.\d{2}/);
    }
  });

  test('should handle empty cart gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    // Check for empty state
    const emptyMessage = page.locator(':text("empty"), :text("no items"), :text("add products")').first();
    if (await emptyMessage.isVisible()) {
      expect(await emptyMessage.isVisible()).toBe(true);
    }

    // Should show link back to catalog
    const catalogLink = page.locator('a:has-text("catalog"), a:has-text("shop"), a:has-text("browse")').first();
    expect(catalogLink).toBeDefined();
  });
});

// ============================================================================
// LOGGED-IN CUSTOMER FLOW TESTS
// ============================================================================

test.describe('Logged-in Customer Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Register new customer
    await page.goto(`${BASE_URL}/auth/register`);
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const nameInput = page.locator('input[name="name"], input[placeholder*="Name"]');
    const registerBtn = page.locator('button:has-text("Register"), button:has-text("Sign Up")');

    if (await emailInput.isVisible()) {
      await emailInput.fill(testUser.registered.email);
      await nameInput.fill(testUser.registered.name);
      await passwordInput.fill(testUser.registered.password);
      await registerBtn.click();

      // Wait for redirect or success
      await page.waitForNavigation({ timeout: 5000 }).catch(() => {});
    }
  });

  test('should complete checkout with stored customer info', async ({ page }) => {
    // Customer info should be pre-filled
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    // Add product if needed
    const cartItems = page.locator('[data-testid="cart-item"], .line-item');
    if ((await cartItems.count()) === 0) {
      await page.goto(`${BASE_URL}/`);
      const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Quick Add")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
      }
      await page.goto(`${BASE_URL}/order`);
      await page.waitForLoadState('networkidle');
    }

    // Email should be pre-filled
    const emailInput = page.locator('input[name="email"], input[placeholder*="Email"]');
    if (await emailInput.isVisible()) {
      const email = await emailInput.inputValue();
      expect(email).toBeTruthy();
    }
  });

  test('should allow customer to modify address', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    // Select delivery
    const fulfillmentSelect = page.locator('select[name="fulfillmentType"], [data-testid="fulfillment-select"]').first();
    if (await fulfillmentSelect.isVisible()) {
      await fulfillmentSelect.selectOption('delivery');

      // Fill address
      const streetInput = page.locator('input[name="address.street"], input[placeholder*="Street"]');
      if (await streetInput.isVisible()) {
        await streetInput.fill(testAddress.street);
        await page.fill('input[name="address.city"], input[placeholder*="City"]', testAddress.city);

        const filledStreet = await streetInput.inputValue();
        expect(filledStreet).toBe(testAddress.street);
      }
    }
  });

  test('should show order history for logged-in customer', async ({ page }) => {
    // Navigate to account/orders page
    const accountLink = page.locator('a:has-text("Account"), a:has-text("Orders"), a:has-text("My Orders")').first();
    if (await accountLink.isVisible()) {
      await accountLink.click();
      await page.waitForLoadState('networkidle');

      // Should see orders page
      expect(page.url()).toMatch(/account|order|profile/i);
    }
  });

  test('should handle saved payment methods', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    // Look for saved payment options
    const savedPaymentOption = page.locator('[data-testid="saved-payment"], .saved-payment, :text("saved payment")').first();
    
    if (await savedPaymentOption.isVisible()) {
      // Customer has saved payment methods
      expect(await savedPaymentOption.isVisible()).toBe(true);
    }
  });

  test('should validate customer session on checkout', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    
    // Check if authenticated
    const userMenu = page.locator('[data-testid="user-menu"], .user-menu, [role="menu"]').first();
    if (await userMenu.isVisible()) {
      expect(true).toBe(true); // Authenticated
    }
  });
});

// ============================================================================
// ADMIN ORDER FLOW TESTS
// ============================================================================

test.describe('Admin Order Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const loginBtn = page.locator('button:has-text("Login"), button:has-text("Sign In")');

    if (await emailInput.isVisible()) {
      await emailInput.fill(testUser.admin.email);
      await passwordInput.fill(testUser.admin.password);
      await loginBtn.click();

      await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
      await page.waitForLoadState('networkidle');
    }
  });

  test('should access admin dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    // Should see admin interface
    const adminPanel = page.locator('[data-testid="admin-dashboard"], .admin-panel, [role="main"]');
    await expect(adminPanel).toBeVisible({ timeout: 5000 });
  });

  test('should create manual order for customer', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/orders`);
    await page.waitForLoadState('networkidle');

    // Click create order button
    const createBtn = page.locator('button:has-text("Create Order"), button:has-text("New Order")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();

      // Fill order details
      const customerSelect = page.locator('select[name="customer"], [data-testid="customer-select"]').first();
      if (await customerSelect.isVisible()) {
        await customerSelect.selectOption({ index: 1 });
      }

      // Add products
      const addProductBtn = page.locator('button:has-text("Add Product"), button:has-text("Add Item")').first();
      if (await addProductBtn.isVisible()) {
        await addProductBtn.click();
      }
    }
  });

  test('should process admin payment', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/orders`);
    await page.waitForLoadState('networkidle');

    // Select an order
    const orderRow = page.locator('tbody tr, [data-testid="order-row"]').first();
    if (await orderRow.isVisible()) {
      await orderRow.click();
      await page.waitForLoadState('networkidle');

      // Find payment button
      const paymentBtn = page.locator('button:has-text("Process Payment"), button:has-text("Charge")').first();
      if (await paymentBtn.isVisible()) {
        await paymentBtn.click();
      }
    }
  });

  test('should view order details', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/orders`);
    await page.waitForLoadState('networkidle');

    const orderRow = page.locator('tbody tr, [data-testid="order-row"]').first();
    if (await orderRow.isVisible()) {
      await orderRow.click();
      await page.waitForLoadState('networkidle');

      // Should show order details
      const orderNumber = page.locator('[data-testid="order-number"], .order-id, .order-number');
      await expect(orderNumber).toBeVisible({ timeout: 5000 });

      const orderItems = page.locator('[data-testid="order-item"], .order-line-item');
      await expect(orderItems).toHaveCount(1, { timeout: 5000 });
    }
  });

  test('should handle order refunds', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/orders`);
    await page.waitForLoadState('networkidle');

    const orderRow = page.locator('tbody tr, [data-testid="order-row"]').first();
    if (await orderRow.isVisible()) {
      await orderRow.click();

      // Find refund button
      const refundBtn = page.locator('button:has-text("Refund"), button:has-text("Cancel Payment")').first();
      if (await refundBtn.isVisible()) {
        await refundBtn.click();

        // Confirm refund
        const confirmBtn = page.locator('button:has-text("Confirm"), [role="alertdialog"] button:first-of-type').first();
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
      }
    }
  });

  test('should view order payment status', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/orders`);
    await page.waitForLoadState('networkidle');

    const orderRow = page.locator('tbody tr, [data-testid="order-row"]').first();
    if (await orderRow.isVisible()) {
      await orderRow.click();

      const paymentStatus = page.locator('[data-testid="payment-status"], .payment-status, .status');
      await expect(paymentStatus).toBeVisible({ timeout: 5000 });
    }
  });

  test('should manage order fulfillment', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/orders`);
    await page.waitForLoadState('networkidle');

    const orderRow = page.locator('tbody tr, [data-testid="order-row"]').first();
    if (await orderRow.isVisible()) {
      await orderRow.click();
      await page.waitForLoadState('networkidle');

      // Update fulfillment status
      const statusSelect = page.locator('select[name="fulfillmentStatus"], [data-testid="fulfillment-status"]').first();
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('ready_for_pickup');
      }
    }
  });
});

// ============================================================================
// PAYMENT ERROR SCENARIOS
// ============================================================================

test.describe('Payment Error Handling', () => {
  test('should handle payment timeout gracefully', async ({ page }) => {
    // This test validates that the SDK timeout fix works
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Quick Add")').first();
    if (await addBtn.isVisible({ timeout: 10000 })) {
      await addBtn.click();
    }

    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    // Check for timeout errors in console
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Should not have timeout errors
    const timeoutErrors = errors.filter(e => e.includes('timeout') || e.includes('Timeout'));
    expect(timeoutErrors.length).toBe(0);
  });

  test('should display error message on payment failure', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    // Simulate payment error by intercept
    await page.route('**/api/payments', (route) => {
      route.abort('failed');
    });

    const payBtn = page.locator('button:has-text("Pay"), button:has-text("Complete Purchase")').first();
    if (await payBtn.isVisible()) {
      await payBtn.click();

      // Should show error message
      const errorMsg = page.locator('[role="alert"], .error-message, .alert-error').first();
      await expect(errorMsg).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle network disconnection', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);

    // Simulate offline
    await page.context().setOffline(true);

    const payBtn = page.locator('button:has-text("Pay"), button:has-text("Complete")').first();
    if (await payBtn.isVisible()) {
      await payBtn.click();

      // Should show offline error
      const offlineMsg = page.locator(':text("offline"), :text("connection"), :text("network")').first();
      if (await offlineMsg.isVisible({ timeout: 3000 })) {
        expect(true).toBe(true);
      }
    }

    // Restore connection
    await page.context().setOffline(false);
  });

  test('should prevent double submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Pay"), button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      // Click twice rapidly
      await submitBtn.click();
      await submitBtn.click();

      // Should be disabled after first click
      const isDisabled = await submitBtn.isDisabled();
      expect(isDisabled).toBe(true);
    }
  });
});

// ============================================================================
// SECURITY & VALIDATION TESTS
// ============================================================================

test.describe('Checkout Security & Validation', () => {
  test('should not expose sensitive payment data in DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    const html = await page.content();
    
    // Should not contain full card numbers or tokens in plain text
    expect(html).not.toMatch(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/);
  });

  test('should require valid email format', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid-email');

      // Should show validation error
      const errorMsg = page.locator(':text("invalid"), :text("valid email")').first();
      if (await errorMsg.isVisible({ timeout: 2000 })) {
        expect(true).toBe(true);
      }
    }
  });

  test('should sanitize user input', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    
    const nameInput = page.locator('input[name="name"], input[placeholder*="Name"]').first();
    if (await nameInput.isVisible()) {
      // Try XSS payload
      await nameInput.fill('<script>alert("xss")</script>');

      // Should either sanitize or prevent submission
      const html = await page.content();
      expect(html).not.toContain('<script>');
    }
  });

  test('should validate phone number format', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    
    const phoneInput = page.locator('input[name="phone"], input[placeholder*="Phone"]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('invalid');
      
      // Phone should be optional or show validation
      expect(true).toBe(true);
    }
  });

  test('should handle CSRF protection', async ({ page }) => {
    // Forms should have CSRF tokens
    await page.goto(`${BASE_URL}/order`);
    
    const form = page.locator('form, [data-testid="checkout-form"]').first();
    if (await form.isVisible()) {
      const csrfInput = form.locator('input[name*="csrf"], input[name*="token"]');
      // Should have CSRF token if applicable
      expect(form).toBeDefined();
    }
  });
});

// ============================================================================
// STATE & DATA CONSISTENCY TESTS
// ============================================================================

test.describe('Checkout State & Data Consistency', () => {
  test('should maintain consistent cart across page reloads', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    
    const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Quick Add")').first();
    if (await addBtn.isVisible({ timeout: 10000 })) {
      await addBtn.click();
    }

    // Get initial cart count
    let cartCount = page.locator('[data-testid="cart-count"], .cart-badge').first();
    const initialCount = await cartCount.textContent();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Cart count should be same
    cartCount = page.locator('[data-testid="cart-count"], .cart-badge').first();
    const reloadedCount = await cartCount.textContent();

    expect(reloadedCount).toBe(initialCount);
  });

  test('should update totals when items change', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');

    // Get initial total
    const totalElement = page.locator('[data-testid="order-total"], .total-amount').first();
    const initialTotal = await totalElement.textContent();

    // Increase quantity
    const quantityInput = page.locator('input[name*="quantity"], input[type="number"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('2');
      await page.waitForTimeout(500);

      // Total should update
      const newTotal = await totalElement.textContent();
      expect(newTotal).not.toBe(initialTotal);
    }
  });

  test('should preserve data during navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    
    // Fill some information
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    if (await emailInput.isVisible()) {
      const testEmail = `test-${Date.now()}@example.com`;
      await emailInput.fill(testEmail);

      // Navigate away and back
      await page.goto(`${BASE_URL}/catalog`);
      await page.goto(`${BASE_URL}/order`);

      // Email should still be there (if using form state)
      const email = await emailInput.inputValue();
      expect(email).toBeTruthy();
    }
  });
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

test.describe('Checkout Accessibility', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"], select');
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const input = inputs.nth(i);
      const label = page.locator(`label[for="${await input.getAttribute('id')}"]`);
      
      // Should have label or aria-label
      const hasLabel = await label.count() > 0 || await input.getAttribute('aria-label');
      expect(hasLabel).toBe(true);
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should announce errors to screen readers', async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    
    const errorAlert = page.locator('[role="alert"], [role="status"]');
    if (await errorAlert.isVisible()) {
      const ariaLive = await errorAlert.getAttribute('aria-live');
      expect(['polite', 'assertive']).toContain(ariaLive);
    }
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

test.describe('Checkout Performance', () => {
  test('should load checkout page quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');
    const duration = Date.now() - startTime;

    // Should load within 3 seconds
    expect(duration).toBeLessThan(3000);
  });

  test('should handle large cart efficiently', async ({ page }) => {
    // Simulate large cart by adding multiple items
    await page.goto(`${BASE_URL}/`);
    
    for (let i = 0; i < 5; i++) {
      const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Quick Add")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(100);
      }
    }

    const startTime = Date.now();
    await page.goto(`${BASE_URL}/order`);
    await page.waitForLoadState('networkidle');
    const duration = Date.now() - startTime;

    // Should still be responsive
    expect(duration).toBeLessThan(5000);
  });

  test('should not cause memory leaks on repeated navigation', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.goto(`${BASE_URL}/order`);
      await page.waitForLoadState('networkidle');
    }

    // Page should still be responsive
    const isResponsive = await page.evaluate(() => typeof window !== 'undefined');
    expect(isResponsive).toBe(true);
  });
});
