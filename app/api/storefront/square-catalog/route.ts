/**
 * Direct Square Catalog API
 * Fetches products directly from Square without database sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { SquareClient as Client, SquareEnvironment as Environment } from 'square';
import {
  safeSquareCents,
  validateStorefrontItem,
  summarizeRejection,
  type StorefrontItem,
} from '@/lib/square-price-serializer';
import { logger } from '@/lib/logger';

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
      logger.error('SquareStorefront', 'SQUARE_ACCESS_TOKEN not configured');
      return NextResponse.json(
        { success: false, error: 'Square not configured', products: [], invalidItems: 0 },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    // Initialize Square client
    const client = new Client({
      token: squareToken,
      environment: squareEnv === 'production' ? Environment.Production : Environment.Sandbox,
    });

    // Fetch catalog items from Square
    const catalogResult = await client.catalog.list({ types: 'ITEM' } as any);
    const items = (catalogResult as any).data || (catalogResult as any).result?.objects || [];

    logger.info('SquareStorefront', `Fetched ${items.length} raw items from Square`);

    const rejected: string[] = [];

    // Transform Square items to storefront format and reject invalid records.
    const products = items
      .map((item: any) => {
        const data = item.itemData || {};
        const variations = data.variations || [];
        const primaryVariation = variations[0] || {};
        const variationData = primaryVariation.itemVariationData || {};

        // Get price in cents (Square returns BigInt; convert explicitly to Number for JSON)
        const priceMoney = variationData.priceMoney || {};
        const { cents: priceCents, status: amountStatus } = safeSquareCents(priceMoney.amount);

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
        }

        // Get image if available
        const imageIds = data.imageIds || [];
        const imageUrl = imageIds.length > 0
          ? `/api/square/image/${imageIds[0]}`
          : undefined;

        const storefrontItem: StorefrontItem = {
          id: item.id,
          name: data.name,
          priceCents,
          currency: priceMoney.currency,
          variationId: primaryVariation.id,
          itemType: item.type,
          available: true,
          inStock: true,
        };

        const validation = validateStorefrontItem(storefrontItem);
        if (!validation.valid) {
          rejected.push(summarizeRejection(data.name, validation.issues));
          return null;
        }

        const validVariations = variations
          .map((v: any) => {
            const vPriceMoney = v.itemVariationData?.priceMoney || {};
            const { cents: vPriceCents } = safeSquareCents(vPriceMoney.amount);
            const vItem: StorefrontItem = {
              id: v.id,
              name: v.itemVariationData?.name || data.name || 'Default',
              priceCents: vPriceCents,
              currency: vPriceMoney.currency,
              variationId: v.id,
              itemType: v.type,
              available: true,
              inStock: true,
            };
            const vValidation = validateStorefrontItem(vItem);
            if (!vValidation.valid) {
              rejected.push(summarizeRejection(vItem.name, vValidation.issues));
              return null;
            }
            return {
              id: v.id,
              name: v.itemVariationData?.name || 'Default',
              price: vPriceCents / 100,
              priceCents: vPriceCents,
              currency: vPriceMoney.currency,
            };
          })
          .filter(Boolean);

        return {
          id: item.id,
          name: data.name,
          description: data.description,
          price: priceCents / 100,
          priceCents,
          currency: priceMoney.currency,
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
          variations: validVariations,
        };
      })
      .filter(Boolean);

    logger.info('SquareStorefront', `Returning ${products.length} valid products; rejected ${rejected.length} items`);
    if (rejected.length > 0) {
      logger.warn('SquareStorefront', 'Rejected Square items', { rejected });
    }

    return NextResponse.json(
      {
        success: true,
        products,
        count: products.length,
        invalidItems: rejected.length,
        invalidReasons: rejected,
        source: 'square_direct',
        timestamp: new Date().toISOString()
      },
      { headers: NO_STORE_HEADERS }
    );

  } catch (error) {
    logger.error('SquareStorefront', 'Square catalog error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Square catalog',
        products: [],
        invalidItems: 0,
        source: 'error'
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS
      }
    );
  }
}
