/**
 * Storefront Catalog API
 * Returns products from MongoDB (synced from Square)
 * Mirrors the working /api/products approach
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    
    // Fetch from square_catalog_items (same collection as working products API)
    const rawItems = await db
      .collection('square_catalog_items')
      .find({})
      .sort({ name: 1 })
      .toArray();
    
    console.log(`[Storefront] Fetched ${rawItems.length} items from MongoDB`);

    // Transform to storefront format
    const products = rawItems
      .filter((item: any) => {
        const data = item.itemData || item;
        // Only show items with variations/pricing
        return !data.isArchived && data.variations?.length > 0;
      })
      .map((item: any) => {
        const data = item.itemData || item;
        const variations = data.variations || [];
        const primaryVariation = variations[0] || {};
        const variationData = primaryVariation.itemVariationData || primaryVariation || {};
        
        // Get price
        const priceMoney = variationData.priceMoney || variationData.price || {};
        const priceCents = parseInt(
          priceMoney.amount?.toString() || 
          priceMoney.priceCents?.toString() || 
          '0'
        );
        const price = priceCents / 100 || (data.price || 0);
        
        // Determine category
        const name = (data.name || '').toLowerCase();
        let category = 'specials';
        let emoji = '🛍️';
        
        if (name.includes('lemonade')) {
          category = 'lemonades';
          emoji = '🍋';
        } else if (name.includes('juice')) {
          category = 'juices';
          emoji = '🧃';
        } else if (name.includes('moss') || name.includes('gel')) {
          category = 'sea-moss';
          emoji = '🌿';
        } else if (name.includes('refresher')) {
          category = 'refreshers';
          emoji = '🍹';
        } else if (name.includes('boba')) {
          category = 'boba';
          emoji = '🧋';
        } else if (name.includes('shot')) {
          category = 'shots';
          emoji = '🥃';
        }
        
        // Get images
        const images = Array.isArray(data.images) 
          ? data.images.map((img: any) => 
              typeof img === 'string' ? img : img?.url
            ).filter(Boolean)
          : [];
        
        return {
          id: item.id || item._id?.toString(),
          name: data.name,
          description: data.description,
          price,
          priceCents,
          category,
          emoji,
          available: true,
          inStock: true,
          stockQuantity: 99,
          image: images[0],
          images,
          squareData: {
            itemId: item.id,
            variationId: primaryVariation.id,
            catalogObjectId: primaryVariation.id
          }
        };
      });

    return NextResponse.json(
      {
        success: true,
        products,
        count: products.length,
        source: 'mongodb_catalog',
        timestamp: new Date().toISOString()
      },
      { headers: NO_STORE_HEADERS }
    );

  } catch (error) {
    console.error('[Storefront] Catalog error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch catalog',
        products: [],
        source: 'error'
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
