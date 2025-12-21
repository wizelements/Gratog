import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/hardening',
  timeout: 120_000,
  retries: 2,
  reporter: [
    ['html', { outputFolder: 'playwright-report-hardening', open: 'never' }],
    ['json', { outputFile: 'test-results/hardening.json' }],
    ['junit', { outputFile: 'test-results/hardening.xml' }],
    ['line'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
