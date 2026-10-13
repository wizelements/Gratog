import { test, expect } from '@playwright/test';

test.describe('skeptical buyer: payment and preorder truth', () => {
  test('cannot fake a captured payment with paid=true or a client amount', async ({ page }) => {
    await page.route('**/api/orders/by-ref?**', async route => route.fulfill({
      status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }),
    }));
    await page.goto('/order/success?orderRef=FAKE-ORDER&paid=true&amount=1');
    await expect(page.getByRole('heading', { name: 'Link Expired for Security' })).toBeVisible();
    await expect(page.getByText(/Payment Received!/i)).toHaveCount(0);
    await expect(page.getByText(/was confirmed/i)).toHaveCount(0);
  });

  test('pending server status must not show an Order Confirmed receipt', async ({ page }) => {
    await page.route('**/api/orders/by-ref?**', async route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        id: 'ORDER-PENDING', orderRef: 'ORDER-PENDING',
        status: 'PENDING_PAYMENT', paymentStatus: 'pending',
        pricing: { subtotal: 36, total: 36 }, items: [{ name: 'Gel', price: 36, quantity: 1 }],
        fulfillment: { type: 'pickup', pickup: { locationId: 'market-test' } },
        customer: { name: 'Buyer' },
      }),
    }));
    await page.goto('/order/success?orderRef=ORDER-PENDING&paid=true&amount=1');
    await expect(page.getByRole('heading', { name: 'Payment Not Yet Verified' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Order Confirmed!' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /live queue position/i })).toHaveCount(0);
  });

  test('public market reference cannot expose buyer items, cost or Square link', async ({ page }) => {
    await page.route('**/api/preorder/status?**', async route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, preorder: {
        orderNumber: 'PRE-TEST', waitlistNumber: 'W-001', marketId: 'market-test',
        pickupLocation: 'Market Pickup', pickupDate: 'Saturday', pickupHours: '10am',
        status: 'PENDING_PAYMENT', paymentStatus: 'PENDING', queuePosition: 1,
        privateDetailsAvailable: false,
      } }),
    }));
    await page.goto('/preorder/status?orderNumber=PRE-TEST');
    await expect(page.getByText(/Order items, personal details and secure payment links/)).toBeVisible();
    await expect(page.getByText('Private Shopper')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Complete secure Square payment' })).toHaveCount(0);
  });

  test('original browser can recover its private payment link using signed-order header', async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem('tog_preorder_access_PRE-TEST', 'signed-buyer-token');
    });
    let headerPresent = false;
    await page.route('**/api/preorder/status?**', async route => {
      headerPresent = route.request().headers()['x-order-access-token'] === 'signed-buyer-token';
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, preorder: {
          orderNumber: 'PRE-TEST', waitlistNumber: 'W-001', marketId: 'market-test',
          pickupLocation: 'Market Pickup', pickupDate: 'Saturday', pickupHours: '10am',
          status: 'PENDING_PAYMENT', paymentStatus: 'PENDING', queuePosition: 1,
          privateDetailsAvailable: true,
          items: [{ name: 'Elderberry Gel', quantity: 1, price: 36 }], total: 36,
          paymentUrl: 'https://example.invalid/square-test',
        } }),
      });
    });
    await page.goto('/preorder/status?orderNumber=PRE-TEST');
    await expect(page.getByText('Elderberry Gel')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Complete secure Square payment' })).toBeVisible();
    expect(headerPresent).toBe(true);
  });
});
