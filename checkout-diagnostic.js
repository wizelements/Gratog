// Detailed checkout diagnostic - captures the actual error
const https = require('https');

const BASE_URL = 'tasteofgratitude.shop';

function request(method, path, data = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: path,
      method: method,
      timeout: 15000,
      headers: data ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data)),
      } : {},
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: body });
        }
      });
    });

    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runDiagnostics() {
  console.log('🔧 Gratog Checkout Diagnostics');
  console.log('=' .repeat(60));
  console.log('');

  // 1. Webhook endpoint (should exist)
  console.log('1. Webhook endpoint (POST /api/webhooks/square)');
  const wh = await request('POST', '/api/webhooks/square', { type: 'test' });
  console.log(`   Status: ${wh.status}`);
  console.log(`   Expected: 401 (invalid signature)`);
  console.log(`   Result: ${wh.status === 401 ? '✅ Endpoint exists' : wh.status === 404 ? '❌ NOT DEPLOYED' : '⚠️ Check needed'}`);
  if (wh.body?.error) console.log(`   Response: ${wh.body.error}`);
  console.log('');

  // 2. Orders by-ref
  console.log('2. Orders lookup (GET /api/orders/by-ref)');
  const orders = await request('GET', '/api/orders/by-ref?orderRef=test123');
  console.log(`   Status: ${orders.status}`);
  console.log(`   Expected: 404 (order not found)`);
  console.log(`   Result: ${orders.status === 404 ? '✅ Working' : orders.status === 200 ? '⚠️ Found test order?' : '⚠️ Check needed'}`);
  console.log('');

  // 3. Checkout POST with full error details
  console.log('3. Checkout endpoint (POST /api/checkout)');
  console.log('   Payload: { lineItems: [{quantity:1, name:"Test", basePriceMoney:{amount:1000, currency:"USD"}}] }');
  const checkout = await request('POST', '/api/checkout', {
    lineItems: [{ 
      quantity: 1, 
      name: 'Test Item', 
      basePriceMoney: { amount: 1000, currency: 'USD' } 
    }],
    customer: { email: 'test@example.com' },
  });
  console.log(`   Status: ${checkout.status}`);
  if (checkout.body?.error) {
    console.log(`   Error: ${checkout.body.error}`);
  }
  if (checkout.body?.details) {
    console.log(`   Details: ${checkout.body.details}`);
  }
  if (checkout.body?.traceId) {
    console.log(`   Trace ID: ${checkout.body.traceId}`);
  }
  if (checkout.body?.paymentLink?.url) {
    console.log(`   ✅ Payment Link: ${checkout.body.paymentLink.url.substring(0, 70)}...`);
  }
  if (checkout.body?.redirectUrl) {
    console.log(`   ✅ Redirect URL: ${checkout.body.redirectUrl.substring(0, 70)}...`);
  }
  console.log('');

  // 4. Payments endpoint
  console.log('4. Payments API (POST /api/payments)');
  const payments = await request('POST', '/api/payments', {
    orderId: 'test-order-123',
    amount: 1000,
  });
  console.log(`   Status: ${payments.status}`);
  if (payments.body?.error) console.log(`   Error: ${payments.body.error}`);
  if (payments.body?.traceId) console.log(`   Trace ID: ${payments.body.traceId}`);
  console.log('');

  // 5. Health check
  console.log('5. Health endpoint');
  const health = await request('GET', '/api/health');
  console.log(`   Status: ${health.status}`);
  if (health.body?.status) console.log(`   Service: ${health.body.status}`);
  console.log('');

  console.log('=' .repeat(60));
  console.log('Diagnostics complete.');
  console.log('');
  console.log('If checkout returns 500:');
  console.log('  - Check Vercel logs: vercel logs --project=gratog');
  console.log('  - Check Square API credentials');
  console.log('  - Verify SQUARE_ACCESS_TOKEN is not expired');
}

runDiagnostics();
