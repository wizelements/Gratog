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
    // Extended timeouts for API calls and network operations
    // Square API calls can take time, database operations might be slow
    testTimeout: 60000,    // 60 seconds per test
    hookTimeout: 60000,    // 60 seconds for setup/teardown
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
