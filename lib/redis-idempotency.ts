/**
 * Redis-based idempotency key management for production multi-instance deployments
 * Falls back to in-memory cache if Redis is not available
 */

import { createClient, RedisClientType } from 'redis';

interface IdempotencyRecord {
  key: string;
  response: any;
  createdAt: Date;
  expiresAt: Date;
}

// Redis client singleton
let redisClient: RedisClientType | null = null;
let isRedisAvailable = false;

// Fallback in-memory cache
const memoryCache = new Map<string, IdempotencyRecord>();

/**
 * Initialize Redis client
 */
export async function initRedis() {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('REDIS_URL not configured, using in-memory idempotency cache (not recommended for production)');
    return null;
  }

  try {
    redisClient = createClient({ url: redisUrl });
    
    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('Redis connected for idempotency caching');
      isRedisAvailable = true;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    return null;
  }
}

/**
 * Get idempotent response from cache
 */
export async function getIdempotentResponse(key: string): Promise<any | null> {
  // Try Redis first
  if (redisClient && isRedisAvailable) {
    try {
      const cached = await redisClient.get(`idem:${key}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Redis get error, falling back to memory:', error);
    }
  }

  // Fallback to memory cache
  const record = memoryCache.get(key);
  if (!record) return null;

  // Check if expired
  if (record.expiresAt < new Date()) {
    memoryCache.delete(key);
    return null;
  }

  return record.response;
}

/**
 * Store response for idempotency key
 */
export async function setIdempotentResponse(
  key: string,
  response: any,
  ttlSeconds: number = 86400
): Promise<void> {
  const serialized = JSON.stringify(response);

  // Try Redis first
  if (redisClient && isRedisAvailable) {
    try {
      await redisClient.setEx(`idem:${key}`, ttlSeconds, serialized);
      return;
    } catch (error) {
      console.error('Redis set error, falling back to memory:', error);
    }
  }

  // Fallback to memory cache
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  memoryCache.set(key, {
    key,
    response,
    createdAt: now,
    expiresAt,
  });
}

/**
 * Middleware wrapper for idempotent operations (Redis-backed)
 */
export async function withIdempotency<T>(
  key: string,
  operation: () => Promise<T>,
  ttlSeconds: number = 86400
): Promise<T> {
  // Check if we already have a response
  const cachedResponse = await getIdempotentResponse(key);
  if (cachedResponse !== null) {
    console.log(`Idempotency cache hit for key: ${key}`);
    return cachedResponse;
  }

  // Execute the operation
  const response = await operation();

  // Cache the response
  await setIdempotentResponse(key, response, ttlSeconds);

  return response;
}

/**
 * Clean up expired keys from memory cache (Redis handles TTL automatically)
 */
export function cleanupMemoryCache() {
  const now = new Date();
  for (const [key, record] of memoryCache.entries()) {
    if (record.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
}

// Clean up memory cache every hour
setInterval(cleanupMemoryCache, 60 * 60 * 1000);

/**
 * Graceful shutdown
 */
export async function shutdownRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isRedisAvailable = false;
  }
}
