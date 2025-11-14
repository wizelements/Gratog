/**
 * Test Setup for Square Integration Tests
 * Loads environment variables and verifies test prerequisites
 */

import { config } from 'dotenv';

// Load environment variables
config();

// Verify critical environment variables are loaded
const requiredEnvVars = [
  'SQUARE_ACCESS_TOKEN',
  'SQUARE_ENVIRONMENT',
  'SQUARE_LOCATION_ID',
  'NEXT_PUBLIC_SQUARE_APPLICATION_ID',
  'NEXT_PUBLIC_SQUARE_LOCATION_ID'
];

const missing = requiredEnvVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.warn('⚠️  Warning: Missing environment variables in test environment:');
  missing.forEach(varName => {
    console.warn(`   - ${varName}`);
  });
  console.warn('');
  console.warn('Some tests may fail due to missing configuration.');
  console.warn('Make sure .env file exists and contains all required Square credentials.');
  console.warn('');
}

// Force tests to use localhost instead of external URL to avoid 502 errors
if (process.env.NEXT_PUBLIC_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL.includes('localhost')) {
  console.log(`🔧 Overriding BASE_URL for tests: ${process.env.NEXT_PUBLIC_BASE_URL} → http://localhost:3000`);
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
}

// Log test environment configuration (masking sensitive data)
console.log('🧪 Square Test Environment Configuration:');
console.log(`   Environment: ${process.env.SQUARE_ENVIRONMENT || 'NOT SET'}`);
console.log(`   Token: ${process.env.SQUARE_ACCESS_TOKEN ? process.env.SQUARE_ACCESS_TOKEN.substring(0, 10) + '...' : 'NOT SET'}`);
console.log(`   Location ID: ${process.env.SQUARE_LOCATION_ID || 'NOT SET'}`);
console.log(`   App ID: ${process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || 'NOT SET'}`);
console.log(`   Test API URL: ${process.env.NEXT_PUBLIC_BASE_URL || 'NOT SET'}`);
console.log('');
