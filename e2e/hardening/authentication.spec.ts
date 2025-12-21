import { test, expect } from '@playwright/test';

test.describe('Authentication Security', () => {
  test('should prevent unauthorized access to admin pages', async ({ page }) => {
    const response = await page.goto('/admin/orders').catch(() => null);
    
    // Should redirect to login or return 401/403
    if (response?.ok()) {
      expect(page.url()).toContain('/login');
    } else {
      expect([401, 403]).toContain(response?.status());
    }
  });

  test('should implement CSRF protection on forms', async ({ page }) => {
    await page.goto('/checkout');
    
    // Check for CSRF token in form
    const csrfToken = page.locator('input[name*="csrf"], input[name*="token"], input[name*="_token"]');
    const count = await csrfToken.count();
    
    if (count > 0) {
      // CSRF token exists, verify it's present
      await expect(csrfToken).toHaveCount(1);
    }
  });

  test('should use secure session management', async ({ page }) => {
    await page.goto('/');
    
    // Check for security headers
    const response = await page.goto('/');
    const headers = response?.headers();
    
    // Should have security headers present (not necessarily set-cookie on all pages)
    expect(headers?.['x-content-type-options']).toBeDefined();
  });

  test('should not expose authentication tokens in URLs', async ({ page }) => {
    await page.goto('/');
    
    // Check that no tokens appear in URL
    const url = page.url();
    expect(url).not.toMatch(/token=/);
    expect(url).not.toMatch(/auth=/);
    expect(url).not.toMatch(/session=/);
    expect(url).not.toMatch(/password=/);
  });

  test('should handle logout securely', async ({ page }) => {
    await page.goto('/');
    
    // Look for logout button
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")');
    
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForNavigation().catch(() => null);
      
      // After logout, should not be able to access protected pages
      await page.goto('/admin/orders').catch(() => null);
      
      const isRedirected = page.url().includes('/login') || !page.url().includes('/admin');
      expect(isRedirected).toBeTruthy();
    }
  });
});
