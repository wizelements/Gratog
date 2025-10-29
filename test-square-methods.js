const { SquareClient, SquareEnvironment } = require('square');
require('dotenv').config({ path: '.env' });

const client = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Production
});

console.log('Available locations methods:');
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client.locations)));
