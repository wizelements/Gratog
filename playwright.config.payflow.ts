/**
 * 🚀 Gratog Pay Flow — Playwright Configuration
 * E2E testing for mobile-first checkout flow
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/pay-flow',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Action timeout
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 30000,
    
    // Extra headers
    extraHTTPHeaders: {
      'X-Test-Mode': 'e2e'
    }
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium-mobile',
      use: {
        ...devices['iPhone 14'],
        // Mobile viewport
        viewport: { width: 390, height: 844 },
      },
    },
    
    {
      name: 'firefox-mobile',
      use: {
        ...devices['Pixel 7'],
        // Mobile viewport
        viewport: { width: 412, height: 915 },
      },
    },
    
    {
      name: 'webkit-mobile',
      use: {
        ...devices['iPhone 14 Pro Max'],
      },
    },
    
    // Desktop for comparison
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  
  // Run local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  // Test timeout
  timeout: 60000,
  
  // Expect timeout
  expect: {
    timeout: 5000
  }
});
