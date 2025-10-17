require('dotenv').config();
const { SquareClient, Environment } = require('square');

async function testSquareApi() {
  try {
    console.log('Initializing Square client...');
    
    const square = new SquareClient({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox,
    });
    
    console.log('Square client created');
    console.log('Square object keys:', Object.keys(square));
    
    // Check if catalogApi exists
    if (square.catalogApi) {
      console.log('✅ catalogApi exists');
      console.log('catalogApi methods:', Object.getOwnPropertyNames(square.catalogApi));
      
      // Try listing catalog
      console.log('Attempting to list catalog...');
      const response = await square.catalogApi.listCatalog();
      console.log('✅ listCatalog successful');
      console.log('Objects found:', response.result?.objects?.length || 0);
      
    } else {
      console.log('❌ catalogApi not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.errors) {
      error.errors.forEach(err => console.error('  -', err.detail || err.code));
    }
  }
}

testSquareApi();