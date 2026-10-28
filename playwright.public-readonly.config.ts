import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/production-safety',
  timeout: 45_000,
  retries: 1,
  workers: 2,
  reporter: [['line'],['html',{outputFolder:'playwright-public-report',open:'never'}]],
  use: {
    baseURL: 'https://tasteofgratitude.shop',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
  },
  projects: [
    {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
    {name:'mobile-chromium',use:{...devices['Pixel 7']}},
  ],
});
