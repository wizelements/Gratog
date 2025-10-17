require('dotenv').config();
const { SquareClient, SquareEnvironment } = require('square');

console.log('Square Configuration:');
console.log('Access Token:', process.env.SQUARE_ACCESS_TOKEN ? 'Set (' + process.env.SQUARE_ACCESS_TOKEN.substring(0, 10) + '...)' : 'Not set');
console.log('Location ID:', process.env.SQUARE_LOCATION_ID);
console.log('Environment:', process.env.SQUARE_ENVIRONMENT);

if (!process.env.SQUARE_ACCESS_TOKEN) {
  console.error('SQUARE_ACCESS_TOKEN not set!');
  process.exit(1);
}

try {
  const square = new SquareClient({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });
  
  console.log('Square client created successfully');
  console.log('Available APIs:', Object.keys(square));
  
} catch (error) {
  console.error('Failed to create Square client:', error.message);
}