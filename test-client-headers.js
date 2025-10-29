const { SquareClient, SquareEnvironment } = require('square');
require('dotenv').config({ path: '.env' });

const client = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Production
});

console.log('Client headers:', JSON.stringify(client._options.headers, null, 2));
