#!/usr/bin/env node
/**
 * Insert Square Sandbox products into unified_products for UI testing
 */

const { MongoClient } = require('mongodb');

const SANDBOX_PRODUCTS = [];

async function insertProducts() {
  const uri = 'mongodb+srv://Togratitude:%24gratitud3%24@gratitude0.1ckskrv.mongodb.net/gratitude?retryWrites=true&w=majority';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('taste_of_gratitude');
    
    // Upsert sandbox products
    for (const product of SANDBOX_PRODUCTS) {
      await db.collection('unified_products').updateOne(
        { id: product.id },
        { $set: product },
        { upsert: true }
      );
      console.log('  ✅ Upserted:', product.name);
    }
    
    const count = await db.collection('unified_products').countDocuments();
    console.log(`\n📦 Total products now: ${count}`);
    
  } finally {
    await client.close();
  }
}

insertProducts().catch(console.error);
