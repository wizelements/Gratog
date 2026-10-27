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

/**
 * Square Catalog includes merchandise definitions, NOT inventory.
 * A missing count, revoked INVENTORY_READ, or unreachable provider must
 * never become a made-up quantity or authorize checkout.
 * The caller's Square token and location stay server-side.
 */
async function verifiedSquareInventory(
  token: string,
  environment: string,
  locationId: string | undefined,
  variationIds: string[]
): Promise<{ counts: Map<string, number>; verified: boolean }> {
  const counts = new Map<string, number>();
  if (!locationId || variationIds.length === 0) return { counts, verified: false };
  const host = environment === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
  try {
    for (let offset = 0; offset < variationIds.length; offset += 1000) {
      const ids = variationIds.slice(offset, offset + 1000);
      let cursor: string | undefined;
      let page = 0;
      do {
        if (++page > 25) throw new Error('Inventory pagination limit exceeded');
        const result = await fetch(host + '/v2/inventory/counts/batch-retrieve', {
          method: 'POST',
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
          headers: {
            Authorization: 'Bearer ' + token,
            'Square-Version': '2026-09-16',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            catalog_object_ids: ids,
            location_ids: [locationId],
            states: ['IN_STOCK'],
            ...(cursor ? { cursor } : {}),
          }),
        });
        if (!result.ok) throw new Error('Square Inventory HTTP ' + result.status);
        const body = await result.json();
        if (Array.isArray(body.errors) && body.errors.length) {
          throw new Error('Square Inventory returned provider errors');
        }
        for (const entry of body.counts || []) {
          if (entry.location_id !== locationId || entry.state !== 'IN_STOCK') continue;
          if (!ids.includes(entry.catalog_object_id)) continue;
          const quantity = Number(entry.quantity);
          if (!Number.isFinite(quantity) || quantity < 0) {
            throw new Error('Invalid Square inventory count');
          }
          counts.set(entry.catalog_object_id, (counts.get(entry.catalog_object_id) || 0) + quantity);
        }
        cursor = body.cursor || undefined;
      } while (cursor);
    }
    return { counts, verified: true };
  } catch (error) {
    logger.warn('SquareStorefront', 'Unable to independently verify Square inventory', {
      reason: error instanceof Error ? error.message : 'Unknown inventory failure',
    });
    return { counts: new Map(), verified: false };
  }
}

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

    // Resolve the exact server-authorized location rather than inventing stock.
    const locationId = process.env.SQUARE_LOCATION_ID;
    const variationIds = items.flatMap((item: any) =>
      (item.itemData?.variations || []).map((v: any) => v.id).filter(Boolean));
    const inventory = await verifiedSquareInventory(
      squareToken, squareEnv, locationId, variationIds
    );

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
            const stockQuantity = inventory.verified
              ? inventory.counts.get(v.id) || 0
              : 0;
            return {
              id: v.id,
              name: v.itemVariationData?.name || 'Default',
              price: vPriceCents / 100,
              priceCents: vPriceCents,
              currency: vPriceMoney.currency,
              stockQuantity,
              inStock: inventory.verified && stockQuantity > 0,
            };
          })
          .filter(Boolean);

        const selectedStock = inventory.verified
          ? (inventory.counts.get(primaryVariation.id) || 0)
          : 0;
        return {
          id: item.id,
          name: data.name,
          description: data.description,
          price: priceCents / 100,
          priceCents,
          currency: priceMoney.currency,
          category,
          available: inventory.verified && selectedStock > 0,
          inStock: inventory.verified && selectedStock > 0,
          stockQuantity: selectedStock,
          inventoryVerified: inventory.verified,
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
        inventoryVerified: inventory.verified,
        inventorySource: inventory.verified ? 'square_inventory_at_location' : 'unverified',
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
