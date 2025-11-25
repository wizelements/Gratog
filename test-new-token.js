#!/usr/bin/env node

/**
 * Quick test to verify new Square access token
 */

require('dotenv').config();

async function testSquareToken() {
  console.log('\n🔐 Testing New Square Access Token...\n');
  
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const environment = process.env.SQUARE_ENVIRONMENT;
  const locationId = process.env.SQUARE_LOCATION_ID;
  
  // Check token format
  console.log('Token prefix:', token?.substring(0, 10) + '...');
  console.log('Token length:', token?.length);
  console.log('Environment:', environment);
  console.log('Location ID:', locationId);
  console.log('');
  
  if (!token) {
    console.error('❌ SQUARE_ACCESS_TOKEN not found in environment');
    process.exit(1);
  }
  
  if (!token.startsWith('EAAA')) {
    console.warn('⚠️  Token does not start with EAAA (expected for production tokens)');
  }
  
  // Test Square API connection
  const baseUrl = environment === 'production' 
    ? 'https://connect.squareup.com' 
    : 'https://connect.squareupsandbox.com';
  
  try {
    console.log('🔍 Testing Square API connection...');
    console.log(`Endpoint: ${baseUrl}/v2/locations\n`);
    
    const response = await fetch(`${baseUrl}/v2/locations`, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-10-17',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Square API Error:');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }
    
    console.log('✅ Square API Connection Successful!\n');
    console.log('📍 Locations Found:', data.locations?.length || 0);
    
    if (data.locations && data.locations.length > 0) {
      console.log('\nLocation Details:');
      data.locations.forEach((loc, idx) => {
        console.log(`  ${idx + 1}. ${loc.name}`);
        console.log(`     ID: ${loc.id}`);
        console.log(`     Status: ${loc.status}`);
        console.log(`     Currency: ${loc.currency}`);
        console.log(`     Country: ${loc.country}`);
        console.log('');
      });
      
      // Verify our configured location exists
      const configuredLocation = data.locations.find(loc => loc.id === locationId);
      if (configuredLocation) {
        console.log('✅ Configured location ID matches:', locationId);
      } else {
        console.warn('⚠️  Configured location ID not found in returned locations');
        console.warn('   Configured:', locationId);
        console.warn('   Available:', data.locations.map(l => l.id).join(', '));
      }
    }
    
    console.log('\n✅ All checks passed! Token is valid and working.\n');
    
  } catch (error) {
    console.error('❌ Connection Error:');
    console.error(error.message);
    process.exit(1);
  }
}

testSquareToken().catch(console.error);
