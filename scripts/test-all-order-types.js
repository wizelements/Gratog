#!/usr/bin/env node
/**
 * Test Script: Create orders of all fulfillment types in Square Sandbox
 * These orders will appear in your Square Dashboard
 * 
 * Usage: node scripts/test-all-order-types.js
 */

require('dotenv').config({ path: '.env.local' });

const SQUARE_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const SQUARE_ENV = process.env.SQUARE_ENVIRONMENT || 'sandbox';

const BASE_URL = SQUARE_ENV === 'production' 
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

// Sandbox test card nonce - simulates a successful card payment
const SANDBOX_CARD_NONCE = 'cnon:card-nonce-ok';

async function createSquareCustomer(customerData) {
  const response = await fetch(`${BASE_URL}/v2/customers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SQUARE_TOKEN}`,
      'Content-Type': 'application/json',
      'Square-Version': '2025-01-23'
    },
    body: JSON.stringify({
      idempotency_key: `test-customer-${Date.now()}`,
      given_name: customerData.firstName,
      family_name: customerData.lastName,
      email_address: customerData.email,
      phone_number: customerData.phone
    })
  });
  
  const data = await response.json();
  if (!response.ok) {
    console.error('Customer creation failed:', data);
    return null;
  }
  return data.customer;
}

async function createSquareOrder(orderData) {
  const response = await fetch(`${BASE_URL}/v2/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SQUARE_TOKEN}`,
      'Content-Type': 'application/json',
      'Square-Version': '2025-01-23'
    },
    body: JSON.stringify(orderData)
  });
  
  const data = await response.json();
  if (!response.ok) {
    console.error('Order creation failed:', data);
    return null;
  }
  return data.order;
}

async function processPayment(paymentData) {
  const response = await fetch(`${BASE_URL}/v2/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SQUARE_TOKEN}`,
      'Content-Type': 'application/json',
      'Square-Version': '2025-01-23'
    },
    body: JSON.stringify(paymentData)
  });
  
  const data = await response.json();
  if (!response.ok) {
    console.error('Payment failed:', data);
    return null;
  }
  return data.payment;
}

function getNextSaturday(time = '10:00') {
  const now = new Date();
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + (6 - now.getDay() + 7) % 7 || 7);
  const [hours, minutes] = time.split(':');
  saturday.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return saturday.toISOString();
}

