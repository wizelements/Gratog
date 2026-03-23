const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args: unknown[]) => { if (DEBUG) console.log('[IDEMPOTENCY]', ...args); };

/**
 * Idempotency key management for payment operations
 * 
 * Storage priority:
 * 1. Upstash Redis (fastest, if UPSTASH_REDIS_REST_URL configured)
 * 2. MongoDB (distributed, survives cold starts — uses existing connection)
 * 3. In-memory (development only — does NOT survive cold starts)
 * 
 * ISS-004 FIX: Added MongoDB fallback so idempotency works across
 * serverless instances without requiring a separate Redis service.
 */

import { logger } from '@/lib/logger';

interface IdempotencyRecord {
  key: string;
  response: any;
  createdAt: string;
  expiresAt: string;
}

// Upstash Redis configuration (serverless-compatible)
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Fallback in-memory cache with strict limits
const memoryCache = new Map<string, IdempotencyRecord>();
const MAX_MEMORY_CACHE_SIZE = 100;

// Track if we've warned about in-memory mode
let warnedAboutMemoryMode = false;

/**
 * Check if Redis is available
 */
function isRedisAvailable(): boolean {
  return !!(UPSTASH_URL && UPSTASH_TOKEN);
}

/**
 * Check if MongoDB is available (always true when MONGODB_URI is set)
 */
function isMongoAvailable(): boolean {
  return !!(process.env.MONGODB_URI || process.env.MONGO_URL);
}

/**
 * Get MongoDB idempotency collection (lazy import to avoid circular deps)
 */
async function getIdempotencyCollection() {
  const { connectToDatabase } = await import('@/lib/db-optimized');
  const { db } = await connectToDatabase();
  return db.collection('idempotency_keys');
}

/**
 * Make a request to Upstash Redis REST API
 */
async function upstashRequest(command: string[]): Promise<any> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error('Upstash Redis not configured');
  }
  
  const response = await fetch(`${UPSTASH_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upstash request failed: ${error}`);
  }
  
  const data = await response.json();
  return data.result;
}

/**
 * Generate an idempotency key from request data
 */
export function generateIdempotencyKey(
  userId: string,
  operation: string,
  data: any
): string {
  const payload = JSON.stringify({ userId, operation, data });
  return `idem_${Buffer.from(payload).toString('base64').substring(0, 40)}`;
}

/**
 * Check if an idempotency key has been used
 */
