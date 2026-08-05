const https = require('https');

const TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const START_DATE = '2026-07-05T00:00:00Z';

async function fetchOrders() {
  const options = {
    hostname: 'connect.squareup.com',
    path: `/v2/orders?begin_date=${START_DATE}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Square-Version': '2025-01-22'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse JSON response'));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log('Fetching global order dump...');
    const response = await fetchOrders();
    const orders = response.orders || [];
    
    if (orders.length === 0) {
      console.log('No orders found in the last 30 days.');
      return;
    }

    console.log(`Found ${orders.length} total orders. Analyzing for Saturday, Aug 1st...`);
    
    const saturdayOrders = orders.filter(o => o.created_at.startsWith('2026-08-01'));
    
    if (saturdayOrders.length === 0) {
      console.log('Still no orders found specifically for 2026-08-01.');
      console.log('\nSample of most recent order date:');
      console.log(orders[0].created_at);
      return;
    }

    let totalRevenue = 0;
    const productSales = {};

    saturdayOrders.forEach(order => {
      const amount = order.total_money?.amount || 0;
      totalRevenue += amount;

      (order.line_items || []).forEach(item => {
        const name = item.name || 'Unknown Product';
        const qty = item.quantity || 1;
        productSales[name] = (productSales[name] || 0) + qty;
      });
    });

    console.log(`\n--- SUCCESS: Saturday Sales Found (Aug 1) ---`);
    console.log(`Total Orders: ${saturdayOrders.length}`);
    console.log(`Total Revenue: $${(totalRevenue / 100).toFixed(2)}`);
    console.log(`\nBest Sellers:`);
    Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .forEach(([name, qty]) => console.log(`${name}: ${qty} units`));

  } catch (e) {
    console.error('Global dump failed:', e);
  }
}

main();
