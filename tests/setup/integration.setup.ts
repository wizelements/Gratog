/**
 * Integration Test Setup
 * Runs before all integration tests
 */

import { beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

beforeAll(async () => {
  console.log(`Integration tests running against: ${BASE_URL}`);
  
  // Verify server is running
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    console.log('✅ Server health check passed');
  } catch (error) {
    console.error('❌ Server health check failed:', error);
    throw new Error(
      `Server not available at ${BASE_URL}. ` +
      'Make sure the server is running before running integration tests.'
    );
  }
});

afterAll(async () => {
  console.log('Integration tests completed');
});

// Export BASE_URL for use in tests
export { BASE_URL };
