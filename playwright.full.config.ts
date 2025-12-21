import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
    ['list'],
  ],
  
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile devices
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'firefox-mobile',
      use: { ...devices['Galaxy S5'] },
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 12'] },
    },

    // Tablets
    {
      name: 'chromium-tablet',
      use: { ...devices['iPad Pro'] },
    },
    {
      name: 'firefox-tablet',
      use: { ...devices['iPad Mini'] },
    },
    {
      name: 'webkit-tablet',
      use: { ...devices['iPad Pro 11'] },
    },

    // Edge cases
    {
      name: 'chromium-slow-4g',
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'throttle': 'slow-4g',
        },
      },
    },
    {
      name: 'chromium-high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 2,
      },
    },
  ],
});
