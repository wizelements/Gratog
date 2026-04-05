/**
 * Redis-based Distributed Rate Limiting
 * 
 * Provides production-safe rate limiting across multiple instances.
 * Falls back to in-memory if Redis is unavailable.
 */

import { logger } from '@/lib/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
};

// ============================================================================
// REDIS CLIENT (LAZY INITIALIZATION)
// ============================================================================

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { px?: number }): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

let redisClient: RedisClient | null = null;
let redisAvailable = false;

/**
 * Initialize Redis client (called lazily)
 */
async function getRedisClient(): Promise<RedisClient | null> {
  if (redisClient) {
    return redisClient;
  }
  
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
  
  if (!redisUrl) {
    logger.debug('REDIS', 'No Redis URL configured, using in-memory fallback');
    return null;
  }
  
  try {
    // Dynamic import to avoid build-time issues
    const { createClient } = await import('redis');
    
    const client = createClient({
      url: redisUrl,
    });
    
    await client.connect();
    redisClient = client as unknown as RedisClient;
    redisAvailable = true;
    
    logger.info('REDIS', 'Redis client connected');
    
    // Handle disconnects
    (client as any).on('error', (error: Error) => {
      logger.error('REDIS', 'Redis error', error);
      redisAvailable = false;
    });
    
    return redisClient;
    
  } catch (error) {
    logger.warn('REDIS', 'Failed to connect to Redis, using in-memory fallback', error);
    redisAvailable = false;
    return null;
  }
}

// ============================================================================
// IN-MEMORY FALLBACK
// ============================================================================

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetAt) {
      memoryStore.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

/**
 * Get rate limit from memory store
 */
function getMemoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);
  
  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + config.windowMs;
    memoryStore.set(key, {
      count: 1,
      resetAt,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
      limit: config.maxRequests,
    };
  }
  
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      limit: config.maxRequests,
    };
  }
  
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
    limit: config.maxRequests,
  };
}

// ============================================================================
// REDIS RATE LIMITING
// ============================================================================

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Get rate limit using Redis (with memory fallback)
 * Uses sliding window algorithm
 */
async function getRedisRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const client = await getRedisClient();
  
  if (!client || !redisAvailable) {
    return getMemoryRateLimit(key, config);
  }
  
  try {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / config.windowMs)}`;
    
    // Increment counter
    const count = await client.incr(windowKey);
    
    // Set expiry on first increment
    if (count === 1) {
      await client.expire(windowKey, Math.ceil(config.windowMs / 1000));
    }
    
    const ttl = await client.get(`${windowKey}:ttl`);
    const resetAt = now + config.windowMs;
    
    if (count > config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit: config.maxRequests,
      };
    }
    
    return {
      allowed: true,
      remaining: config.maxRequests - count,
      resetAt,
      limit: config.maxRequests,
    };
    
  } catch (error) {
    logger.error('REDIS', 'Redis rate limit error, falling back to memory', error);
    return getMemoryRateLimit(key, config);
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check rate limit for a given key
 */
export async function checkRateLimit(
  key: string,
  maxRequests?: number,
  windowMs?: number
): Promise<RateLimitResult> {
  const config: RateLimitConfig = {
    windowMs: windowMs || DEFAULT_CONFIG.windowMs,
    maxRequests: maxRequests || DEFAULT_CONFIG.maxRequests,
  };
  
  return getRedisRateLimit(key, config);
}

/**
 * Rate limit configuration for different endpoint types
 */
export const RATE_LIMITS = {
  // Auth endpoints
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  passwordReset: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  
  // Read endpoints
  list: { maxRequests: 300, windowMs: 60 * 1000 }, // 300 per min
  view: { maxRequests: 300, windowMs: 60 * 1000 },
  search: { maxRequests: 100, windowMs: 60 * 1000 },
  
  // Write endpoints
  create: { maxRequests: 60, windowMs: 60 * 1000 },
  update: { maxRequests: 60, windowMs: 60 * 1000 },
  delete: { maxRequests: 30, windowMs: 60 * 1000 },
  
  // High-risk endpoints
  bulk: { maxRequests: 10, windowMs: 60 * 1000 },
  send: { maxRequests: 10, windowMs: 60 * 1000 }, // campaigns
  export: { maxRequests: 5, windowMs: 60 * 1000 },
  
  // Analytics (expensive queries)
  analytics: { maxRequests: 30, windowMs: 60 * 1000 },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Get rate limit result for a specific action type
 */
export async function checkActionRateLimit(
  actionType: RateLimitType,
  identifier: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[actionType];
  const key = `ratelimit:${actionType}:${identifier}`;
  return checkRateLimit(key, config.maxRequests, config.windowMs);
}

/**
 * Reset rate limit for a key (useful for testing)
 */
export async function resetRateLimit(key: string): Promise<void> {
  const client = await getRedisClient();
  
  if (client && redisAvailable) {
    try {
      await client.del(`ratelimit:${key}`);
    } catch (error) {
      logger.error('REDIS', 'Failed to reset rate limit', error);
    }
  }
  
  // Also clear from memory
  for (const [memoryKey] of memoryStore.entries()) {
    if (memoryKey.includes(key)) {
      memoryStore.delete(memoryKey);
    }
  }
}

// ============================================================================
// MIDDLEWARE INTEGRATION
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware-compatible rate limit checker
 * Returns response with rate limit headers
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  actionType: RateLimitType
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const identifier = getClientIdentifier(request);
  const result = await checkActionRateLimit(actionType, identifier);
  
  if (!result.allowed) {
    const response = NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      },
      { status: 429 }
    );
    
    response.headers.set('Retry-After', String(Math.ceil((result.resetAt - Date.now()) / 1000)));
    response.headers.set('X-RateLimit-Limit', String(result.limit));
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
    
    return { allowed: false, response };
  }
  
  return { allowed: true };
}

function getClientIdentifier(request: NextRequest): string {
  // Use IP + user agent hash for anonymous
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}
