// Cleanup sandbox products directly via MongoDB
import { MongoClient } from 'mongodb';
import 'dotenv/config';

async function cleanupSandbox() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
  const dbName = process.env.DATABASE_NAME || process.env.DB_NAME || 'taste_of_gratitude';
  
  if (!uri) {
    console.error('No MongoDB URI found in environment');
    process.exit(1);
  }
  
  console.log('Connecting to MongoDB...');
  console.log('Database:', dbName);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Step 1: Count sandbox products
    const sandboxQuery = {
      $or: [
        { source: 'sandbox_sync' },
        { id: { $regex: /^sandbox-/i } },
        { squareId: { $regex: /^sandbox-/i } }
      ]
    };
    
    const sandboxProducts = await db.collection('unified_products')
      .find(sandboxQuery)
      .project({ id: 1, name: 1, source: 1 })
      .toArray();
    
    console.log(`\nFound ${sandboxProducts.length} sandbox products:`);
    sandboxProducts.forEach(p => console.log(`  - ${p.name} (${p.source})`));
    
    if (sandboxProducts.length === 0) {
      console.log('\n✅ No sandbox products to clean up!');
      return;
    }
    
    // Step 2: Delete sandbox products
    const deleteResult = await db.collection('unified_products').deleteMany(sandboxQuery);
    console.log(`\n🗑️  Deleted ${deleteResult.deletedCount} sandbox products from unified_products`);
    
    // Step 3: Get remaining counts
    const remaining = await db.collection('unified_products').countDocuments();
    console.log(`\n📦 Remaining products: ${remaining}`);
    
    console.log('\n✅ Cleanup complete!');
    
  } finally {
    await client.close();
  }
}

cleanupSandbox().catch(console.error);
