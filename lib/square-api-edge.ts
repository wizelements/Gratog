/**
 * Square API Client for Edge Runtime
 * Lightweight version that works in Edge runtime (no Node.js APIs)
 */

const SQUARE_VERSION = '2025-10-16';

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
      .filter((obj: any) => obj.type === 'ITEM')
      .map((obj: any) => {
        const item = obj.itemData || {};
        const variation = item.variations?.[0]?.itemVariationData || {};
        
        return {
          id: obj.id,
          name: item.name || 'Unnamed Product',
          description: item.description,
          price: variation.priceMoney?.amount ? parseInt(variation.priceMoney.amount) / 100 : 0,
          currency: variation.priceMoney?.currency || 'USD',
          imageUrl: item.imageIds?.[0] 
            ? `${baseUrl}/v2/catalog/object/${item.imageIds[0]}` 
            : undefined,
          category: item.categoryId,
          available: !item.skipModifierScreen,
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
    
    if (!obj || obj.type !== 'ITEM') return null;

    const item = obj.itemData || {};
    const variation = item.variations?.[0]?.itemVariationData || {};
    
    const product: CatalogItem = {
      id: obj.id,
      name: item.name || 'Unnamed Product',
      description: item.description,
      price: variation.priceMoney?.amount ? parseInt(variation.priceMoney.amount) / 100 : 0,
      currency: variation.priceMoney?.currency || 'USD',
      imageUrl: item.imageIds?.[0] 
        ? `${baseUrl}/v2/catalog/object/${item.imageIds[0]}` 
        : undefined,
      category: item.categoryId,
      available: !item.skipModifierScreen,
    };

    setCached(cacheKey, product, 60);
    return product;
  } catch (error) {
    console.error('[Square Edge] Error fetching product:', error);
    throw error;
  }
}
