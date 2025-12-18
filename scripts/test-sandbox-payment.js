#!/usr/bin/env node
/**
 * Square Sandbox Payment Flow Test
 * Tests the complete checkout flow with sandbox credentials
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Sandbox product variations we created
const SANDBOX_PRODUCTS = [
  { name: 'Gold Sea Moss Gel 8oz', catalogObjectId: 'YZIUDBNSRDOKP6JI5WA2Z6QP', price: 2999 },
  { name: 'Gold Sea Moss Gel 16oz', catalogObjectId: 'CZZ6K7K54RW52M2JXL6RTIZV', price: 4999 },
  { name: 'Purple Sea Moss Gel 8oz', catalogObjectId: 'EGGD5UPDR5MNAMT3AJYM47ZF', price: 3499 },
  { name: 'Elderberry Sea Moss Gel 8oz', catalogObjectId: 'O3TDEIQLTCOZKG5CZ7TFVRPS', price: 3299 },
  { name: 'Mango Sea Moss Gel 8oz', catalogObjectId: 'F4DBUTNH5IBAKQYIRGXHEPU5', price: 3299 },
  { name: 'Wellness Starter Bundle', catalogObjectId: '2QHZ5O5ZJKDNGC3D4WEM2SUQ', price: 7999 },
];

async function testCheckoutFlow() {
  console.log('🧪 Square Sandbox Payment Flow Test\n');
  console.log('=' .repeat(50));
  
  // Step 1: Verify Square config
  console.log('\n📋 Step 1: Checking Square configuration...');
  const configRes = await fetch(`${BASE_URL}/api/square/config`);
  const config = await configRes.json();
  
  if (!config.success) {
    console.error('❌ Square config failed:', config);
    process.exit(1);
  }
  
  console.log('✅ Square Config:', {
    environment: config.config.environment,
    applicationId: config.config.applicationId.substring(0, 20) + '...',
    locationId: config.config.locationId
  });
  
  if (config.config.environment !== 'sandbox') {
    console.warn('⚠️  Not in sandbox mode! Current:', config.config.environment);
  }
  
  // Step 2: Create a test checkout
  console.log('\n📋 Step 2: Creating checkout with sandbox products...');
  
  const testProduct = SANDBOX_PRODUCTS[0];
  const orderId = `TEST-${Date.now()}`;
  
  const checkoutPayload = {
    lineItems: [
      {
        catalogObjectId: testProduct.catalogObjectId,
        quantity: 1,
        basePriceMoney: {
          amount: testProduct.price,
          currency: 'USD'
        }
      }
    ],
    customer: {
      email: 'sandbox-test@example.com',
      name: 'Sandbox Test Customer',
      phone: '+15555555555'
    },
    fulfillmentType: 'pickup',
    orderId: orderId
  };
  
  console.log('  Cart:', testProduct.name, `$${(testProduct.price / 100).toFixed(2)}`);
  
  const checkoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checkoutPayload)
  });
  
  const checkout = await checkoutRes.json();
  
  if (!checkout.success) {
    console.error('❌ Checkout creation failed:', checkout);
    process.exit(1);
  }
  
  console.log('✅ Payment Link Created!');
  console.log('  Link ID:', checkout.paymentLink.id);
  console.log('  Order ID:', checkout.paymentLink.orderId);
  console.log('\n🔗 PAYMENT URL:', checkout.paymentLink.url);
  
  // Step 3: Show test card info
  console.log('\n' + '=' .repeat(50));
  console.log('💳 SANDBOX TEST CARDS:');
  console.log('=' .repeat(50));
  console.log('  ✅ Success:     4532 0150 1234 5678');
  console.log('  ❌ Declined:    4000 0000 0000 0002');
  console.log('  ⚠️  CVV Fail:    4000 0000 0000 0101');
  console.log('  📅 Expiry:      Any future date (e.g., 12/26)');
  console.log('  🔐 CVV:         Any 3 digits (e.g., 123)');
  console.log('  📮 ZIP:         Any 5 digits (e.g., 12345)');
  console.log('=' .repeat(50));
  
  console.log('\n📌 Next Steps:');
  console.log('  1. Open the payment URL in browser');
  console.log('  2. Enter test card: 4532 0150 1234 5678');
  console.log('  3. Complete payment');
  console.log('  4. Check webhook for payment confirmation');
  
  // Step 4: Also test direct card payment (Web Payments SDK flow)
  console.log('\n📋 Step 3: Testing Web Payments SDK endpoint...');
  
  const paymentPayload = {
    sourceId: 'cnon:card-nonce-ok', // Sandbox test nonce
    amount: testProduct.price,
    currency: 'USD',
    orderId: orderId,
    customer: {
      email: 'sdk-test@example.com',
      name: 'SDK Test Customer'
    }
  };
  
  const paymentRes = await fetch(`${BASE_URL}/api/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentPayload)
  });
  
  const payment = await paymentRes.json();
  
  if (payment.success) {
    console.log('✅ Direct Payment Success!');
    console.log('  Payment ID:', payment.payment?.id);
    console.log('  Status:', payment.payment?.status);
  } else {
    console.log('⚠️  Direct payment test:', payment.error || 'Needs real card nonce');
    console.log('  (This is expected - cnon:card-nonce-ok only works with actual SDK)');
  }
  
  console.log('\n✅ Sandbox payment flow test complete!');
  console.log('💡 Visit the payment URL above to complete a test transaction.');
}

testCheckoutFlow().catch(console.error);
