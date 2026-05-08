/**
 * Direct Square Catalog API
 * Fetches products directly from Square without database sync
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
      console.error('SQUARE_ACCESS_TOKEN not configured');
      return NextResponse.json(
        { success: false, error: 'Square not configured', products: [] },
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
    
    console.log(`Fetched ${items.length} items from Square`);

    // Transform Square items to storefront format
    const products = items
      .filter((item: any) => {
        // Only include items that are available for sale
        const data = item.itemData || {};
        return !data.skipModifierScreen && data.variations?.length > 0;
      })
      .map((item: any) => {
        const data = item.itemData || {};
        const variations = data.variations || [];
        const primaryVariation = variations[0] || {};
        const variationData = primaryVariation.itemVariationData || {};
        
        // Get price in cents
        const priceMoney = variationData.priceMoney || {};
        const priceCents = priceMoney.amount || 0;
        const price = priceCents / 100;
        
        // Determine category
        let category = 'specials';
        const name = (data.name || '').toLowerCase();
        const description = (data.description || '').toLowerCase();
        
        if (name.includes('lemonade') || description.includes('lemonade')) {
          category = 'lemonades';
        } else if (name.includes('juice') || description.includes('juice')) {
          category = 'juices';
        } else if (name.includes('moss') || name.includes('gel')) {
          category = 'sea-moss';
        } else if (name.includes('refresher')) {
          category = 'refreshers';
        } else if (name.includes('boba') || name.includes('bubble')) {
          category = 'boba';
        }
        
        // Get image if available
        const imageIds = data.imageIds || [];
        const imageUrl = imageIds.length > 0 
          ? `/api/square/image/${imageIds[0]}` 
          : undefined;
        
        return {
          id: item.id,
          name: data.name,
          description: data.description,
          price,
          priceCents,
          category,
          available: true,
          inStock: true,
          stockQuantity: 99,
          image: imageUrl,
          images: imageIds.map((id: string) => `/api/square/image/${id}`),
          squareData: {
            itemId: item.id,
            variationId: primaryVariation.id,
            catalogObjectId: primaryVariation.id
          },
          variations: variations.map((v: any) => ({
            id: v.id,
            name: v.itemVariationData?.name || 'Default',
            price: (v.itemVariationData?.priceMoney?.amount || 0) / 100,
            priceCents: v.itemVariationData?.priceMoney?.amount || 0
          }))
        };
      });

    console.log(`Returning ${products.length} products`);

    return NextResponse.json(
      {
        success: true,
        products,
        count: products.length,
        source: 'square_direct',
        timestamp: new Date().toISOString()
      },
      { headers: NO_STORE_HEADERS }
    );

  } catch (error) {
    console.error('Square catalog error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Square catalog',
        products: [],
        source: 'error'
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS
      }
    );
  }
}
