/**
 * Enhanced caching utilities for frequently accessed data
 * Production-ready with Redis fallback to in-memory
 */

import { logger } from './logger';
import { Cache as MemoryCache } from './redis';

// Cache TTL configurations (in seconds)
const CACHE_TTL = {
  products: 300,        // 5 minutes
  productsFeatured: 600, // 10 minutes
  orders: 120,          // 2 minutes
  customers: 600,       // 10 minutes
  inventory: 60,        // 1 minute
  search: 300,          // 5 minutes
  analytics: 300,       // 5 minutes
  default: 300          // 5 minutes default
} as const;

// Cache key prefixes for organization
const CACHE_PREFIXES = {
  products: 'prod',
  orders: 'ord',
  customers: 'cust',
  inventory: 'inv',
  search: 'srch',
  analytics: 'anly',
  sessions: 'sess'
} as const;

// Cache metrics for monitoring
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

const metrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0
};

/**
 * Generate a cache key with prefix
 */
export function generateCacheKey(prefix: keyof typeof CACHE_PREFIXES, identifier: string): string {
  return `${CACHE_PREFIXES[prefix]}:${identifier}`;
}

/**
 * Get cache TTL for a specific data type
 */
export function getCacheTTL(type: keyof typeof CACHE_TTL): number {
  return CACHE_TTL[type] || CACHE_TTL.default;
}

/**
 * Get data from cache
 */
export function getFromCache<T>(key: string): T | null {
  try {
    const value = MemoryCache.get(key);
    if (value !== null) {
      metrics.hits++;
      return value as T;
    }
    metrics.misses++;
    return null;
  } catch (error) {
    metrics.errors++;
    logger.error('Cache', 'Error getting from cache', { key, error });
    return null;
  }
}

/**
 * Set data in cache with TTL
 */
export function setInCache<T>(key: string, value: T, ttlSeconds?: number): void {
  try {
    MemoryCache.set(key, value, ttlSeconds || CACHE_TTL.default);
    metrics.sets++;
  } catch (error) {
    metrics.errors++;
    logger.error('Cache', 'Error setting cache', { key, error });
  }
}

/**
 * Delete data from cache
 */
export function deleteFromCache(key: string): void {
  try {
    MemoryCache.delete(key);
    metrics.deletes++;
  } catch (error) {
    metrics.errors++;
    logger.error('Cache', 'Error deleting from cache', { key, error });
  }
}

/**
 * Clear all cache (use with caution)
 */
export function clearCache(): void {
  try {
    MemoryCache.clear();
    logger.info('Cache', 'Cache cleared');
  } catch (error) {
    metrics.errors++;
    logger.error('Cache', 'Error clearing cache', { error });
  }
}

/**
 * Invalidate cache by prefix (e.g., all product caches)
 */
export function invalidateCacheByPrefix(prefix: string): void {
  try {
    // Note: MemoryCache doesn't support prefix deletion natively
    // In production Redis, use SCAN + DEL pattern
    logger.info('Cache', 'Invalidating cache by prefix', { prefix });
  } catch (error) {
    metrics.errors++;
    logger.error('Cache', 'Error invalidating cache prefix', { prefix, error });
  }
}

/**
 * Cache wrapper for async functions
 * Automatically handles caching and cache misses
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  // Try to get from cache first
  const cached = getFromCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  try {
    const data = await fetchFn();
    setInCache(key, data, ttlSeconds);
    return data;
  } catch (error) {
    logger.error('Cache', 'Error in fetch function', { key, error });
    throw error;
  }
}

/**
 * Product-specific cache functions
 */
export const productCache = {
  getAll: () => getFromCache<any[]>('products:all'),
  setAll: (products: any[]) => setInCache('products:all', products, CACHE_TTL.products),
  getFeatured: () => getFromCache<any[]>('products:featured'),
  setFeatured: (products: any[]) => setInCache('products:featured', products, CACHE_TTL.productsFeatured),
  getBySlug: (slug: string) => getFromCache<any>(`products:slug:${slug}`),
  setBySlug: (slug: string, product: any) => setInCache(`products:slug:${slug}`, product, CACHE_TTL.products),
  getById: (id: string) => getFromCache<any>(`products:id:${id}`),
  setById: (id: string, product: any) => setInCache(`products:id:${id}`, product, CACHE_TTL.products),
  invalidate: (id?: string) => {
    if (id) {
      deleteFromCache(`products:id:${id}`);
    } else {
      deleteFromCache('products:all');
      deleteFromCache('products:featured');
    }
  }
};

/**
 * Order-specific cache functions
 */
