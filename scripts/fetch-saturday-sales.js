const https = require('https');

const TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const START_DATE = '2026-08-01T00:00:00Z';
const END_DATE = '2026-08-02T00:00:00Z';

async function fetchOrders() {
  const options = {
    hostname: 'connect.squareup.com',
    path: `/v2/orders?location_ids=L66TVG6867BG9&begin_date=${START_DATE}&end_date=${END_DATE}`,
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
    const response = await fetchOrders();
    const orders = response.orders || [];
    
    if (orders.length === 0) {
      console.log('No orders found for Saturday, Aug 1st.');
      return;
    }

    let totalRevenue = 0;
    const productSales = {};

    orders.forEach(order => {
      const amount = order.total_money?.amount || 0;
      totalRevenue += amount;

      (order.line_items || []).forEach(item => {
        const name = item.name || 'Unknown Product';
        const qty = item.quantity || 1;
        productSales[name] = (productSales[name] || 0) + qty;
      });
    });

    console.log(`--- Saturday Sales Report (Aug 1) ---`);
    console.log(`Total Orders: ${orders.length}`);
    console.log(`Total Revenue: $${(totalRevenue / 100).toFixed(2)}`);
    console.log(`\nBest Sellers (by quantity):`);
    
    Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .forEach(([name, qty]) => {
        console.log(`${name}: ${qty} units`);
      });

  } catch (e) {
    console.error('Error fetching sales:', e);
  }
}

main();
