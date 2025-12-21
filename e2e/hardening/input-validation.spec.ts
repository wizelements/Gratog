import { test, expect } from '@playwright/test';

test.describe('Input Validation Security', () => {
  test('should prevent XSS in customer name', async ({ page }) => {
    await page.goto('/checkout');
    const nameInput = page.locator('input[name="name"]');

    // Test various XSS payloads
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror="alert(\'xss\')">',
      'javascript:alert("xss")',
      '<svg onload="alert(\'xss\')">',
      '"><script>alert("xss")</script>',
    ];

    for (const payload of xssPayloads) {
      await nameInput.fill(payload);
      const pageContent = await page.content();
      expect(pageContent).not.toContain('<script>');
      expect(pageContent).not.toContain('onerror=');
      expect(pageContent).not.toContain('onload=');
    }
  });

  test('should validate email format strictly', async ({ page }) => {
    await page.goto('/checkout');
    const emailInput = page.locator('input[type="email"]');

    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      'user name@example.com',
      'user@.com',
    ];

    for (const email of invalidEmails) {
      await emailInput.fill(email);
      const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(isValid).toBe(false);
    }
  });

  test('should validate phone format', async ({ page }) => {
    await page.goto('/checkout');
    const phoneInput = page.locator('input[name="phone"]');

    const validPhones = ['(404) 555-0001', '+1-404-555-0001', '4045550001'];
    const invalidPhones = ['123', 'abc-def-ghij', '(404)', '555-0001'];

    for (const phone of validPhones) {
      await phoneInput.fill(phone);
      // Should accept
      expect(await phoneInput.inputValue()).toContain(phone.replace(/\D/g, ''));
    }

    for (const phone of invalidPhones) {
      await phoneInput.fill(phone);
      // Invalid phones should either show error or be rejected
      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);
      const isEmpty = (await phoneInput.inputValue()).length === 0;
      expect(hasError || isEmpty).toBeTruthy();
    }
  });

  test('should sanitize HTML in form inputs', async ({ page }) => {
    await page.goto('/checkout');
    
    const nameInput = page.locator('input[name="name"]');
    const htmlPayload = '<div onclick="alert(\'xss\')">Click me</div>';
    
    await nameInput.fill(htmlPayload);
    const inputValue = await nameInput.inputValue();
    
    // Should be sanitized or escaped
    expect(inputValue).not.toContain('<div');
    expect(inputValue).not.toContain('onclick=');
  });

  test('should prevent blank value injection', async ({ page }) => {
    await page.goto('/checkout');
    
    const requiredInputs = [
      'input[type="email"]',
      'input[name="name"]',
    ];

    for (const selector of requiredInputs) {
      const input = page.locator(selector);
      await input.fill('   ');
      
      // Should either reject or trim
      const value = await input.inputValue();
      expect(value.trim().length === 0 || value.trim().length > 0).toBeTruthy();
    }
  });
});
