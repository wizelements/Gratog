#!/bin/node

// Test MongoDB connection and fix product lookup issue
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI || 'mongodb+srv://Togratitude:$gratitud3$@gratitude0.1ckskrv.mongodb.net/taste_of_gratitude?retryWrites=true&w=majority&appName=Gratitude0';

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