/**
 * Square API Connectivity Test
 * Tests if Square credentials are valid and can access the API
 */

const env = (process.env.SQUARE_ENVIRONMENT?.toLowerCase() === 'production' ? 'production' : 'sandbox');
const BASES = {
  production: 'https://connect.squareup.com',
  sandbox: 'https://connect.squareupsandbox.com',
};

async function sqFetch(path, options = {}) {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const url = `${BASES[env]}${path}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Square-Version': '2025-10-16',
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  
  if (!res.ok) {
    throw Object.assign(
      new Error(json?.errors?.[0]?.detail || `Square ${res.status}`),
      { status: res.status, errors: json?.errors, body: json }
    );
  }
  
  return json;
}

async function testSquareConnectivity() {
  console.log('=== SQUARE API CONNECTIVITY TEST ===\n');

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;

  console.log('Configuration:');
  console.log(`- Environment: ${env}`);
  console.log(`- Base URL: ${BASES[env]}`);
  console.log(`- Location ID: ${locationId}`);
  console.log(`- Token Prefix: ${accessToken ? accessToken.substring(0, 15) + '...' : 'NOT SET'}`);
  console.log(`- Token Length: ${accessToken ? accessToken.length : 0}`);
  console.log('');

  if (!accessToken || !locationId) {
    console.error('❌ ERROR: Square credentials not configured in .env');
    process.exit(1);
  }

  console.log('Testing Square API connectivity via REST...\n');


  // Test 1: Retrieve location details
  console.log('Test 1: Retrieving location details...');
  try {
    const result = await sqFetch(`/v2/locations/${locationId}`);
    console.log('✅ SUCCESS: Location retrieved');
    console.log(`   Name: ${result.location?.name || 'N/A'}`);
    console.log(`   Address: ${result.location?.address?.address_line_1 || 'N/A'}`);
    console.log('');
  } catch (error) {
    console.error('❌ FAILED: Could not retrieve location');
    console.error(`   Error: ${error.message}`);
    if (error.errors) {
      console.error(`   Details: ${JSON.stringify(error.errors, null, 2)}`);
    }
    console.log('');
  }

  // Test 2: List catalog items
  console.log('Test 2: Listing catalog items...');
  try {
    const result = await sqFetch('/v2/catalog/list?types=ITEM');
    const items = result.objects || [];
    console.log(`✅ SUCCESS: Retrieved ${items.length} catalog items`);
    if (items.length > 0) {
      console.log(`   Sample: ${items[0].item_data?.name || 'N/A'}`);
    }
    console.log('');
  } catch (error) {
    console.error('❌ FAILED: Could not list catalog items');
    console.error(`   Error: ${error.message}`);
    if (error.errors) {
      console.error(`   Details: ${JSON.stringify(error.errors, null, 2)}`);
    }
    console.log('');
  }

  // Test 3: Check inventory
  console.log('Test 3: Checking inventory access...');
  try {
    const result = await sqFetch('/v2/inventory/counts/batch-retrieve', {
      method: 'POST',
      body: JSON.stringify({
        location_ids: [locationId]
      })
    });
    console.log('✅ SUCCESS: Inventory API accessible');
    console.log(`   Inventory counts: ${result.counts?.length || 0}`);
    console.log('');
  } catch (error) {
    console.error('❌ FAILED: Could not access inventory');
    console.error(`   Error: ${error.message}`);
    if (error.errors) {
      console.error(`   Details: ${JSON.stringify(error.errors, null, 2)}`);
    }
    console.log('');
  }

  // Test 4: Test payment capability (create minimal order)
  console.log('Test 4: Testing Orders API access...');
  try {
    const result = await sqFetch('/v2/orders', {
      method: 'POST',
      body: JSON.stringify({
        order: {
          location_id: locationId,
          line_items: [
            {
              name: 'Test Item',
              quantity: '1',
              base_price_money: {
                amount: 100, // $1.00
                currency: 'USD'
              }
            }
          ],
          state: 'DRAFT'
        },
        idempotency_key: `test-${Date.now()}`
      })
    });
    console.log('✅ SUCCESS: Orders API accessible');
    console.log(`   Order ID: ${result.order?.id || 'N/A'}`);
    console.log('');
  } catch (error) {
    console.error('❌ FAILED: Could not create test order');
    console.error(`   Error: ${error.message}`);
    if (error.errors) {
      console.error(`   Details: ${JSON.stringify(error.errors, null, 2)}`);
    }
    console.log('');
  }

  console.log('=== TEST COMPLETE ===');
}

// Load .env
require('dotenv').config({ path: '.env' });

testSquareConnectivity().catch(console.error);
