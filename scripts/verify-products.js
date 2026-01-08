#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gratog';

async function verifyProducts() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db();
    const collection = db.collection('unified_products');

    // Count total products
    const totalCount = await collection.countDocuments();
    console.log(`Total products in database: ${totalCount}`);

    // Count sandbox products
    const sandboxCount = await collection.countDocuments({
      $or: [
        { source: 'sandbox_sync' },
        { _squareSyncEnv: 'sandbox' },
        { id: { $regex: /^sandbox-/i } },
        { squareId: { $regex: /^sandbox-/i } }
      ]
    });
    console.log(`Sandbox products: ${sandboxCount}`);

    // List all products
    const products = await collection
      .find({})
      .project({ _id: 0, id: 1, name: 1, source: 1, _squareSyncEnv: 1 })
      .sort({ name: 1 })
      .toArray();

    console.log(`\nAll products (${products.length}):\n`);
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name || product.id}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Source: ${product.source || 'N/A'}`);
      console.log(`   Sync Env: ${product._squareSyncEnv || 'N/A'}`);
    });

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

verifyProducts();
