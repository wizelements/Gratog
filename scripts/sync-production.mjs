// Sync production Square catalog to MongoDB
import { MongoClient } from 'mongodb';
import 'dotenv/config';

const SQUARE_ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();
const SQUARE_BASE = SQUARE_ENV === 'production' 
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';
const SQUARE_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const SQUARE_VERSION = '2025-01-16';

async function squareFetch(path) {
  const url = `${SQUARE_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${SQUARE_TOKEN}`,
      'Square-Version': SQUARE_VERSION,
      'Content-Type': 'application/json'
    }
  });
  
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  
  if (!response.ok) {
    throw new Error(json?.errors?.[0]?.detail || `Square ${response.status}`);
  }
  
  return json;
}

function fromCents(priceMoney) {
  if (!priceMoney?.amount) return 0;
  return Number(priceMoney.amount) / 100;
}

async function syncCatalog() {
  console.log('🔄 Square Catalog Sync');
  console.log('Environment:', SQUARE_ENV);
  console.log('Location:', SQUARE_LOCATION_ID);
  
  if (!SQUARE_TOKEN) {
    console.error('❌ SQUARE_ACCESS_TOKEN not set');
    process.exit(1);
  }
  
  const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
  const dbName = process.env.DATABASE_NAME || process.env.DB_NAME || 'taste_of_gratitude';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Test Square connectivity
    console.log('\n🔌 Testing Square API...');
    const locationTest = await squareFetch(`/v2/locations/${SQUARE_LOCATION_ID}`);
    console.log('✅ Connected to:', locationTest.location?.name);
    
    // Fetch catalog
    console.log('\n📦 Fetching catalog...');
    const objects = [];
    let cursor = undefined;
    
    do {
      const types = 'ITEM,ITEM_VARIATION,CATEGORY,IMAGE';
      const path = `/v2/catalog/list?types=${types}${cursor ? `&cursor=${cursor}` : ''}`;
      const result = await squareFetch(path);
      
      if (result.objects) {
        objects.push(...result.objects);
      }
      cursor = result.cursor;
    } while (cursor);
    
    console.log(`Found ${objects.length} catalog objects`);
    
    // Group objects
    const items = objects.filter(obj => obj.type === 'ITEM');
    const variations = objects.filter(obj => obj.type === 'ITEM_VARIATION');
    const categories = objects.filter(obj => obj.type === 'CATEGORY');
    const images = objects.filter(obj => obj.type === 'IMAGE');
    
    console.log(`  Items: ${items.length}, Variations: ${variations.length}, Categories: ${categories.length}, Images: ${images.length}`);
    
    // Create lookups
    const variationMap = new Map();
    variations.forEach(v => variationMap.set(v.id, v));
    
    const imageMap = new Map();
    images.forEach(img => {
      const imageData = img.image_data || img.imageData;
      if (imageData?.url) imageMap.set(img.id, imageData.url);
    });
    
    const categoryMap = new Map();
    categories.forEach(cat => {
      const catData = cat.category_data || cat.categoryData;
      if (catData?.name) categoryMap.set(cat.id, catData.name);
    });
    
    // Process items
    console.log('\n🔄 Processing items...');
    const processedItems = [];
    
    for (const item of items) {
      const itemData = item.item_data || item.itemData;
      if (!itemData) continue;
      
      const itemVariations = [];
      if (itemData.variations) {
        for (const varRef of itemData.variations) {
          const variation = varRef.type === 'ITEM_VARIATION' ? varRef : variationMap.get(varRef.id);
          if (variation) {
            const varData = variation.item_variation_data || variation.itemVariationData;
            if (varData) {
              const priceMoney = varData.price_money || varData.priceMoney;
              itemVariations.push({
                id: variation.id,
                name: varData.name,
                sku: varData.sku,
                price: fromCents(priceMoney),
                priceCents: priceMoney?.amount ? Number(priceMoney.amount) : 0,
                currency: priceMoney?.currency || 'USD'
              });
            }
          }
        }
      }
      
      const itemImages = [];
      const imageIds = itemData.image_ids || itemData.imageIds || [];
      for (const imageId of imageIds) {
        const imageUrl = imageMap.get(imageId);
        if (imageUrl) itemImages.push(imageUrl);
      }
      
      const categoryId = itemData.category_id || itemData.categoryId;
      
      processedItems.push({
        id: item.id,
        name: itemData.name || 'Unnamed Item',
        description: itemData.description,
        categoryId: categoryId,
        category: categoryId ? categoryMap.get(categoryId) : null,
        variations: itemVariations,
        images: itemImages,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    console.log(`Processed ${processedItems.length} items`);
    console.log(`  With images: ${processedItems.filter(i => i.images.length > 0).length}`);
    
    // Save to square_catalog_items
    console.log('\n💾 Saving to database...');
    await db.collection('square_catalog_items').deleteMany({});
    if (processedItems.length > 0) {
      await db.collection('square_catalog_items').insertMany(processedItems);
    }
    console.log(`Saved ${processedItems.length} items to square_catalog_items`);
    
    // Now sync to unified_products
    console.log('\n🔄 Syncing to unified_products...');
    let synced = 0;
    
    for (const item of processedItems) {
      const slug = item.name?.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const primaryVar = item.variations?.[0] || {};
      
      const unifiedProduct = {
        id: item.id,
        squareId: item.id,
        slug: slug,
        name: item.name,
        description: item.description || `Premium ${item.name}`,
        price: primaryVar.price || 0,
        priceCents: primaryVar.priceCents || 0,
        currency: 'USD',
        category: item.category,
        squareCategory: item.category,
        squareCategoryId: item.categoryId,
        image: item.images?.[0] || null,
        images: item.images || [],
        inStock: true,
        variations: item.variations || [],
        squareData: {
          catalogObjectId: item.id,
          variationId: primaryVar.id,
          categoryId: item.categoryId
        },
        source: 'square_sync',
        syncedAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('unified_products').updateOne(
        { id: item.id },
        { $set: unifiedProduct },
        { upsert: true }
      );
      synced++;
    }
    
    console.log(`Synced ${synced} products to unified_products`);
    
    // Final counts
    const finalCount = await db.collection('unified_products').countDocuments();
    const withImages = await db.collection('unified_products').countDocuments({ 'images.0': { $exists: true } });
    
    console.log(`\n✅ Sync complete!`);
    console.log(`   Total products: ${finalCount}`);
    console.log(`   With images: ${withImages}`);
    
  } finally {
    await client.close();
  }
}

syncCatalog().catch(console.error);
