// Simple HTTP smoke test - no dependencies required
const https = require('https');

const TESTS = [
  { name: 'Homepage', path: '/', expectStatus: 200 },
  { name: 'Products API', path: '/api/products', expectStatus: 200 },
  { name: 'Health Check', path: '/api/health', expectStatus: 200 },
];

const BASE_URL = 'tasteofgratitude.shop';

function testEndpoint(name, path, expectStatus) {
  return new Promise((resolve) => {
    const start = Date.now();
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: path,
      method: 'GET',
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      const duration = Date.now() - start;
      const success = res.statusCode === expectStatus;
      
      console.log(`${success ? '✅' : '❌'} ${name}`);
      console.log(`   URL: https://${BASE_URL}${path}`);
      console.log(`   Status: ${res.statusCode} (expected ${expectStatus})`);
      console.log(`   Duration: ${duration}ms`);
      
      if (!success) {
        console.log(`   ⚠️  Status mismatch!`);
      }
      console.log('');
      
      resolve({ name, success, status: res.statusCode, duration });
    });

    req.on('error', (err) => {
      console.log(`❌ ${name} - ERROR: ${err.message}`);
      resolve({ name, success: false, error: err.message });
    });

    req.on('timeout', () => {
      console.log(`❌ ${name} - TIMEOUT`);
      req.destroy();
      resolve({ name, success: false, error: 'timeout' });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🔥 Gratog Smoke Test');
  console.log(`Testing: https://${BASE_URL}`);
  console.log('=' .repeat(50));
  console.log('');

  const results = [];
  for (const test of TESTS) {
    const result = await testEndpoint(test.name, test.path, test.expectStatus);
    results.push(result);
    // Small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('=' .repeat(50));
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error || `HTTP ${r.status}`}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All smoke tests passed!');
    process.exit(0);
  }
}

runTests();
