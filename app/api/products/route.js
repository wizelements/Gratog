import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

/**
 * GET /api/products
 * Fetch all products from Square catalog synced to MongoDB
 */
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    
    // Fetch all synced catalog items from MongoDB
    const items = await db.collection('square_catalog_items')
      .find({})
      .sort({ name: 1 })
      .toArray();
    
    // Transform Square catalog format to app format
    const products = items.map(item => {
      // Get first variation for pricing (most items have one variation)
      const mainVariation = item.variations && item.variations.length > 0 
        ? item.variations[0] 
        : null;
      
      // Determine category from Square categoryId or item name
      let category = 'other';
      if (item.name.toLowerCase().includes('gel')) category = 'gel';
      else if (item.name.toLowerCase().includes('lemonade') || item.name.toLowerCase().includes('zinger')) category = 'lemonade';
      else if (item.name.toLowerCase().includes('shot')) category = 'shot';
      else if (item.name.toLowerCase().includes('juice')) category = 'juice';
      
      return {
        id: item.id,
        variationId: mainVariation?.id,
        name: item.name,
        description: item.description || `Premium ${item.name}`,
        price: mainVariation?.price || 0,
        priceCents: mainVariation?.priceCents || 0,
        category,
        image: item.images && item.images.length > 0 ? item.images[0] : '/images/products/default.jpg',
        images: item.images || [],
        inStock: true,
        variations: item.variations || [],
        squareData: {
          catalogObjectId: item.id,
          variationId: mainVariation?.id,
          categoryId: item.categoryId
        }
      };
    });
    
    console.log(`✅ Products API: Returning ${products.length} products from Square catalog`);
    
    return NextResponse.json({
      success: true,
      products,
      count: products.length,
      source: 'square_catalog_sync',
      lastSync: items.length > 0 ? items[0].updatedAt : null
    });
    
  } catch (error) {
    console.error('Failed to fetch products:', error);
    
    // Fallback to hardcoded products if database fails
    const { PRODUCTS } = await import('@/lib/products');
    
    return NextResponse.json({
      success: true,
      products: PRODUCTS,
      count: PRODUCTS.length,
      source: 'fallback_hardcoded',
      error: 'Database error - using fallback data'
    });
  }
}