async function createTestOrder(type, customer, customerId) {
  const orderNumber = `TEST-${type.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const amount = 2500 + Math.floor(Math.random() * 1000); // $25-$35
  
  let fulfillment;
  
  switch(type) {
    case 'pickup':
      fulfillment = {
        type: 'PICKUP',
        state: 'PROPOSED',
        pickup_details: {
          recipient: {
            display_name: `${customer.firstName} ${customer.lastName}`,
            phone_number: customer.phone
          },
          note: '📍 PICKUP: Serenbe Farmers Market • Saturdays 9AM-1PM',
          schedule_type: 'SCHEDULED',
          pickup_at: getNextSaturday('10:00')
        }
      };
      break;
      
    case 'delivery':
      fulfillment = {
        type: 'SHIPMENT',
        state: 'PROPOSED',
        shipment_details: {
          recipient: {
            display_name: `${customer.firstName} ${customer.lastName}`,
            phone_number: customer.phone,
            address: {
              address_line_1: '123 Test Delivery St',
              locality: 'Atlanta',
              administrative_district_level_1: 'GA',
              postal_code: '30301'
            }
          },
          shipping_note: '🚚 LOCAL DELIVERY - Leave at front door',
          expected_shipped_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
      break;
      
    case 'shipping':
      fulfillment = {
        type: 'SHIPMENT',
        state: 'PROPOSED',
        shipment_details: {
          recipient: {
            display_name: `${customer.firstName} ${customer.lastName}`,
            phone_number: customer.phone,
            address: {
              address_line_1: '456 Shipping Lane',
              locality: 'Los Angeles',
              administrative_district_level_1: 'CA',
              postal_code: '90001'
            }
          },
          shipping_note: '📦 USPS PRIORITY SHIPPING',
          expected_shipped_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
      break;
  }
  
  const orderPayload = {
    idempotency_key: `test-order-${type}-${Date.now()}`,
    order: {
      location_id: SQUARE_LOCATION_ID,
      reference_id: orderNumber,
      customer_id: customerId,
      line_items: [
        {
          name: 'Test Honey Cake (Medium)',
          quantity: '1',
          base_price_money: { amount: 1800, currency: 'USD' },
          note: `Test ${type} order item`
        },
        {
          name: 'Test Lemon Bars (6-pack)',
          quantity: '1',
          base_price_money: { amount: amount - 1800, currency: 'USD' },
          note: 'Additional test item'
        }
      ],
      fulfillments: [fulfillment],
      metadata: {
        source: 'test_script',
        test_type: type,
        order_number: orderNumber,
        customer_email: customer.email
      }
    }
  };
  
  console.log(`\n📦 Creating ${type.toUpperCase()} order: ${orderNumber}`);
  const order = await createSquareOrder(orderPayload);
  
  if (!order) {
    console.error(`❌ Failed to create ${type} order`);
    return null;
  }
  
  console.log(`✅ Order created: ${order.id}`);
  
  // Process payment
  console.log(`💳 Processing payment...`);
  const payment = await processPayment({
    idempotency_key: `test-payment-${type}-${Date.now()}`,
    source_id: SANDBOX_CARD_NONCE,
    amount_money: { amount, currency: 'USD' },
    location_id: SQUARE_LOCATION_ID,
    order_id: order.id,
    customer_id: customerId,
    note: `Payment for ${orderNumber}`,
    autocomplete: true
  });
  
  if (!payment) {
    console.error(`❌ Payment failed for ${type} order`);
    return { order, payment: null };
  }
  
  console.log(`✅ Payment completed: ${payment.id} (${payment.status})`);
  console.log(`   Receipt: ${payment.receipt_url || 'N/A'}`);
  
  return { order, payment, orderNumber };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   SQUARE SANDBOX ORDER TEST - All Fulfillment Types');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Environment: ${SQUARE_ENV}`);
  console.log(`Location ID: ${SQUARE_LOCATION_ID}`);
  console.log(`API Base: ${BASE_URL}`);
  
  if (!SQUARE_TOKEN || !SQUARE_LOCATION_ID) {
    console.error('\n❌ Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID');
    process.exit(1);
  }
  
  // Create test customer
  const testCustomer = {
    firstName: 'Test',
    lastName: 'Customer',
    email: `test.orders.${Date.now()}@example.com`,
    phone: '+14045551234'
  };
  
  console.log(`\n👤 Creating test customer: ${testCustomer.email}`);
  const customer = await createSquareCustomer(testCustomer);
  
  if (!customer) {
    console.error('❌ Failed to create customer, continuing without customer link');
  } else {
    console.log(`✅ Customer created: ${customer.id}`);
  }
  
  const results = [];
  
  // Create all 3 order types
  for (const type of ['pickup', 'delivery', 'shipping']) {
    const result = await createTestOrder(type, testCustomer, customer?.id);
    if (result) {
      results.push({ type, ...result });
    }
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  
  for (const r of results) {
    const status = r.payment ? '✅ PAID' : '⚠️ UNPAID';
    console.log(`${status} ${r.type.toUpperCase().padEnd(10)} | ${r.orderNumber} | Order: ${r.order.id.substring(0, 20)}...`);
  }
  
  console.log('\n📊 Check your Square Dashboard:');
  console.log(`   ${SQUARE_ENV === 'production' 
    ? 'https://squareup.com/dashboard/orders' 
    : 'https://squareupsandbox.com/dashboard/orders'}`);
  console.log('\nDone! ✨');
}

main().catch(console.error);
