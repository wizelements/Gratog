import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env file
config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 15000, // Increase timeout to 15s to handle slow API calls
    include: ['tests/square/**/*.{test,spec}.{js,ts}'],
    exclude: [
      'node_modules/**',
      '.next/**',
      'e2e/**',
      'playwright-report/**',
      '**/*.config.*',
      '**/dist/**'
    ],
    setupFiles: ['./tests/square/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});
