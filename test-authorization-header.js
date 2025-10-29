const { SquareClient, SquareEnvironment } = require('square');
require('dotenv').config({ path: '.env' });

const client = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Production
});

console.log('Checking authorization header generation...');
console.log('Access token from env:', process.env.SQUARE_ACCESS_TOKEN?.substring(0, 20));

// Try to get auth header if accessible
try {
  const header = client.locations._getAuthorizationHeader();
  console.log('Authorization header:', header?.substring(0, 30));
} catch (e) {
  console.log('Cannot access _getAuthorizationHeader directly');
}

// Check if the client has the token stored
console.log('Client object keys:', Object.keys(client));
