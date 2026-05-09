/**
 * Storefront Catalog API
 * Returns products for the pay-flow and market checkout
 * Uses direct Square API to avoid database sync issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client, Environment } from 'square';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cache headers to prevent caching
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export async function GET(request: NextRequest) {
  try {
    // Check Square credentials
    const squareToken = process.env.SQUARE_ACCESS_TOKEN;
    const squareEnv = process.env.SQUARE_ENVIRONMENT || 'sandbox';
    
    if (!squareToken) {
      console.error('[Storefront] SQUARE_ACCESS_TOKEN not configured');
      console.error('[Storefront] Environment:', process.env.VERCEL_ENV, 'Node:', process.env.NODE_ENV);
      
      // Return error with debugging info
      return NextResponse.json(
        { 
          success: false, 
          error: 'Square not configured - token missing', 
          debug: {
            vercelEnv: process.env.VERCEL_ENV,
            nodeEnv: process.env.NODE_ENV,
            hasToken: false
          },
          products: [],
          source: 'error_no_credentials'
        },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    // Initialize Square client
    const client = new Client({
      accessToken: squareToken,
      environment: squareEnv === 'production' ? Environment.Production : Environment.Sandbox,
    });

    // Fetch catalog items from Square
    const { result } = await client.catalogApi.listCatalog(undefined, 'ITEM');
    const items = result.objects || [];
    
    console.log(`[Storefront] Fetched ${items.length} items from Square`);

    // Transform Square items to storefront format
    const products = items
      .filter((item: any) => {
        // Only include items that have variations/pricing
        const data = item.itemData || {};
        return data.variations?.length > 0;
      })
      .map((item: any) => {
        const data = item.itemData || {};
        const variations = data.variations || [];
        const primaryVariation = variations[0] || {};
        const variationData = primaryVariation.itemVariationData || {};
        
        // Get price in cents
        const priceMoney = variationData.priceMoney || {};
        const priceCents = parseInt(priceMoney.amount?.toString() || '0');
        const price = priceCents / 100;
        
        // Determine category and emoji
        let category = 'specials';
        let emoji = '🛍️';
        const name = (data.name || '').toLowerCase();
        const description = (data.description || '').toLowerCase();
        
        if (name.includes('lemonade') || description.includes('lemonade')) {
          category = 'lemonades';
          emoji = '🍋';
        } else if (name.includes('juice') || description.includes('juice')) {
          category = 'juices';
          emoji = '🧃';
        } else if (name.includes('moss') || name.includes('gel') || name.includes('sea')) {
          category = 'sea-moss';
          emoji = '🌿';
        } else if (name.includes('refresher')) {
          category = 'refreshers';
          emoji = '🍹';
        } else if (name.includes('boba') || name.includes('bubble')) {
          category = 'boba';
          emoji = '🧋';
        }
        
        // Get image if available
        const imageIds = data.imageIds || [];
        const imageUrl = imageIds.length > 0 
          ? undefined // We'll handle images separately
          : undefined;
        
        return {
          id: item.id,
          name: data.name,
          description: data.description,
          price,
          priceCents,
          category,
          emoji,
          available: true,
          inStock: true,
          stockQuantity: 99,
          image: imageUrl,
          images: [],
          ingredientHighlights: [],
          tags: [],
          isPopular: name.includes('original') || name.includes('signature'),
          isNew: false,
          squareData: {
            itemId: item.id,
            variationId: primaryVariation.id,
            catalogObjectId: primaryVariation.id
          }
        };
      });

    console.log(`[Storefront] Returning ${products.length} products`);

    return NextResponse.json(
      {
        success: true,
        products,
        categories: [],
        count: products.length,
        source: 'square_direct',
        timestamp: new Date().toISOString()
      },
      { headers: NO_STORE_HEADERS }
    );

  } catch (error) {
    console.error('[Storefront] Square catalog error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Square catalog',
        products: [],
        categories: [],
        source: 'error',
        timestamp: new Date().toISOString()
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS
      }
    );
  }
}
