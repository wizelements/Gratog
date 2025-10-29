/**
 * Square API Connectivity Test
 * Tests if Square credentials are valid and can access the API
 */

const { SquareClient, SquareEnvironment } = require('square');

async function testSquareConnectivity() {
  console.log('=== SQUARE API CONNECTIVITY TEST ===\n');

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const environment = process.env.SQUARE_ENVIRONMENT || 'sandbox';

  console.log('Configuration:');
  console.log(`- Environment: ${environment}`);
  console.log(`- Location ID: ${locationId}`);
  console.log(`- Token Prefix: ${accessToken ? accessToken.substring(0, 15) + '...' : 'NOT SET'}`);
  console.log(`- Token Length: ${accessToken ? accessToken.length : 0}`);
  console.log('');

  if (!accessToken || !locationId) {
    console.error('❌ ERROR: Square credentials not configured in .env');
    process.exit(1);
  }

  const client = new SquareClient({
    accessToken,
    environment: environment === 'production' 
      ? SquareEnvironment.Production 
      : SquareEnvironment.Sandbox,
  });

  console.log('Testing Square API connectivity...\n');

  // Test 1: Retrieve location details
  console.log('Test 1: Retrieving location details...');
  try {
    const { result } = await client.locations.retrieveLocation(locationId);
    console.log('✅ SUCCESS: Location retrieved');
    console.log(`   Name: ${result.location?.name || 'N/A'}`);
    console.log(`   Address: ${result.location?.address?.addressLine1 || 'N/A'}`);
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
    const { result } = await client.catalog.listCatalog(undefined, 'ITEM');
    const items = result.objects || [];
    console.log(`✅ SUCCESS: Retrieved ${items.length} catalog items`);
    if (items.length > 0) {
      console.log(`   Sample: ${items[0].itemData?.name || 'N/A'}`);
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
    const { result } = await client.inventory.batchRetrieveInventoryCounts({
      locationIds: [locationId],
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
  console.log('Test 4: Testing payment API access...');
  try {
    const { result } = await client.orders.createOrder({
      order: {
        locationId: locationId,
        lineItems: [
          {
            name: 'Test Item',
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(100), // $1.00
              currency: 'USD'
            }
          }
        ],
        state: 'DRAFT'
      },
      idempotencyKey: `test-${Date.now()}`
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
