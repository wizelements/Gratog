#!/usr/bin/env npx tsx
// @ts-nocheck
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
    // Test 1: Square Client Creation
    console.log('\n🔧 Testing Square Client Creation...');
    const square = getSquareClient();
    testResult('Square Client Created', !!square, 'Client instance created successfully');
    testResult('Catalog API Available', !!square.catalog, 'catalog API accessible');
    testResult('Payments API Available', !!square.payments, 'payments API accessible');
    testResult('Orders API Available', !!square.orders, 'orders API accessible');
    testResult('Checkout API Available', !!square.checkout, 'checkout API accessible');
    testResult('Locations API Available', !!square.locations, 'locations API accessible');
    
    // Test 2: Money Utilities
    console.log('\n💰 Testing Money Utilities...');
    const cents = toCents(10.99);
    testResult('Dollar to Cents Conversion', cents === 1099, `$10.99 = ${cents} cents`);
    
    const dollars = fromCents({ amount: BigInt(1099), currency: 'USD' });
    testResult('Cents to Dollar Conversion', dollars === 10.99, `1099 cents = $${dollars}`);
    
    // Test 3: Locations API
    console.log('\n📍 Testing Locations API...');
    try {
      const response = await square.locations.list({});
      testResult('Locations API Access', !!response.result,
        `Locations found: ${response.result.locations?.length || 0}`);
    } catch (error: any) {
      testResult('Locations API Access', false,
        error instanceof Error ? error.message : 'Locations API error');
    }
    
    // Test 4: Catalog API
    console.log('\n📋 Testing Catalog API...');
    try {
      const response = await square.catalog.list({ limit: 5, types: 'ITEM' });
      testResult('Catalog API Access', !!response.result,
        `Objects found: ${response.result.objects?.length || 0}`);
    } catch (error: any) {
      testResult('Catalog API Access', false,
        error instanceof Error ? error.message : 'Catalog API error');
    }
    
    // Test 5: Orders API (test validation, not actual order creation)
    console.log('\n📦 Testing Orders API...');
    try {
      // Try to retrieve non-existent order to test API access
      await square.orders.get({ orderId: 'test-order-does-not-exist' });
      testResult('Orders API Access', false, 'Should have thrown 404');
    } catch (error: any) {
      if (error.statusCode === 404) {
        testResult('Orders API Access', true, 'API accessible (404 expected for test order)');
      } else if (error.statusCode === 401) {
        testResult('Orders API Access', false, 'Authentication failed - check token');
      } else {
        testResult('Orders API Access', false, error.message);
      }
    }
    
    // Test 6: Payments API (test validation, not actual payment)
    console.log('\n💳 Testing Payments API...');
    try {
      await square.payments.get({ paymentId: 'test-payment-does-not-exist' });
      testResult('Payments API Access', false, 'Should have thrown 404');
    } catch (error: any) {
      if (error.statusCode === 404) {
        testResult('Payments API Access', true, 'API accessible (404 expected for test payment)');
      } else if (error.statusCode === 401) {
        testResult('Payments API Access', false, 'Authentication failed - check token');
      } else {
        testResult('Payments API Access', false, error.message);
      }
    }
    
    // Test 7: Checkout API (test validation)
    console.log('\n🛒 Testing Checkout API...');
    try {
      await square.checkout.get({ paymentLinkId: 'test-link-does-not-exist' });
      testResult('Checkout API Access', false, 'Should have thrown 404');
    } catch (error: any) {
      if (error.statusCode === 404) {
        testResult('Checkout API Access', true, 'API accessible (404 expected for test link)');
      } else if (error.statusCode === 401) {
        testResult('Checkout API Access', false, 'Authentication failed - check token');
      } else {
        testResult('Checkout API Access', false, error.message);
      }
    }
    
  } catch (error: any) {
    console.error('\n❌ Critical Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
  
  // Final Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 Test Summary');
  console.log('═'.repeat(50));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Square integration is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
testSquareIntegration();
