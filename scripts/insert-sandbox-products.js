#!/usr/bin/env node
/**
 * Insert Square Sandbox products into unified_products for UI testing
 */

const { MongoClient } = require('mongodb');

const SANDBOX_PRODUCTS = [
  {
    id: 'sandbox-gold-8oz',
    squareId: 'YZIUDBNSRDOKP6JI5WA2Z6QP',
    name: 'Gold Sea Moss Gel',
    slug: 'gold-sea-moss-gel',
    description: 'Premium wildcrafted gold sea moss gel packed with 92 essential minerals',
    price: 29.99,
    priceCents: 2999,
    category: 'Sea Moss Gels',
    intelligentCategory: 'Immune Boosters',
    image: '/images/products/gold-sea-moss.jpg',
    variations: [
      { id: 'YZIUDBNSRDOKP6JI5WA2Z6QP', name: '8 oz', price: 29.99, priceCents: 2999 },
      { id: 'CZZ6K7K54RW52M2JXL6RTIZV', name: '16 oz', price: 49.99, priceCents: 4999 }
    ],
    ingredients: [{ name: 'Gold Sea Moss', icon: '🌊' }],
    tags: ['bestseller', 'immune-support'],
    inStock: true,
    source: 'sandbox_sync',
    syncedAt: new Date()
  },
  {
    id: 'sandbox-purple-8oz',
    squareId: 'EGGD5UPDR5MNAMT3AJYM47ZF',
    name: 'Purple Sea Moss Gel',
    slug: 'purple-sea-moss-gel',
    description: 'Rare purple sea moss with extra antioxidants and anthocyanins',
    price: 34.99,
    priceCents: 3499,
    category: 'Sea Moss Gels',
    intelligentCategory: 'Antioxidant Rich',
    image: '/images/products/purple-sea-moss.jpg',
    variations: [
      { id: 'EGGD5UPDR5MNAMT3AJYM47ZF', name: '8 oz', price: 34.99, priceCents: 3499 },
      { id: 'KXQSBJYLWQ7WPK7VB5P7ACZ7', name: '16 oz', price: 59.99, priceCents: 5999 }
    ],
    ingredients: [{ name: 'Purple Sea Moss', icon: '🍇' }],
    tags: ['rare', 'antioxidant'],
    inStock: true,
    source: 'sandbox_sync',
    syncedAt: new Date()
  },
  {
    id: 'sandbox-elderberry',
    squareId: 'O3TDEIQLTCOZKG5CZ7TFVRPS',
    name: 'Elderberry Sea Moss Gel',
    slug: 'elderberry-sea-moss-gel',
    description: 'Immune-boosting blend of elderberry and sea moss',
    price: 32.99,
    priceCents: 3299,
    category: 'Sea Moss Gels',
    intelligentCategory: 'Immune Boosters',
    image: '/images/products/elderberry-moss.jpg',
    variations: [
      { id: 'O3TDEIQLTCOZKG5CZ7TFVRPS', name: '8 oz', price: 32.99, priceCents: 3299 }
    ],
    ingredients: [{ name: 'Elderberry', icon: '🫐' }, { name: 'Sea Moss', icon: '🌊' }],
    tags: ['immune-support', 'elderberry'],
    inStock: true,
    source: 'sandbox_sync',
    syncedAt: new Date()
  },
  {
    id: 'sandbox-mango',
    squareId: 'F4DBUTNH5IBAKQYIRGXHEPU5',
    name: 'Mango Sea Moss Gel',
    slug: 'mango-sea-moss-gel',
    description: 'Tropical mango-infused sea moss for a delicious wellness boost',
    price: 32.99,
    priceCents: 3299,
    category: 'Sea Moss Gels',
    intelligentCategory: 'Energy & Vitality',
    image: '/images/products/mango-moss.jpg',
    variations: [
      { id: 'F4DBUTNH5IBAKQYIRGXHEPU5', name: '8 oz', price: 32.99, priceCents: 3299 }
    ],
    ingredients: [{ name: 'Mango', icon: '🥭' }, { name: 'Sea Moss', icon: '🌊' }],
    tags: ['tropical', 'delicious'],
    inStock: true,
    source: 'sandbox_sync',
    syncedAt: new Date()
  },
  {
    id: 'sandbox-bundle',
    squareId: '2QHZ5O5ZJKDNGC3D4WEM2SUQ',
    name: 'Wellness Starter Bundle',
    slug: 'wellness-starter-bundle',
    description: 'Try our most popular flavors - Gold, Purple, and Elderberry',
    price: 79.99,
    priceCents: 7999,
    category: 'Bundles',
    intelligentCategory: 'Bundles',
    image: '/images/products/wellness-bundle.jpg',
    variations: [
      { id: '2QHZ5O5ZJKDNGC3D4WEM2SUQ', name: '3-Pack Bundle', price: 79.99, priceCents: 7999 }
    ],
    ingredients: [],
    tags: ['bundle', 'value', 'starter'],
    featured: true,
    inStock: true,
    source: 'sandbox_sync',
    syncedAt: new Date()
  }
];

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
