import { test, expect } from '@playwright/test';

test.describe('Mobile Music Widget - Debugging', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone size
    
    // Capture all console messages
    const consoleLogs: { type: string; message: string }[] = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        message: msg.text()
      });
      console.log(`[${msg.type()}] ${msg.text()}`);
    });

    // Capture page errors
    page.on('pageerror', error => {
      console.error('[PAGE ERROR]', error);
    });
  });

  test('Mobile viewport - Music widget should be visible', async ({ page }) => {
    console.log('\n=== Testing Mobile Music Widget ===\n');
    
    // Navigate to site
    console.log('📍 Navigating to tasteofgratitude.shop...');
    await page.goto('https://tasteofgratitude.shop', { waitUntil: 'networkidle' });

    // Wait for hydration
    console.log('⏳ Waiting for hydration...');
    await page.waitForTimeout(3000);

    // Check if MusicControls is in DOM
    console.log('🔍 Checking if MusicControls is in DOM...');
    const musicButton = await page.locator('button[aria-label="Music controls toggle"]');
    
    console.log(`Button visible: ${await musicButton.isVisible()}`);
    console.log(`Button in DOM: ${await musicButton.count() > 0}`);

    // Screenshot
    await page.screenshot({ path: 'music-widget-mobile-before.png', fullPage: false });
    console.log('📸 Screenshot saved: music-widget-mobile-before.png');

    // Check for music emoji button
    const emojiButton = await page.locator('button:has(span:contains("🎵"))');
    console.log(`Emoji button found: ${await emojiButton.count() > 0}`);

    // Check entire fixed position element
    const fixedDiv = await page.locator('div.fixed.bottom-4.right-4');
    console.log(`Fixed div found: ${await fixedDiv.count() > 0}`);
    if (await fixedDiv.count() > 0) {
      const isVisible = await fixedDiv.isVisible();
      console.log(`Fixed div visible: ${isVisible}`);
      
      const bbox = await fixedDiv.boundingBox();
      console.log(`Fixed div position:`, bbox);
    }

    // Try clicking the button if it exists
    if (await musicButton.count() > 0) {
      console.log('✅ Button found! Clicking...');
      await musicButton.click();
      await page.waitForTimeout(500);

      // Check if panel expanded
      const panel = await page.locator('#music-controls-panel');
      if (await panel.count() > 0) {
        console.log('✅ Panel found after click');
        await page.screenshot({ path: 'music-widget-mobile-expanded.png' });
      }
    } else {
      console.log('❌ Button NOT found');

      // Debug: Check what's actually in the DOM
      const bodyText = await page.innerText('body');
      console.log('🔍 Body contains "🎵":', bodyText.includes('🎵'));
      console.log('🔍 Body contains "Music":', bodyText.includes('Music'));

      // Check for error boundary fallback (❌ button)
      const errorButton = await page.locator('button:contains("❌")');
      if (await errorButton.count() > 0) {
        console.log('⚠️  ERROR BOUNDARY TRIGGERED - Music widget failed to render');
      }
    }

    // Check console for errors
    const pageContent = await page.content();
    console.log('📊 Page loaded successfully');

    // Try to access useMusic context directly via page evaluation
    try {
      const contextTest = await page.evaluate(() => {
        // This will fail if context not available, but that's the point
        return typeof window !== 'undefined' ? 'window available' : 'no window';
      });
      console.log('✅ Context test:', contextTest);
    } catch (error) {
      console.error('❌ Context evaluation failed:', error);
    }
  });

  test('Mobile - Check console errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.error('🚨 CONSOLE ERROR:', msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.toString());
      console.error('🚨 PAGE ERROR:', error);
    });

    console.log('\n=== Checking for JavaScript Errors ===\n');
    
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('https://tasteofgratitude.shop', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log(`Total errors found: ${errors.length}`);
    if (errors.length > 0) {
      console.error('Errors:', errors);
    } else {
      console.log('✅ No JavaScript errors detected');
    }

    expect(errors.length).toBe(0);
  });

  test('Mobile - Verify MusicProvider is in tree', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    page.on('console', msg => {
      console.log(`[${msg.type()}] ${msg.text()}`);
    });

    console.log('\n=== Checking MusicProvider ===\n');
    
    await page.goto('https://tasteofgratitude.shop', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Check if MusicProvider rendered
    const musicProvider = await page.evaluate(() => {
      // Try to find any music context indicators
      const html = document.documentElement.innerHTML;
      return {
        hasHTML: html.length > 0,
        containsMusic: html.includes('music'),
        containsAudio: html.includes('audio'),
        bodyChildren: document.body.children.length
      };
    });

    console.log('DOM Analysis:', musicProvider);

    // Try to access context from components
    const contextCheck = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      return {
        totalButtons: buttons.length,
        ariaLabelButtons: Array.from(buttons).filter(b => b.hasAttribute('aria-label')).length,
        musicButtons: Array.from(buttons).filter(b => b.getAttribute('aria-label')?.includes('Music')).length
      };
    });

    console.log('Button Analysis:', contextCheck);
  });

  test('Mobile - Check if widget renders with error fallback', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    console.log('\n=== Checking for Error Fallback Button ===\n');

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('🚨', msg.text());
      }
    });

    await page.goto('https://tasteofgratitude.shop', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Look for disabled error button (❌)
    const disabledButtons = await page.locator('button:disabled');
    console.log(`Disabled buttons: ${await disabledButtons.count()}`);

    const buttons = await page.locator('button');
    const buttonCount = await buttons.count();
    console.log(`Total buttons: ${buttonCount}`);

    // Check button contents
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      const isDisabled = await btn.isDisabled();
      console.log(`Button ${i}: text="${text}", aria="${ariaLabel}", disabled=${isDisabled}`);
    }
  });
});
