import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for database integration tests
 * These tests require a running MongoDB instance
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Only include database tests
    include: [
      'tests/db/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      'node_modules/**',
      '.next/**'
    ],
    // Longer timeout for DB operations
    testTimeout: 15000,
    hookTimeout: 15000,
    // Run sequentially for database tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    // Setup file for database tests
    setupFiles: ['./tests/setup/db.setup.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});
