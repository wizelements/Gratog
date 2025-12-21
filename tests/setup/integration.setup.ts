/**
 * Integration Test Setup
 * Runs before all integration tests
 */

import { beforeAll, afterAll } from 'vitest';

// Normalize BASE_URL: ensure it's a valid absolute URL
const normalizeBaseUrl = (url: string | undefined): string => {
  const raw = url || 'http://localhost:3000';
  
  // If it's already a full URL, return as-is
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // If it's just a path (like "/" or "/api"), prepend default host
  if (raw.startsWith('/')) {
    return `http://localhost:3000${raw}`.replace(/\/$/, '');
  }
  
  // If it's just a hostname, add protocol
  if (!raw.includes('://')) {
    return `http://${raw}`.replace(/\/$/, '');
  }
  
  return raw.replace(/\/$/, '');
};

const BASE_URL = normalizeBaseUrl(process.env.BASE_URL);

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
