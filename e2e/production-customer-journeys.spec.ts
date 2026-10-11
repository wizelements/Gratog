import { test, expect } from '@playwright/test';

const CHECKED_PAGES = ['/', '/catalog', '/weekly-menu', '/markets', '/faq', '/policies', '/terms', '/contact', '/checkout'];

test.describe('Real Georgia customer journeys — no charges, accounts or submitted leads', () => {
  test('primary navigation separates the ordinary store from market-only preorders', async ({ page }) => {
    await page.goto('/');
    const mobileMenu = page.getByRole('button', { name: 'Open menu' });
    if (await mobileMenu.isVisible()) await mobileMenu.click();
    await expect(page.getByRole('link', { name: 'Shop Online' }).first()).toHaveAttribute('href', '/catalog');
    await expect(page.getByRole('link', { name: 'Market Preorders' }).first()).toHaveAttribute('href', '/weekly-menu');
    await expect(page.getByText('Orders fulfilled in Georgia only.', { exact: false }).first()).toBeVisible();
  });

  test('public pages load with usable content and no crashes', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));
    for (const path of CHECKED_PAGES) {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), path).toBe(200);
      await expect(page.locator('body')).not.toBeEmpty();
      const tooWide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 3);
      expect(tooWide, `Horizontal overflow on ${path}`).toBe(false);
    }
    expect(jsErrors, 'Uncaught browser errors').toEqual([]);
  });

  test('catalog provides genuine regular shopping, independent of market reservation', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('No market visit required for eligible orders')).toBeVisible();
    await expect(page.locator('[data-product]').first()).toBeVisible({ timeout: 20_000 });
    const add = page.getByRole('button', { name: /add to cart/i }).first();
    await expect(add).toBeEnabled();
    await add.click();
    await expect.poll(async () => page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('tog_cart_engine_v1') || '[]').length; }
      catch { return 0; }
    }), { timeout: 10_000 }).toBeGreaterThan(0);
    await page.goto('/checkout');
    await expect(page.getByText('Review your cart', { exact: false })).toBeVisible();
    await expect(page.getByText('Shopping without visiting a market?', { exact: false })).toBeVisible();
  });

  test('customer contact and Georgia shipping survive refresh through final review without charging', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.locator('[data-product]').first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await page.goto('/checkout');
    await expect(page.getByRole('button', { name: 'Continue to Details' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue to Details' }).click();
    await expect(page.locator('#firstName')).toBeVisible();

    await page.locator('#firstName').fill('Checkout');
    await page.locator('#lastName').fill('QA');
    await page.locator('#email').fill('qa@example.invalid');
    await page.locator('#ship-street').fill('123 Example Street');
    await page.locator('#ship-city').fill('Atlanta');
    await page.locator('#ship-zip').fill('30303');
    await page.locator('#standard').click();

    await page.reload();
    await page.getByRole('button', { name: 'Continue to Details' }).click();
    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#firstName')).toHaveValue('Checkout');
    await expect(page.locator('#email')).toHaveValue('qa@example.invalid');
    await expect(page.locator('#ship-city')).toHaveValue('Atlanta');
    await expect(page.locator('#standard')).toHaveAttribute('data-state', 'checked');
    await page.getByRole('button', { name: 'Continue to Review' }).click();
    await expect(page.getByRole('heading', { name: 'Review & Pay' }).first()).toBeVisible();
    await expect(page.getByText('Shipping Details')).toBeVisible();
    // Intentionally never click Proceed to Secure Payment: no order or charge.
  });

  test('empty cart cannot masquerade as a completed checkout', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByText('Review your cart', { exact: false })).toBeVisible();
    await expect(page.getByText('Your cart is empty', { exact: false })).toBeVisible();
  });

  test('out-of-state order is rejected before an order or charge is created', async ({ request }) => {
    const response = await request.post('/api/orders/create', {
      data: {
        customer: { name: 'Site QA', email: 'no-order@example.invalid' },
        cart: [{ id: 'qa-nonexistent-product', quantity: 1 }],
        fulfillmentType: 'shipping',
        shippingAddress: { street: '123 Test Street', city: 'New York', state: 'NY', zip: '10001' },
      },
    });
    expect(response.status()).toBe(422);
    expect((await response.json()).code).toBe('GEORGIA_ONLY');
  });

  test('unsafe obsolete payment-link endpoint is disabled', async ({ request }) => {
    const response = await request.post('/api/payments/square', { data: { amount: 1 } });
    expect(response.status()).toBe(410);
    expect((await response.json()).code).toBe('LEGACY_SQUARE_CHECKOUT_RETIRED');
  });
});
