#!/usr/bin/env node

/**
 * Remove sandbox products from MongoDB unified_products collection
 * 
 * Sandbox detection criteria (from lib/sandbox-detection.js):
 * - source === 'sandbox_sync'
 * - _squareSyncEnv === 'sandbox'
 * - id matches /^sandbox-/i
 * - squareId matches /^sandbox-/i
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gratog';
const UNIFIED_PRODUCTS_COLLECTION = 'unified_products';

async function removeSandboxProducts() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db();
    const collection = db.collection(UNIFIED_PRODUCTS_COLLECTION);

    // Build the sandbox product filter (same logic as isSandboxProduct)
    const sandboxFilter = {
      $or: [
        { source: 'sandbox_sync' },
        { _squareSyncEnv: 'sandbox' },
        { id: { $regex: /^sandbox-/i } },
        { squareId: { $regex: /^sandbox-/i } }
      ]
    };

    // First, find all sandbox products to display them
    const sandboxProducts = await collection
      .find(sandboxFilter)
      .project({ _id: 1, id: 1, name: 1, source: 1, _squareSyncEnv: 1, squareId: 1 })
      .toArray();

    if (sandboxProducts.length === 0) {
      console.log('✓ No sandbox products found in database');
      return;
    }

    console.log(`\nFound ${sandboxProducts.length} sandbox product(s) to remove:\n`);
    sandboxProducts.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name || product.id}`);
      console.log(`     ID: ${product.id}`);
      console.log(`     Source: ${product.source}`);
      console.log(`     Sync Env: ${product._squareSyncEnv}`);
      console.log(`     Square ID: ${product.squareId}`);
    });

    // Remove them
    const result = await collection.deleteMany(sandboxFilter);

    console.log(`\n✓ Deleted ${result.deletedCount} sandbox product(s)\n`);

    // Verify removal
    const remaining = await collection.countDocuments(sandboxFilter);
    if (remaining === 0) {
      console.log('✓ Verification: All sandbox products removed successfully');
    } else {
      console.warn(`⚠ Warning: ${remaining} sandbox products still remain`);
    }

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

removeSandboxProducts();
