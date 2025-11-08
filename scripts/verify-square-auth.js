#!/usr/bin/env node
const https = require('https');
const LOG_PREFIX = '[SQUARE-VERIFY]';

async function main() {
  console.log('\n🚀 GRATOG SQUARE AUTH RESOLVER\n');
  
  const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
  const env = (process.env.SQUARE_ENVIRONMENT || 'sandbox').trim().toLowerCase();
  
  if (!token) {
    console.error(`${LOG_PREFIX} ❌ SQUARE_ACCESS_TOKEN not set`);
    process.exit(1);
  }
  
  const baseUrl = env === 'production' ? 'connect.squareup.com' : 'connect.squareupsandbox.com';
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: baseUrl,
      path: '/v2/locations',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Square-Version': '2025-01-22'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`${LOG_PREFIX} ✅ Square auth verified`);
          resolve(0);
        } else {
          console.error(`${LOG_PREFIX} ❌ Auth failed: ${res.statusCode}`);
          console.error(data);
          reject(1);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

main().then(process.exit).catch(() => process.exit(1));
