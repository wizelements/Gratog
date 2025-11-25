import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: [
      'node_modules/**',
      '.next/**',
      'e2e/**',
      'playwright-report/**',
      '**/*.config.*',
      '**/dist/**',
      // Exclude Square integration tests from default run (requires running server + env vars)
      'tests/square/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'e2e/**',
        'playwright-report/**',
        '**/*.config.*',
        '**/dist/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});
