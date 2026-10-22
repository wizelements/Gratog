/**
 * Square API Client for Edge Runtime
 * Lightweight version that works in Edge runtime (no Node.js APIs)
 */

import { approvedUnitPriceCents } from './merchant-pricing';

const SQUARE_VERSION = '2025-10-16';

// Canonical Calm Waters Square item: CIEYXH3G7FHAST6DLWMCFYS5.
// Preserve the older merchant object for historical transactions, but never
// advertise the duplicate item to shoppers through our public catalog.
const LEGACY_DUPLICATE_CALM_WATERS_ID = 'NOD76PUJZP7QRJ2YTHY7S3K5';

interface SquareConfig {
  accessToken: string;
  environment: 'sandbox' | 'production';
}

function getSquareConfig(): SquareConfig {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const environment = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase() as 'sandbox' | 'production';
  
  if (!accessToken) {
    throw new Error('SQUARE_ACCESS_TOKEN not configured');
  }
  
  return { accessToken, environment };
}

function getBaseUrl(environment: string): string {
  return environment === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

// In-memory cache for edge runtime (per-request only)
// For persistent caching, use Vercel KV or similar
const cache = new Map<string, { data: unknown; expiry: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCached<T>(key: string, data: T, ttlSeconds: number): void {
  cache.set(key, { data, expiry: Date.now() + ttlSeconds * 1000 });
}

/**
 * The Blue Lotus 16 oz gel has one merchant-approved selling option ($36).
 * Square can retain legacy variants, including an old $35 default. Select
 * only the actual 16 oz variation, and never suggest that a sample is sold.
 * The payment service must still verify its own authoritative catalog price.
 */
function catalogVariationForItem(itemId: string, variations: any[]): {
  variation: any;
  approvedBlueLotus: boolean;
} {
  const approvedBlueLotus = itemId === 'DSROEB4HMZK63V7IGBH6SSJH';
  if (!approvedBlueLotus) return { variation: variations[0], approvedBlueLotus };
  return {
    variation: variations.find((v: any) =>
      /^16\s*oz(?:\b|$)/i.test(String(v?.item_variation_data?.name || v?.itemVariationData?.name || '').trim())
    ),
    approvedBlueLotus,
  };
}

interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  category?: string;
  available: boolean;
}

/**
 * Fetch catalog from Square API with edge caching
 */
export async function getSquareCatalog(options: {
  category?: string | null;
  limit?: number;
} = {}): Promise<CatalogItem[]> {
  const { category, limit = 100 } = options;
  const config = getSquareConfig();
  
  const cacheKey = `catalog:${category || 'all'}:${limit}`;
  const cached = getCached<CatalogItem[]>(cacheKey);
  if (cached) return cached;

  const baseUrl = getBaseUrl(config.environment);
  const url = new URL(`${baseUrl}/v2/catalog/list`);
  url.searchParams.set('types', 'ITEM');

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_VERSION,
      },
      // Edge runtime fetch options
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });

    if (!response.ok) {
      throw new Error(`Square API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform Square catalog to our format
    const items: CatalogItem[] = (data.objects || [])
      // Square keeps archived items in ListCatalog. Never publish archived
      // stock as actively shoppable or indexable products.
      .filter((obj: any) =>
        obj.type === 'ITEM' &&
        obj.id !== LEGACY_DUPLICATE_CALM_WATERS_ID &&
        obj.is_deleted !== true &&
        obj.isDeleted !== true &&
        obj.item_data?.is_archived !== true &&
        obj.itemData?.isArchived !== true
      )
      .map((obj: any) => {
        const item = obj.item_data || obj.itemData || {};
        const variations = item.variations || [];
        const { variation: approvedVariation, approvedBlueLotus } =
          catalogVariationForItem(obj.id, variations);
        const variation = approvedVariation?.item_variation_data || approvedVariation?.itemVariationData || {};
        const priceMoney = variation.price_money || variation.priceMoney || {};
        
        return {
          id: obj.id,
          name: item.name || 'Unnamed Product',
          description: item.description || item.description_plaintext,
          price: approvedBlueLotus
            ? approvedVariation ? 36 : 0
            : (approvedUnitPriceCents({ id: obj.id, name: item.name }) ??
                (priceMoney.amount ? parseInt(String(priceMoney.amount)) : 0)) / 100,
          currency: priceMoney.currency || 'USD',
          imageUrl: item.image_ids?.[0] || item.imageIds?.[0]
            ? `${baseUrl}/v2/catalog/object/${item.image_ids?.[0] || item.imageIds?.[0]}` 
            : undefined,
          category: item.category_id || item.categoryId,
          available: (!approvedBlueLotus || Boolean(approvedVariation)) &&
            item.is_archived !== true && item.isArchived !== true &&
            obj.is_deleted !== true && obj.isDeleted !== true,
        };
      })
      .filter((item: CatalogItem) => {
        if (category && item.category !== category) return false;
        return true;
      })
      .slice(0, limit);

    setCached(cacheKey, items, 60);
    return items;
  } catch (error) {
    console.error('[Square Edge] Error fetching catalog:', error);
    throw error;
  }
}

/**
 * Get single product by ID
 */
export async function getSquareProduct(id: string): Promise<CatalogItem | null> {
  const cacheKey = `product:${id}`;
  const cached = getCached<CatalogItem>(cacheKey);
  if (cached) return cached;

  const config = getSquareConfig();
  const baseUrl = getBaseUrl(config.environment);

  try {
    const response = await fetch(`${baseUrl}/v2/catalog/object/${id}`, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Square-Version': SQUARE_VERSION,
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Square API error: ${response.status}`);
    }

    const data = await response.json();
    const obj = data.object;
    
    if (!obj || obj.id === LEGACY_DUPLICATE_CALM_WATERS_ID || obj.type !== 'ITEM' || obj.is_deleted === true || obj.isDeleted === true || obj.item_data?.is_archived === true || obj.itemData?.isArchived === true) return null;

    const item = obj.item_data || obj.itemData || {};
    const variations = item.variations || [];
    const { variation: approvedVariation, approvedBlueLotus } =
      catalogVariationForItem(obj.id, variations);
    const variation = approvedVariation?.item_variation_data || approvedVariation?.itemVariationData || {};
    const priceMoney = variation.price_money || variation.priceMoney || {};
    
    const product: CatalogItem = {
      id: obj.id,
      name: item.name || 'Unnamed Product',
      description: item.description || item.description_plaintext,
      price: approvedBlueLotus
        ? approvedVariation ? 36 : 0
        : priceMoney.amount ? parseInt(String(priceMoney.amount)) / 100 : 0,
      currency: priceMoney.currency || 'USD',
      imageUrl: item.image_ids?.[0] || item.imageIds?.[0]
        ? `${baseUrl}/v2/catalog/object/${item.image_ids?.[0] || item.imageIds?.[0]}` 
        : undefined,
      category: item.category_id || item.categoryId,
      available: (!approvedBlueLotus || Boolean(approvedVariation)) &&
        item.is_archived !== true && item.isArchived !== true &&
        obj.is_deleted !== true && obj.isDeleted !== true,
    };

    setCached(cacheKey, product, 60);
    return product;
  } catch (error) {
    console.error('[Square Edge] Error fetching product:', error);
    throw error;
  }
}
