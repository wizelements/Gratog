// Direct test of Square SDK vs raw fetch
require('dotenv').config({ path: '.env' });
const { SquareClient, SquareEnvironment } = require('square');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const ENVIRONMENT = process.env.SQUARE_ENVIRONMENT;

console.log('\n=== Square SDK Test ===\n');
console.log('Environment variables:');
console.log('- ACCESS_TOKEN prefix:', ACCESS_TOKEN?.substring(0, 15));
console.log('- ACCESS_TOKEN length:', ACCESS_TOKEN?.length);
console.log('- ENVIRONMENT:', ENVIRONMENT);
console.log('');

// Test 1: Raw fetch (this should work based on earlier curl test)
async function testWithFetch() {
  console.log('TEST 1: Raw fetch to Square API');
  console.log('URL: https://connect.squareup.com/v2/locations');
  
  const response = await fetch('https://connect.squareup.com/v2/locations', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Square-Version': '2025-10-16',
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Status:', response.status);
  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ SUCCESS - Locations found:', data.locations?.length);
  } else {
    console.log('❌ FAILED - Error:', JSON.stringify(data, null, 2));
  }
  console.log('');
}

// Test 2: Square SDK
async function testWithSDK() {
  console.log('TEST 2: Square SDK');
  
  const client = new SquareClient({
    accessToken: ACCESS_TOKEN,
    environment: ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox
  });
  
  console.log('SDK Environment:', ENVIRONMENT === 'production' ? 'Production' : 'Sandbox');
  console.log('SDK Base URL:', client.getBaseUrl ? client.getBaseUrl() : '(cannot determine)');
  
  try {
    const response = await client.locations.list();
    console.log('✅ SUCCESS - Locations found:', response.result.locations?.length);
  } catch (error) {
    console.log('❌ FAILED - Error:', error.message);
    console.log('Status Code:', error.statusCode);
    console.log('Error details:', JSON.stringify(error.errors, null, 2));
  }
  console.log('');
}

// Test 3: Check what the SDK environment actually resolves to
async function testEnvironmentResolution() {
  console.log('TEST 3: Environment Resolution');
  console.log('SquareEnvironment.Production:', SquareEnvironment.Production);
  console.log('SquareEnvironment.Sandbox:', SquareEnvironment.Sandbox);
  console.log('Current environment setting:', ENVIRONMENT);
  console.log('Resolved to:', ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox);
  console.log('');
}

// Run all tests
(async () => {
  try {
    await testEnvironmentResolution();
    await testWithFetch();
    await testWithSDK();
  } catch (error) {
    console.error('Test error:', error);
  }
})();