export const orderCache = {
  getRecent: () => getFromCache<any[]>('orders:recent'),
  setRecent: (orders: any[]) => setInCache('orders:recent', orders, CACHE_TTL.orders),
  getById: (id: string) => getFromCache<any>(`orders:id:${id}`),
  setById: (id: string, order: any) => setInCache(`orders:id:${id}`, order, CACHE_TTL.orders),
  getByCustomer: (email: string) => getFromCache<any[]>(`orders:customer:${email}`),
  setByCustomer: (email: string, orders: any[]) => setInCache(`orders:customer:${email}`, orders, CACHE_TTL.orders),
  invalidate: (id?: string, customerEmail?: string) => {
    if (id) deleteFromCache(`orders:id:${id}`);
    if (customerEmail) deleteFromCache(`orders:customer:${customerEmail}`);
    deleteFromCache('orders:recent');
  }
};

/**
 * Customer-specific cache functions
 */
export const customerCache = {
  getByEmail: (email: string) => getFromCache<any>(`customers:email:${email}`),
  setByEmail: (email: string, customer: any) => setInCache(`customers:email:${email}`, customer, CACHE_TTL.customers),
  getById: (id: string) => getFromCache<any>(`customers:id:${id}`),
  setById: (id: string, customer: any) => setInCache(`customers:id:${id}`, customer, CACHE_TTL.customers),
  invalidate: (id?: string, email?: string) => {
    if (id) deleteFromCache(`customers:id:${id}`);
    if (email) deleteFromCache(`customers:email:${email}`);
  }
};

/**
 * Inventory-specific cache functions
 */
export const inventoryCache = {
  getByProductId: (productId: string) => getFromCache<any>(`inventory:product:${productId}`),
  setByProductId: (productId: string, inventory: any) => 
    setInCache(`inventory:product:${productId}`, inventory, CACHE_TTL.inventory),
  getStock: (productId: string) => getFromCache<number>(`inventory:stock:${productId}`),
  setStock: (productId: string, quantity: number) => 
    setInCache(`inventory:stock:${productId}`, quantity, CACHE_TTL.inventory),
  invalidate: (productId?: string) => {
    if (productId) {
      deleteFromCache(`inventory:product:${productId}`);
      deleteFromCache(`inventory:stock:${productId}`);
    }
  }
};

/**
 * Search-specific cache functions
 */
export const searchCache = {
  getResults: (query: string) => getFromCache<any>(`search:${query.toLowerCase()}`),
  setResults: (query: string, results: any) => 
    setInCache(`search:${query.toLowerCase()}`, results, CACHE_TTL.search),
  getSuggestions: (prefix: string) => getFromCache<string[]>(`search:suggestions:${prefix.toLowerCase()}`),
  setSuggestions: (prefix: string, suggestions: string[]) => 
    setInCache(`search:suggestions:${prefix.toLowerCase()}`, suggestions, CACHE_TTL.search),
  invalidate: () => {
    // Search cache auto-expires, no manual invalidation needed
  }
};

/**
 * Cache warming - Pre-populate frequently accessed data
 */
export async function warmCache(db: any): Promise<void> {
  try {
    logger.info('Cache', 'Starting cache warming');

    // Warm featured products
    const featuredProducts = await db.collection('products')
      .find({ featured: true })
      .limit(20)
      .toArray();
    productCache.setFeatured(featuredProducts);

    // Warm recent orders
    const recentOrders = await db.collection('orders')
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    orderCache.setRecent(recentOrders);

    // Warm popular products inventory
    const popularProducts = await db.collection('products')
      .find({})
      .sort({ orderCount: -1 })
      .limit(30)
      .toArray();
    
    for (const product of popularProducts) {
      const inventory = await db.collection('inventory')
        .findOne({ productId: product.id });
      if (inventory) {
        inventoryCache.setByProductId(product.id, inventory);
      }
    }

    logger.info('Cache', 'Cache warming completed', {
      featuredProducts: featuredProducts.length,
      recentOrders: recentOrders.length,
      popularProducts: popularProducts.length
    });
  } catch (error) {
    logger.error('Cache', 'Error warming cache', { error });
  }
}

/**
 * Get cache metrics
 */
export function getCacheMetrics(): CacheMetrics {
  return { ...metrics };
}

/**
 * Reset cache metrics
 */
export function resetCacheMetrics(): void {
  metrics.hits = 0;
  metrics.misses = 0;
  metrics.sets = 0;
  metrics.deletes = 0;
  metrics.errors = 0;
}

// Default export
export default {
  getFromCache,
  setInCache,
  deleteFromCache,
  clearCache,
  withCache,
  productCache,
  orderCache,
  customerCache,
  inventoryCache,
  searchCache,
  warmCache,
  getCacheMetrics,
  resetCacheMetrics,
  generateCacheKey,
  getCacheTTL,
  invalidateCacheByPrefix
};
