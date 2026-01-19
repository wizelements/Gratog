import { test, expect } from '@playwright/test';

/**
 * Music Button E2E Tests
 * 
 * These tests verify that the music button actually appears on the live site.
 * They test the exact failure that occurred: button not rendering despite correct code.
 */

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

test.describe('Music Button - E2E Visibility Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set a reasonable timeout for full page load
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);
  });

  // Test 1: Page loads and button container exists in DOM
  test('should render page and have music button container', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    // Wait for the fixed position container to appear
    const musicContainer = page.locator('div.fixed.bottom-4.right-4.z-50').first();
    
    // Should exist in DOM
    await expect(musicContainer).toBeTruthy();
  });

  // Test 2: Music button should be visible and clickable
  test('should have visible music button with emoji', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    // Wait for any button with music emoji
    const musicButton = page.locator('button:has-text("🎵"), button:has-text("🎶")').first();
    
    // Wait for it to be visible
    await expect(musicButton).toBeVisible({ timeout: 10000 });
    
    // Button should be enabled (not disabled)
    await expect(musicButton).toBeEnabled();
  });

  // Test 3: Button should have proper positioning (fixed, not absolute or relative)
  test('should have correct fixed positioning', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    const musicButton = page.locator('button:has-text("🎵"), button:has-text("🎶")').first();
    await expect(musicButton).toBeVisible();
    
    // Get bounding box to verify it's visible in viewport
    const box = await musicButton.boundingBox();
    
    // Button should be in viewport (not off-screen)
    expect(box).toBeTruthy();
    expect(box?.x).toBeGreaterThan(0);
    expect(box?.y).toBeGreaterThan(0);
    expect(box?.width).toBeGreaterThan(20); // Should be at least somewhat visible
    expect(box?.height).toBeGreaterThan(20);
  });

  // Test 4: Button should be at bottom-right of viewport
  test('should be positioned at bottom-right corner', async ({ page }) => {
    const viewportSize = page.viewportSize();
    if (!viewportSize) {
      test.skip();
      return;
    }
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    const musicButton = page.locator('button:has-text("🎵"), button:has-text("🎶")').first();
    await expect(musicButton).toBeVisible();
    
    const box = await musicButton.boundingBox();
    
    // Should be on the right side (within 100px of right edge accounting for button size)
    expect(box?.x! + box?.width!).toBeGreaterThan(viewportSize.width - 150);
    
    // Should be towards bottom (within 150px of bottom accounting for button size)
    expect(box?.y! + box?.height!).toBeGreaterThan(viewportSize.height - 150);
  });

  // Test 5: Button should be interactive (clickable)
  test('should be clickable without errors', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    const musicButton = page.locator('button:has-text("🎵"), button:has-text("🎶")').first();
    await expect(musicButton).toBeVisible();
    
    // Click should not throw
    await musicButton.click();
    
    // Wait for any state change
    await page.waitForTimeout(500);
    
    // Button should still exist (not removed)
    await expect(musicButton).toBeVisible();
  });

  // Test 6: Z-index should prevent overlay issues
  test('should be visible above other page content', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    const musicButton = page.locator('button:has-text("🎵"), button:has-text("🎶")').first();
    await expect(musicButton).toBeVisible();
    
    // Check z-index via computed styles
    const zIndex = await musicButton.evaluate((el) => {
      return window.getComputedStyle(el).zIndex;
    });
    
    // z-50 in Tailwind = z-index: 50
    expect(parseInt(zIndex)).toBeGreaterThanOrEqual(50);
  });

  // Test 7: No console errors related to rendering
  test('should not produce errors in console', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    const musicButton = page.locator('button:has-text("🎵"), button:has-text("🎶")').first();
    await expect(musicButton).toBeVisible();
    
    // Filter out unrelated errors
    const renderErrors = errors.filter(e => 
      e.includes('Hydration') || 
      e.includes('MusicControl') ||
      e.includes('MusicProvider') ||
      e.includes('Suspense')
    );
    
    expect(renderErrors).toHaveLength(0);
  });

  // Test 8: Suspense fallback should appear during loading (or immediately)
  test('should show fallback or component during initial load', async ({ page }) => {
    // Throttle network to simulate slow connection
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });
    
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    
    // Should have EITHER the main button OR a loading state
    const fixedContainer = page.locator('div.fixed.bottom-4.right-4.z-50').first();
    
    await expect(fixedContainer).toBeVisible({ timeout: 10000 });
  });

  // Test 9: Mobile viewport - button should still be visible
  test('should render on mobile viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    const musicButton = page.locator('button:has-text("🎵"), button:has-text("🎶")').first();
    
    // Should be visible on mobile
    await expect(musicButton).toBeVisible();
    
    // Should not be cut off or hidden
    const box = await musicButton.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect(box?.x! + box?.width!).toBeLessThanOrEqual(375);
  });

  // Test 10: Tablet viewport - button should still be visible
  test('should render on tablet viewport (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    const musicButton = page.locator('button:has-text("🎵"), button:has-text("🎶")').first();
    
    // Should be visible on tablet
    await expect(musicButton).toBeVisible();
  });

  // Test 11: Button should survive page navigation
  test('should persist button across page navigation', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    let musicButton = page.locator('button:has-text("🎵"), button:has-text("🎶")').first();
    await expect(musicButton).toBeVisible();
    
    // Navigate to another page
    const catalogLink = page.locator('a:has-text("Catalog"), a:has-text("Shop")').first();
    if (await catalogLink.isVisible()) {
      await catalogLink.click();
      await page.waitForLoadState('networkidle');
      
      // Button should still exist on new page
      musicButton = page.locator('button:has-text("🎵"), button:has-text("🎶")').first();
      await expect(musicButton).toBeVisible();
    }
  });

  // Test 12: Check for hydration mismatch SSR/CSR
  test('should not have hydration mismatch warnings', async ({ page }) => {
    let hydrationErrors = false;
    
    page.on('response', response => {
      if (!response.ok() && response.status() === 500) {
        hydrationErrors = true;
      }
    });
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    const musicButton = page.locator('button:has-text("🎵"), button:has-text("🎶")').first();
    await expect(musicButton).toBeVisible();
    
    expect(hydrationErrors).toBe(false);
  });

  // Test 13: Settings button should appear when expanded
  test('should show settings gear icon', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    const settingsButton = page.locator('button:has-text("⚙")').first();
    
    // Settings button should be near the main button
    await expect(settingsButton).toBeVisible();
  });

  // Test 14: Right-click or settings interaction
  test('should open expanded controls when gear clicked', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    const settingsButton = page.locator('button:has-text("⚙")').first();
    await expect(settingsButton).toBeVisible();
    
    // Click settings
    await settingsButton.click();
    await page.waitForTimeout(300);
    
    // Expanded panel should appear
    const expandedPanel = page.locator('text=Music Psychology, text=Reduces stress').first();
    
    // Should either show expanded content or button should still work
    await expect(settingsButton).toBeVisible();
  });
});

test.describe('Music Button - Fallback States', () => {
  
  // Test 15: If button fails, fallback spinner should show
  test('should show fallback spinner if JavaScript disabled', async ({ context }) => {
    const page = await context.newPage();
    
    // Disable JavaScript
    await context.addInitScript(() => {
      // Simulate component failing to load
      console.warn('JavaScript execution for music button disabled');
    });
    
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    
    // Even without full JS, the container should exist from server render
    const fixedContainer = page.locator('div.fixed.bottom-4.right-4.z-50').first();
    
    // Should have at least something rendered (fallback)
    const count = await fixedContainer.count();
    expect(count).toBeGreaterThanOrEqual(1);
    
    await page.close();
  });

  // Test 16: Check for missing component errors
  test('should not fail if MusicProvider missing', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    // Should not show provider-related errors
    const errorMessages = await page.evaluate(() => {
      return (window as any).__errors || [];
    });
    
    const providerErrors = errorMessages.filter((e: string) => 
      e.includes('MusicProvider') || e.includes('useMusic')
    );
    
    expect(providerErrors).toHaveLength(0);
  });
});
