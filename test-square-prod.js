const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning' || msg.text().includes('Square')) {
      console.log(`[${type.toUpperCase()}]`, msg.text());
    }
  });
  
  // Capture page errors
  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.message);
  });

  console.log('\n=== Testing Square SDK on tasteofgratitude.shop ===\n');
  
  // Test 1: Check config endpoint
  console.log('1. Fetching /api/square/config...');
  const configRes = await page.request.get('https://tasteofgratitude.shop/api/square/config');
  const config = await configRes.json();
  console.log('   Config:', JSON.stringify(config, null, 2));
  
  // Test 2: Load the order page
  console.log('\n2. Loading order page...');
  await page.goto('https://tasteofgratitude.shop/order', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('   Page loaded');
  
  // Test 3: Try to initialize Square SDK directly
  console.log('\n3. Testing Square SDK initialization...');
  const result = await page.evaluate(async (cfg) => {
    try {
      // Check if Square is loaded
      if (!window.Square) {
        // Load the SDK
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = cfg.sdkUrl;
          script.onload = () => setTimeout(resolve, 500);
          script.onerror = () => reject(new Error('Script load failed'));
          document.head.appendChild(script);
        });
      }
      
      if (!window.Square) {
        return { success: false, error: 'Square SDK not available after loading' };
      }
      
      // Try to initialize payments
      const payments = await window.Square.payments(cfg.applicationId, cfg.locationId);
      
      if (!payments) {
        return { success: false, error: 'payments() returned null' };
      }
      
      // Try to create card
      const card = await payments.card();
      
      return { 
        success: true, 
        hasPayments: !!payments,
        hasCard: !!card,
        message: 'Square SDK initialized successfully!'
      };
      
    } catch (err) {
      return { 
        success: false, 
        error: err.message || err.toString(),
        errorName: err.name,
        errorStack: err.stack
      };
    }
  }, config);
  
  console.log('   Result:', JSON.stringify(result, null, 2));
  
  // Test 4: Check for card container
  console.log('\n4. Checking for #card-container element...');
  const hasContainer = await page.evaluate(() => !!document.getElementById('card-container'));
  console.log('   #card-container exists:', hasContainer);
  
  // Test 5: Take a screenshot
  console.log('\n5. Taking screenshot...');
  await page.screenshot({ path: 'square-test-screenshot.png', fullPage: true });
  console.log('   Saved to square-test-screenshot.png');
  
  await browser.close();
  console.log('\n=== Test Complete ===\n');
})();
