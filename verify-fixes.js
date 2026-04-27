// Verify both fixes are working
const https = require('https');

const BASE_URL = 'tasteofgratitude.shop';

function request(method, path, headers = {}, body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: path,
      method: method,
      timeout: 10000,
      headers: headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🔍 Verifying GitHub Issues Fixes');
  console.log('=' .repeat(50));
  console.log('');

  // Test 1: Issue #3 - Passport endpoints should require auth
  console.log('Test 1: GET /api/rewards/passport (no auth)');
  const test1 = await request('GET', '/api/rewards/passport');
  console.log(`  Status: ${test1.status}`);
  if (test1.status === 401) {
    console.log('  ✅ PASS: Authentication required');
  } else if (test1.status === 200) {
    console.log('  ❌ FAIL: Should require authentication (Issue #3)');
  } else {
    console.log(`  ⚠️  Status: ${test1.status}`);
  }
  console.log('');

  // Test 2: Issue #3 - Stamp endpoint should require auth  
  console.log('Test 2: POST /api/rewards/stamp (no auth)');
  const test2 = await request('POST', '/api/rewards/stamp', 
    { 'Content-Type': 'application/json' },
    { email: 'test@test.com', marketName: 'Test' }
  );
  console.log(`  Status: ${test2.status}`);
  if (test2.status === 401) {
    console.log('  ✅ PASS: Authentication required');
  } else if (test2.status === 200) {
    console.log('  ❌ FAIL: Should require authentication (Issue #3)');
  } else {
    console.log(`  ⚠️  Status: ${test2.status}`);
  }
  console.log('');

  // Test 3: Issue #4 - Redeem endpoint (should check expiration)
  console.log('Test 3: POST /api/rewards/redeem (no auth)');
  const test3 = await request('POST', '/api/rewards/redeem',
    { 'Content-Type': 'application/json' },
    { voucherId: 'test', orderId: 'test' }
  );
  console.log(`  Status: ${test3.status}`);
  if (test3.status === 401) {
    console.log('  ✅ PASS: Authentication required');
  } else if (test3.status === 200) {
    console.log('  ❌ FAIL: Should require authentication');
  } else {
    console.log(`  ⚠️  Status: ${test3.status}`);
  }
  console.log('');

  // Test 4: Leaderboard should work publicly (anonymized)
  console.log('Test 4: GET /api/rewards/leaderboard (public)');
  const test4 = await request('GET', '/api/rewards/leaderboard');
  console.log(`  Status: ${test4.status}`);
  if (test4.status === 200 && test4.data?.leaderboard) {
    const hasAnonymized = test4.data.leaderboard.every(p => 
      p.nameDisplay?.includes('***') || p.nameDisplay === 'Anonymous'
    );
    if (hasAnonymized) {
      console.log('  ✅ PASS: Data is anonymized');
    } else {
      console.log('  ⚠️  WARNING: May expose real names');
    }
  } else {
    console.log('  ⚠️  Response:', JSON.stringify(test4.data).substring(0, 100));
  }
  console.log('');

  // Test 5: Checkout health (previous fix)
  console.log('Test 5: GET /api/checkout (health check)');
  const test5 = await request('GET', '/api/checkout');
  console.log(`  Status: ${test5.status}`);
  if (test5.status === 200 && test5.data?.configured) {
    console.log('  ✅ PASS: Checkout service is configured');
  } else {
    console.log('  ⚠️  Response:', JSON.stringify(test5.data).substring(0, 100));
  }
  console.log('');

  console.log('=' .repeat(50));
  console.log('Verification complete.');
  console.log('');
  console.log('Summary:');
  console.log('- Issue #3 (Authentication): Verify all endpoints return 401');
  console.log('- Issue #4 (Voucher expiration): Requires authenticated test');
  console.log('- Previous fix (BigInt): Checkout service is active');
}

runTests();
