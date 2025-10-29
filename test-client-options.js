const { SquareClient, SquareEnvironment } = require('square');
require('dotenv').config({ path: '.env' });

const client = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Production
});

console.log('Client _options keys:', Object.keys(client._options));
console.log('Client environment:', client._options.environment);
console.log('Has accessToken:', !!client._options.accessToken);
console.log('Token prefix from options:', client._options.accessToken?.substring(0, 20));
