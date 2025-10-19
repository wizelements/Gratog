#!/usr/bin/env node
/**
 * Square Credentials Diagnostic Test
 * Tests both Production and Sandbox credentials
 */

require('dotenv').config();
const { SquareClient, SquareEnvironment } = require('square');

async function testCredentials(name, accessToken, locationId, environment) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${name} Credentials`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Access Token: ${accessToken.substring(0, 20)}...`);
  console.log(`Location ID: ${locationId}`);
  console.log(`Environment: ${environment}`);
  
  const square = new SquareClient({
    accessToken: accessToken,
    environment: environment === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });
  
  const results = {
    name,
    tests: []
  };
  
  // Test 1: List Locations
  try {
    console.log('\n📍 Test 1: Listing Locations...');
    const response = await square.locations.list();
    const locations = response.result?.locations || [];
    console.log(`✅ SUCCESS - Found ${locations.length} location(s)`);
    locations.forEach(loc => {
      console.log(`   - ${loc.name} (${loc.id})${loc.id === locationId ? ' ← CONFIGURED' : ''}`);
    });
    results.tests.push({ test: 'List Locations', status: 'PASS', count: locations.length });
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    if (error.errors) {
      error.errors.forEach(err => console.log(`   Error: ${err.detail || err.code}`));
    }
    results.tests.push({ test: 'List Locations', status: 'FAIL', error: error.message });
  }
  
  // Test 2: Get Specific Location
  try {
    console.log(`\n📍 Test 2: Getting Location ${locationId}...`);
    const response = await square.locations.get(locationId);
    const location = response.result?.location;
    console.log(`✅ SUCCESS - Location: ${location?.name}`);
    console.log(`   Status: ${location?.status}`);
    console.log(`   Country: ${location?.country}`);
    console.log(`   Currency: ${location?.currency}`);
    results.tests.push({ test: 'Get Location', status: 'PASS', locationName: location?.name });
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    if (error.errors) {
      error.errors.forEach(err => console.log(`   Error: ${err.detail || err.code}`));
    }
    results.tests.push({ test: 'Get Location', status: 'FAIL', error: error.message });
  }
  
  // Test 3: List Catalog (first 5)
  try {
    console.log('\n📦 Test 3: Listing Catalog...');
    const response = await square.catalog.list(undefined, ['ITEM', 'ITEM_VARIATION']);
    const objects = response.result?.objects || [];
    const items = objects.filter(o => o.type === 'ITEM');
    const variations = objects.filter(o => o.type === 'ITEM_VARIATION');
    console.log(`✅ SUCCESS - Found ${objects.length} catalog objects`);
    console.log(`   Items: ${items.length}`);
    console.log(`   Variations: ${variations.length}`);
    if (items.length > 0) {
      console.log(`   Sample Items:`);
      items.slice(0, 3).forEach(item => {
        console.log(`     - ${item.itemData?.name || 'Unnamed'} (${item.id})`);
      });
    }
    results.tests.push({ test: 'List Catalog', status: 'PASS', objectCount: objects.length });
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    if (error.errors) {
      error.errors.forEach(err => console.log(`   Error: ${err.detail || err.code}`));
    }
    results.tests.push({ test: 'List Catalog', status: 'FAIL', error: error.message });
  }
  
  // Test 4: Check Permissions (try creating a test order calculation)
  try {
    console.log('\n💰 Test 4: Testing Orders API Permissions...');
    const response = await square.orders.calculate({
      order: {
        locationId: locationId,
        lineItems: [{
          name: 'Test Item',
          quantity: '1',
          basePriceMoney: {
            amount: BigInt(1000),
            currency: 'USD'
          }
        }]
      }
    });
    const order = response.result?.order;
    console.log(`✅ SUCCESS - Order calculation works`);
    console.log(`   Total: $${(Number(order?.totalMoney?.amount || 0) / 100).toFixed(2)}`);
    results.tests.push({ test: 'Orders API', status: 'PASS' });
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    if (error.errors) {
      error.errors.forEach(err => console.log(`   Error: ${err.detail || err.code}`));
    }
    results.tests.push({ test: 'Orders API', status: 'FAIL', error: error.message });
  }
  
  return results;
}

async function main() {
  console.log('\n🔍 SQUARE CREDENTIALS DIAGNOSTIC TEST');
  console.log('Testing NEW tokens provided by user\n');
  
  const allResults = [];
  
  // Test NEW Production Token
  const newProdToken = 'EAAAl671mGahA1rOE60uzBaRemRVwHqUzwXGPUt1swhMOLqLKIVEsHI_2J0N6BLD';
  const prodLocation = 'L66TVG6867BG9';
  const prodResults = await testCredentials('NEW PRODUCTION', newProdToken, prodLocation, 'production');
  allResults.push(prodResults);
  
  // Test NEW Sandbox Token
  const newSandboxToken = 'EAAAl8wKehLyKbudaUjiipwhL6ZidDxuZw2iD7y6RwoPnHqCuOfkaSn28b9xXL-x';
  const sandboxLocation = 'LYSFJ7XXCPQG5';
  const sandboxResults = await testCredentials('NEW SANDBOX', newSandboxToken, sandboxLocation, 'sandbox');
  allResults.push(sandboxResults);
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);
  
  allResults.forEach(envResults => {
    const passed = envResults.tests.filter(t => t.status === 'PASS').length;
    const failed = envResults.tests.filter(t => t.status === 'FAIL').length;
    console.log(`\n${envResults.name}:`);
    console.log(`  ✅ Passed: ${passed}/${envResults.tests.length}`);
    console.log(`  ❌ Failed: ${failed}/${envResults.tests.length}`);
    
    if (passed === envResults.tests.length) {
      console.log(`  🎉 ALL TESTS PASSED - ${envResults.name} credentials are VALID!`);
    } else {
      console.log(`  ⚠️  SOME TESTS FAILED - Check credentials or permissions`);
    }
  });
  
  // Recommendation
  const workingEnv = allResults.find(r => r.tests.every(t => t.status === 'PASS'));
  if (workingEnv) {
    console.log(`\n✅ RECOMMENDATION: Use ${workingEnv.name} credentials`);
  } else {
    console.log(`\n❌ ISSUE: Neither environment has valid credentials`);
    console.log(`\n📝 NEXT STEPS:`);
    console.log(`1. Go to: https://developer.squareup.com/apps`);
    console.log(`2. Select your application`);
    console.log(`3. Navigate to: Credentials tab`);
    console.log(`4. Generate new Access Tokens`);
    console.log(`5. Ensure the following permissions are enabled:`);
    console.log(`   - MERCHANT_PROFILE_READ`);
    console.log(`   - ITEMS_READ`);
    console.log(`   - ORDERS_READ`);
    console.log(`   - ORDERS_WRITE`);
    console.log(`   - PAYMENTS_READ`);
    console.log(`   - PAYMENTS_WRITE`);
    console.log(`6. Update .env with new credentials`);
  }
}

main().catch(console.error);
