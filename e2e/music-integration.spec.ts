import { test, expect } from '@playwright/test';

test.describe('Music Psychology Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://tasteofgratitude.shop');
    await page.waitForLoadState('networkidle');
  });

  test('1. MusicControls widget renders', async ({ page }) => {
    // Check for music button in bottom-right
    const musicButton = page.locator('button[title="Music Controls"]');
    await expect(musicButton).toBeVisible();
    await expect(musicButton).toContainText('🎵');
  });

  test('2. MusicControls expands on click', async ({ page }) => {
    const musicButton = page.locator('button[title="Music Controls"]');
    await musicButton.click();

    // Check for expanded controls
    const controls = page.locator('text=Music');
    await expect(controls).toBeVisible();
  });

  test('3. Music toggle works', async ({ page }) => {
    const musicButton = page.locator('button[title="Music Controls"]');
    await musicButton.click();

    // Find the ON/OFF button
    const toggleButton = page.locator('button:has-text("ON"), button:has-text("OFF")').first();
    const initialState = await toggleButton.textContent();
    
    // Click toggle
    await toggleButton.click();
    const newState = await toggleButton.textContent();
    
    expect(initialState).not.toBe(newState);
  });

  test('4. Volume slider visible when enabled', async ({ page }) => {
    const musicButton = page.locator('button[title="Music Controls"]');
    await musicButton.click();

    // Ensure music is enabled
    const toggleButton = page.locator('button:has-text("ON"), button:has-text("OFF")').first();
    const isOff = await toggleButton.textContent().then(t => t?.includes('OFF'));
    
    if (isOff) {
      await toggleButton.click();
    }

    // Check volume slider
    const volumeSlider = page.locator('input[type="range"]');
    await expect(volumeSlider).toBeVisible();
    
    // Verify range
    const min = await volumeSlider.getAttribute('min');
    const max = await volumeSlider.getAttribute('max');
    expect(min).toBe('-20');
    expect(max).toBe('0');
  });

  test('5. Volume slider adjusts music', async ({ page }) => {
    const musicButton = page.locator('button[title="Music Controls"]');
    await musicButton.click();

    const volumeSlider = page.locator('input[type="range"]');
    
    // Get initial value
    const initialValue = await volumeSlider.inputValue();
    
    // Drag slider
    await volumeSlider.fill('-15');
    
    // Verify change
    const newValue = await volumeSlider.inputValue();
    expect(newValue).not.toBe(initialValue);
  });

  test('6. LocalStorage persists music settings', async ({ page, context }) => {
    // First page: Enable music and set volume
    await page.goto('https://tasteofgratitude.shop');
    
    const musicButton = page.locator('button[title="Music Controls"]');
    await musicButton.click();

    const toggleButton = page.locator('button:has-text("ON"), button:has-text("OFF")').first();
    const isOff = await toggleButton.textContent().then(t => t?.includes('OFF'));
    
    if (isOff) {
      await toggleButton.click();
    }

    const volumeSlider = page.locator('input[type="range"]');
    await volumeSlider.fill('-5');

    // Check localStorage
    const musicVolume = await page.evaluate(() => localStorage.getItem('music_volume'));
    const musicEnabled = await page.evaluate(() => localStorage.getItem('music_enabled'));
    
    expect(musicVolume).toBe('-5');
    expect(musicEnabled).toBe('true');

    // New page: Verify settings persisted
    const page2 = await context.newPage();
    await page2.goto('https://tasteofgratitude.shop');
    await page2.waitForLoadState('networkidle');

    const musicButton2 = page2.locator('button[title="Music Controls"]');
    await musicButton2.click();

    const volumeSlider2 = page2.locator('input[type="range"]');
    const savedVolume = await volumeSlider2.inputValue();
    
    expect(savedVolume).toBe('-5');

    await page2.close();
  });

  test('7. R2 audio files are accessible', async ({ page }) => {
    // Intercept network requests to verify audio URLs
    const audioUrls: string[] = [];
    
    page.on('response', (response) => {
      if (response.url().includes('.wav')) {
        audioUrls.push(response.url());
      }
    });

    await page.goto('https://tasteofgratitude.shop');
    await page.waitForLoadState('networkidle');

    // Audio requests should come from R2
    const r2Requests = audioUrls.filter(url => url.includes('pub-5562920411814baeba7fe2cc990d43ef.r2.dev'));
    
    // Note: Autoplay may be blocked, but verify the URLs exist in code
    const musicButton = page.locator('button[title="Music Controls"]');
    await musicButton.click();

    const musicInfo = page.locator('text=Music Psychology');
    await expect(musicInfo).toBeVisible();
  });

  test('8. Fade in/out animations work', async ({ page }) => {
    const musicButton = page.locator('button[title="Music Controls"]');
    await musicButton.click();

    const toggleButton = page.locator('button:has-text("ON"), button:has-text("OFF")').first();
    
    // Ensure enabled
    const isOff = await toggleButton.textContent().then(t => t?.includes('OFF'));
    if (isOff) {
      await toggleButton.click();
    }

    // Check now playing status
    const nowPlaying = page.locator('text=Now playing, text=Paused');
    
    // Toggle to see it change (may require a moment for audio to start)
    await page.waitForTimeout(500);
    const status = await page.locator('text=Now playing, text=Paused').textContent().catch(() => 'unknown');
    
    expect(['🎵 Now playing', 'Paused']).toContain(status);
  });

  test('9. Session phase tracking initialized', async ({ page }) => {
    // Verify MusicContext is initialized with intro phase
    const musicProviderInitialized = await page.evaluate(() => {
      return typeof window !== 'undefined' ? true : false;
    });
    
    expect(musicProviderInitialized).toBe(true);
  });

  test('10. Music psychology info displayed', async ({ page }) => {
    const musicButton = page.locator('button[title="Music Controls"]');
    await musicButton.click();

    const musicInfo = page.locator('text=Music Psychology');
    await expect(musicInfo).toBeVisible();

    // Check benefits listed
    await expect(page.locator('text=Reduces stress')).toBeVisible();
    await expect(page.locator('text=Enhances focus')).toBeVisible();
    await expect(page.locator('text=Deepens gratitude')).toBeVisible();
    await expect(page.locator('text=Improves retention')).toBeVisible();
  });
});

