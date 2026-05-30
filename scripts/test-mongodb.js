#!/bin/node

// Test MongoDB connection and fix product lookup issue
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

async function testConnection() {
  console.log('Testing MongoDB connection...');
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Successfully connected to MongoDB');
    
    const db = client.db('taste_of_gratitude');
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Test if we can find products
    const unifiedProducts = db.collection('unified_products');
    const count = await unifiedProducts.countDocuments();
    console.log(`Found ${count} products in unified_products collection`);
    
    // Close connection
    await client.close();
    console.log('Database test completed successfully');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection().catch(console.error);