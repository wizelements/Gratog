import { defineConfig, devices } from '@playwright/test';

// Read-only customer journeys against an externally provided preview or staging URL.
// Do not start a local production server when auditing a deployed site.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'production-customer-journeys.spec.ts',
  timeout: 45_000,
  expect: { timeout: 12_000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'https://tasteofgratitude.shop',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'customer-desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'customer-mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
});