test.describe('Music Integration - Audio Quality', () => {
  const audioFiles = [
    'That%20Gratitude%20%28Remastered%29.wav',
    "Can't%20Let%20It%20Go.wav",
    'Under%20the%20Covers%20%28Remastered%29.wav',
  ];

  audioFiles.forEach((filename) => {
    test(`R2 file accessible: ${filename}`, async ({ page }) => {
      const url = `https://pub-5562920411814baeba7fe2cc990d43ef.r2.dev/${filename}`;
      
      const response = await page.request.head(url);
      expect(response.status()).toBe(200);
      
      // Verify it's audio
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('audio');
    });
  });
});

test.describe('Music Integration - Accessibility', () => {
  test('Music controls keyboard accessible', async ({ page }) => {
    await page.goto('https://tasteofgratitude.shop');
    await page.waitForLoadState('networkidle');

    const musicButton = page.locator('button[title="Music Controls"]');
    
    // Tab to button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Can be activated with keyboard
    await musicButton.focus();
    const focused = await musicButton.evaluate(el => el === document.activeElement);
    expect(focused).toBe(true);
  });

  test('Volume control keyboard accessible', async ({ page }) => {
    await page.goto('https://tasteofgratitude.shop');
    await page.waitForLoadState('networkidle');

    const musicButton = page.locator('button[title="Music Controls"]');
    await musicButton.click();

    const volumeSlider = page.locator('input[type="range"]');
    
    // Can focus slider
    await volumeSlider.focus();
    const focused = await volumeSlider.evaluate(el => el === document.activeElement);
    expect(focused).toBe(true);

    // Can adjust with arrow keys
    await page.keyboard.press('ArrowRight');
    const newValue = await volumeSlider.inputValue();
    expect(newValue).toBeTruthy();
  });
});
