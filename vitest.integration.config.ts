import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for integration tests
 * These tests require a running server and database
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Only include API integration tests
    include: [
      'tests/api/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      'node_modules/**',
      '.next/**'
    ],
    // Longer timeout for API calls
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run tests sequentially to avoid race conditions
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    // Retry flaky tests once
    retry: 1,
    // Setup file for integration tests
    setupFiles: ['./tests/setup/integration.setup.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});
