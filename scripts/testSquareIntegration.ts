#!/usr/bin/env npx tsx
/**
 * Square Integration Test Script
 * 
 * Tests all Square integration components to ensure they're working correctly.
 * Run this after setting up Square credentials and before deployment.
 */

import { getSquareClient } from '../lib/square';
import { fromCents, toCents } from '../lib/money';

async function testSquareIntegration() {
  console.log('🎡 Starting Square Integration Test Suite\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Helper function for test results
  function testResult(testName: string, passed: boolean, details?: string) {
    totalTests++;
    if (passed) {
      passedTests++;
      console.log(`✅ ${testName}`);
      if (details) console.log(`   ${details}`);
    } else {
      console.log(`❌ ${testName}`);
      if (details) console.log(`   Error: ${details}`);
    }
  }
  
  try {
    // Initialize Square client
    const square = getSquareClient();
    const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || '';
    
    // Test 1: Configuration Validation
    console.log('🔧 Testing Square Configuration...');
    try {
      const hasAccessToken = !!process.env.SQUARE_ACCESS_TOKEN;
      const hasLocationId = !!SQUARE_LOCATION_ID;
      testResult('Square Configuration', hasAccessToken && hasLocationId, 
        `Environment: ${process.env.SQUARE_ENVIRONMENT}, Location: ${SQUARE_LOCATION_ID.substring(0, 8)}...`);
    } catch (error) {
      testResult('Square Configuration', false, 
        error instanceof Error ? error.message : 'Configuration validation failed');
      return; // Can't continue without valid config
    }
    
    // Test 2: Square Client Initialization
    console.log('\n🔌 Testing Square Client...');
    try {
      // Test with a simple API call that doesn't require special permissions
      const response = await square.locationsApi.listLocations();
      const locationFound = response.result.locations?.some(loc => loc.id === SQUARE_LOCATION_ID);
      testResult('Square Client Connection', response.statusCode === 200,
        `Status: ${response.statusCode}, Locations found: ${response.result.locations?.length || 0}`);
      testResult('Location ID Validation', !!locationFound,
        locationFound ? 'Location ID is valid' : 'Location ID not found in account');
    } catch (error) {
      testResult('Square Client Connection', false,
        error instanceof Error ? error.message : 'Unknown connection error');
    }
    
    // Test 3: Catalog API Access
    console.log('\n📋 Testing Catalog API...');
    try {
      const response = await square.catalogApi.listCatalog({ limit: 5 });
      testResult('Catalog API Access', response.statusCode === 200,
        `Status: ${response.statusCode}, Objects found: ${response.result.objects?.length || 0}`);
    } catch (error) {
      testResult('Catalog API Access', false,
        error instanceof Error ? error.message : 'Catalog API error');
    }
    
    // Test 4: Money Utilities
    console.log('\n💰 Testing Money Utilities...');
    try {
      const dollarAmount = 12.34;
      const cents = toCents(dollarAmount);
      const convertedBack = fromCents({ amount: BigInt(cents) });
      
      testResult('Money Conversion', convertedBack === dollarAmount,
        `$${dollarAmount} -> ${cents} cents -> $${convertedBack}`);
        
      // Test edge cases
      const zeroMoney = fromCents(undefined);
      testResult('Money Edge Cases', zeroMoney === 0,
        'Undefined money object returns 0');
        
    } catch (error) {
      testResult('Money Utilities', false,
        error instanceof Error ? error.message : 'Money utility error');
    }
    
    // Test 5: Orders API (Calculate Order)
    console.log('\n📋 Testing Orders API...');
    try {
      // Test with a simple order calculation (no actual purchase)
      const testOrder = {
        order: {
          locationId: SQUARE_LOCATION_ID,
          lineItems: [{
            name: 'Test Item',
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(1000), // $10.00
              currency: 'USD'
            }
          }]
        }
      };
      
      const response = await square.ordersApi.calculateOrder(testOrder);
      const calculated = response.statusCode === 200 && response.result.order;
      const totalAmount = response.result.order?.totalMoney ? fromCents(response.result.order.totalMoney) : 0;
      testResult('Orders API (Calculate)', !!calculated,
        calculated ? `Total: $${totalAmount}` : 'Calculation failed');
        
    } catch (error) {
      testResult('Orders API (Calculate)', false,
        error instanceof Error ? error.message : 'Orders API error');
    }
    
    // Test 6: Checkout API (Payment Links) - Test creation only
    console.log('\n💳 Testing Checkout API...');
    try {
      const testCheckout = {
        order: {
          locationId: SQUARE_LOCATION_ID,
          lineItems: [{
            name: 'Test Product',
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(100), // $1.00
              currency: 'USD'
            }
          }]
        },
        checkoutOptions: {
          redirectUrl: 'https://example.com/success'
        }
      };
      
      const response = await square.checkoutApi.createPaymentLink(testCheckout);
      const linkCreated = response.statusCode === 200 && response.result.paymentLink;
      testResult('Checkout API (Payment Links)', !!linkCreated,
        linkCreated ? `Link ID: ${response.result.paymentLink!.id}` : 'Link creation failed');
        
    } catch (error) {
      testResult('Checkout API (Payment Links)', false,
        error instanceof Error ? error.message : 'Checkout API error');
    }
    
    // Test 7: Environment Detection
    console.log('\n🌍 Testing Environment Detection...');
    try {
      const isProduction = process.env.SQUARE_ENVIRONMENT === 'production';
      const isSandbox = process.env.SQUARE_ENVIRONMENT === 'sandbox' || !process.env.SQUARE_ENVIRONMENT;
      
      testResult('Environment Detection', isProduction || isSandbox,
        `Current environment: ${process.env.SQUARE_ENVIRONMENT || 'sandbox (default)'}`);
        
      if (isProduction) {
        console.log('   ⚠️  Production environment detected - use carefully!');
      }
      
    } catch (error) {
      testResult('Environment Detection', false,
        error instanceof Error ? error.message : 'Environment detection error');
    }
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  }
  
  // Final Results
  console.log('\n' + '='.repeat(60));
  console.log(`🏁 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('✅ All tests passed! Square integration is ready for use.');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Run: npm run sync-catalog');
    console.log('   2. Set up Square webhooks in Dashboard');
    console.log('   3. Deploy to production');
  } else {
    console.log(`⚠️  ${totalTests - passedTests} test(s) failed. Please fix issues before deployment.`);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Verify Square credentials in .env');
    console.log('   2. Check Square Developer Dashboard settings');
    console.log('   3. Ensure proper API permissions are enabled');
  }
  
  console.log('');
  
  return passedTests === totalTests;
}

// Run the test if this script is called directly
if (require.main === module) {
  testSquareIntegration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Test suite crashed:', error);
      process.exit(1);
    });
}

export default testSquareIntegration;