export async function getIdempotentResponse(key: string): Promise<any | null> {
  // Try Redis first
  if (isRedisAvailable()) {
    try {
      const result = await upstashRequest(['GET', `idempotency:${key}`]);
      if (result) {
        debug(`Cache hit (Redis) for key: ${key}`);
        return JSON.parse(result);
      }
      return null;
    } catch (error) {
      logger.error('Idempotency', 'Redis get failed, falling back to MongoDB', { 
        key, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  // Try MongoDB (distributed, survives cold starts)
  if (isMongoAvailable()) {
    try {
      const collection = await getIdempotencyCollection();
      const record = await collection.findOne({ 
        key, 
        expiresAt: { $gt: new Date() } 
      });
      if (record) {
        debug(`Cache hit (MongoDB) for key: ${key}`);
        return record.response;
      }
      return null;
    } catch (error) {
      logger.error('Idempotency', 'MongoDB get failed, falling back to memory', { 
        key, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  } else if (!warnedAboutMemoryMode) {
    warnedAboutMemoryMode = true;
    logger.warn('Idempotency', 
      '⚠️ No distributed storage configured - using in-memory cache. ' +
      'This is NOT safe for production as duplicate payments can occur on cold starts!'
    );
  }
  
  // Fallback to memory cache
  const record = memoryCache.get(key);
  
  if (!record) {
    return null;
  }

  // Check if expired
  if (new Date(record.expiresAt) < new Date()) {
    memoryCache.delete(key);
    return null;
  }

  debug(`Cache hit (memory) for key: ${key}`);
  return record.response;
}

/**
 * Store a response for an idempotency key
 */
export async function setIdempotentResponse(
  key: string,
  response: any,
  ttlSeconds: number = 86400 // 24 hours default
): Promise<void> {
  const serialized = JSON.stringify(response);
  
  // Try Redis first
  if (isRedisAvailable()) {
    try {
      await upstashRequest(['SET', `idempotency:${key}`, serialized, 'EX', String(ttlSeconds)]);
      debug(`Stored in Redis: ${key}`);
      return;
    } catch (error) {
      logger.error('Idempotency', 'Redis set failed, falling back to MongoDB', { 
        key, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  // Try MongoDB (distributed, survives cold starts)
  if (isMongoAvailable()) {
    try {
      const collection = await getIdempotencyCollection();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
      await collection.updateOne(
        { key },
        { $set: { key, response, createdAt: now, expiresAt } },
        { upsert: true }
      );
      debug(`Stored in MongoDB: ${key}`);
      return;
    } catch (error) {
      logger.error('Idempotency', 'MongoDB set failed, falling back to memory', { 
        key, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  // Fallback to memory cache
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  // Enforce size limit with LRU-like eviction
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [k, v] of memoryCache.entries()) {
      const time = new Date(v.createdAt).getTime();
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = k;
      }
    }
    
    if (oldestKey) {
      memoryCache.delete(oldestKey);
      debug(`Evicted oldest entry: ${oldestKey}`);
    }
  }

  memoryCache.set(key, {
    key,
    response,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
  
  debug(`Stored in memory: ${key}`);
}

/**
 * Middleware wrapper for idempotent operations
 */
export async function withIdempotency<T>(
  key: string,
  operation: () => Promise<T>,
  ttlSeconds: number = 86400
): Promise<T> {
  // Check if we already have a response
  const cachedResponse = await getIdempotentResponse(key);
  if (cachedResponse !== null) {
    debug(`Returning cached response for key: ${key}`);
    return cachedResponse;
  }

  // Execute the operation
  const response = await operation();

  // Cache the response
  await setIdempotentResponse(key, response, ttlSeconds);

  return response;
}

/**
 * Extract idempotency key from request headers
 */
export function getIdempotencyKeyFromHeaders(headers: Headers): string | null {
  return headers.get('idempotency-key') || headers.get('x-idempotency-key');
}

/**
 * Validate idempotency key format
 */
export function isValidIdempotencyKey(key: string): boolean {
  // Key should be 16-64 characters, alphanumeric with dashes/underscores
  return /^[a-zA-Z0-9_-]{16,64}$/.test(key);
}

/**
 * Clean up expired keys from memory cache
 * Note: Redis handles TTL automatically, this is only for memory fallback
 */
export function cleanupExpiredKeys(): number {
  const now = new Date();
  let cleaned = 0;
  
  for (const [key, record] of memoryCache.entries()) {
    if (new Date(record.expiresAt) < now) {
      memoryCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    debug(`Cleaned ${cleaned} expired keys from memory cache`);
  }
  
  return cleaned;
}

/**
 * Get idempotency cache stats for monitoring
 */
export function getCacheStats(): {
  usingRedis: boolean;
  usingMongo: boolean;
  memoryCacheSize: number;
  maxMemoryCacheSize: number;
} {
  return {
    usingRedis: isRedisAvailable(),
    usingMongo: isMongoAvailable(),
    memoryCacheSize: memoryCache.size,
    maxMemoryCacheSize: MAX_MEMORY_CACHE_SIZE,
  };
}

/**
 * Ensure MongoDB TTL index exists for automatic expiration.
 * Call once during app startup or first use — idempotent operation.
 */
export async function ensureIdempotencyIndexes(): Promise<void> {
  if (!isMongoAvailable()) return;
  try {
    const collection = await getIdempotencyCollection();
    await collection.createIndex({ key: 1 }, { unique: true });
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    debug('MongoDB TTL index ensured on idempotency_keys.expiresAt');
  } catch (error) {
    logger.error('Idempotency', 'Failed to create MongoDB indexes', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// DO NOT use setInterval in serverless - it creates memory leaks
// Instead, cleanup is triggered on cache access or via cron
