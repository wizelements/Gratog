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
      'tests/e2e/**',
      'playwright-report/**',
      '**/*.config.*',
      '**/dist/**',
      // Exclude integration tests that require running server or database
      'tests/square/**',
      'tests/api/**',
      'tests/db/**'
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
