// Test Square API connectivity

const config = {
  applicationId: "sq0idp-V1fV-MwsU5lET4rvzHKnIw",
  locationId: "L66TVG6867BG9"
};

console.log('\n=== Square SDK Debug ===\n');

// Check health
console.log('1. Testing production API...');
try {
  const response = await fetch('https://tasteofgratitude.shop/api/health/payments?deep=true');
  const health = await response.json();
  console.log('   ✅ Health:', health.ok ? 'OK' : 'FAILED');
  console.log('   Location:', health.squareConnectivity?.locationName);
  console.log('   Status:', health.squareConnectivity?.status);
} catch (e) {
  console.log('   ❌ Error:', e.message);
}

// Check config
console.log('\n2. Testing config endpoint...');
try {
  const response = await fetch('https://tasteofgratitude.shop/api/square/config');
  const cfg = await response.json();
  console.log('   ✅ Config received');
  console.log('   AppID:', cfg.applicationId?.slice(0, 15) + '...');
  console.log('   LocationID:', cfg.locationId);
  console.log('   Environment:', cfg.environment);
  console.log('   SDK URL:', cfg.sdkUrl);
} catch (e) {
  console.log('   ❌ Error:', e.message);
}

// Check diagnostic
console.log('\n3. Testing diagnostic page...');
try {
  const response = await fetch('https://tasteofgratitude.shop/diagnostic');
  console.log('   Status:', response.status);
} catch (e) {
  console.log('   ❌ Error:', e.message);
}

console.log('\n=== Browser Test Required ===');
console.log('\nSquare Web SDK can only be tested in a real browser.');
console.log('Open browser console at: https://tasteofgratitude.shop/diagnostic');
console.log('Or at checkout: https://tasteofgratitude.shop/order');
console.log('\nLook for red error messages starting with [Square]');

