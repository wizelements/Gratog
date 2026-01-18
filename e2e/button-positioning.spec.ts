import { test, expect } from '@playwright/test';

test.describe('Button Positioning - Music, Cart, Chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for all floating buttons to be mounted
    await page.waitForTimeout(1000);
  });

  test('Music button is below cart and chat buttons', async ({ page }) => {
    // Get bounding boxes for all three buttons
    const musicButton = page.locator('button[aria-label*="music" i], button[aria-label*="play" i]').first();
    const cartButton = page.locator('[data-testid="floating-cart"], button:has-text("🛒")').first();
    const chatButton = page.locator('[data-testid="live-chat"], iframe[title*="chat" i]').first();

    // Get positions
    const musicBox = await musicButton.boundingBox();
    const cartBox = await cartButton.boundingBox();
    const chatBox = await chatButton.boundingBox();

    console.log('Music button position:', musicBox);
    console.log('Cart button position:', cartBox);
    console.log('Chat button position:', chatBox);

    // Verify all are in bottom-right area (right side of viewport)
    if (musicBox) expect(musicBox.x).toBeGreaterThan(window.innerWidth - 100);
    if (cartBox) expect(cartBox.x).toBeGreaterThan(window.innerWidth - 100);
    if (chatBox) expect(chatBox.x).toBeGreaterThan(window.innerWidth - 200); // Chat might be iframe

    // Verify vertical stacking: chat > cart > music (from top to bottom)
    if (chatBox && cartBox) {
      expect(chatBox.y).toBeLessThan(cartBox.y);
    }
    if (cartBox && musicBox) {
      expect(cartBox.y).toBeLessThan(musicBox.y);
    }
  });

  test('Music button spacing matches Tailwind classes', async ({ page }) => {
    const musicButton = page.locator('button[aria-label*="music" i], button[aria-label*="play" i]').first();
    const cartButton = page.locator('[data-testid="floating-cart"], button:has-text("🛒")').first();

    const musicBox = await musicButton.boundingBox();
    const cartBox = await cartButton.boundingBox();

    if (musicBox && cartBox) {
      // Music: bottom-4 right-4 (~16px from edges)
      // Cart: bottom-6 right-6 (~24px from edges)
      const musicFromBottom = window.innerHeight - (musicBox.y + musicBox.height);
      const cartFromBottom = window.innerHeight - (cartBox.y + cartBox.height);

      console.log(`Music from bottom: ${musicFromBottom}px (expected ~16px)`);
      console.log(`Cart from bottom: ${cartFromBottom}px (expected ~24px)`);

      // Allow some tolerance for rounding
      expect(Math.abs(musicFromBottom - 16)).toBeLessThan(5);
      expect(Math.abs(cartFromBottom - 24)).toBeLessThan(5);
    }
  });

  test('Music button does not overlap with cart or chat', async ({ page }) => {
    const musicButton = page.locator('button[aria-label*="music" i], button[aria-label*="play" i]').first();
    const cartButton = page.locator('[data-testid="floating-cart"], button:has-text("🛒")').first();

    const musicBox = await musicButton.boundingBox();
    const cartBox = await cartButton.boundingBox();

    if (musicBox && cartBox) {
      // Check for overlap
      const horizontalOverlap = !(
        musicBox.x + musicBox.width < cartBox.x ||
        cartBox.x + cartBox.width < musicBox.x
      );

      const verticalOverlap = !(
        musicBox.y + musicBox.height < cartBox.y ||
        cartBox.y + cartBox.height < musicBox.y
      );

      // Should NOT overlap
      expect(horizontalOverlap && verticalOverlap).toBe(false);
    }
  });

  test('All buttons are fixed position', async ({ page }) => {
    const musicButton = page.locator('button[aria-label*="music" i], button[aria-label*="play" i]').first();
    const cartButton = page.locator('[data-testid="floating-cart"], button:has-text("🛒")').first();

    const musicStyles = await musicButton.evaluate(el => window.getComputedStyle(el).position);
    const cartStyles = await cartButton.evaluate(el => window.getComputedStyle(el).position);

    expect(musicStyles).toBe('fixed');
    expect(cartStyles).toBe('fixed');
  });
});
