// Checkout flow test - tests the actual payment endpoint
const https = require('https');

const BASE_URL = 'tasteofgratitude.shop';

function postRequest(path, data) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: path,
      method: 'POST',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    
    req.write(postData);
    req.end();
  });
}

async function testCheckout() {
  console.log('🛒 Testing Checkout Flow');
  console.log('=' .repeat(50));
  console.log('');

  // Test 1: Empty cart (should fail validation)
  console.log('Test 1: Empty cart...');
  const test1 = await postRequest('/api/checkout', {});
  console.log(`  Status: ${test1.status}`);
  if (test1.error) console.log(`  Error: ${test1.error}`);
  if (test1.data?.error) console.log(`  Response: ${test1.data.error}`);
  console.log('');

  // Test 2: Valid cart structure (should succeed or return Square error)
  console.log('Test 2: Valid cart with line items...');
  const test2 = await postRequest('/api/checkout', {
    lineItems: [{ quantity: 1, name: 'Test Item', basePriceMoney: { amount: 1000, currency: 'USD' } }],
    customer: { email: 'test@example.com' },
  });
  console.log(`  Status: ${test2.status}`);
  if (test2.data?.error) console.log(`  Error: ${test2.data.error}`);
  if (test2.data?.paymentLink?.url) console.log(`  ✅ Payment link created: ${test2.data.paymentLink.url.substring(0, 60)}...`);
  if (test2.data?.redirectUrl) console.log(`  ✅ Redirect URL: ${test2.data.redirectUrl.substring(0, 60)}...`);
  if (test2.data?.traceId) console.log(`  Trace ID: ${test2.data.traceId}`);
  console.log('');

  // Test 3: Test order creation endpoint
  console.log('Test 3: Orders API...');
  const test3 = await postRequest('/api/orders/create', {
    items: [{ name: 'Test', quantity: 1, price: 1000 }],
    customer: { email: 'test@example.com', firstName: 'Test', lastName: 'User' },
  });
  console.log(`  Status: ${test3.status}`);
  if (test3.data?.error) console.log(`  Error: ${test3.data.error}`);
  if (test3.data?.orderId) console.log(`  ✅ Order created: ${test3.data.orderId}`);
  console.log('');

  console.log('=' .repeat(50));
  console.log('Checkout tests complete.');
}

testCheckout();
