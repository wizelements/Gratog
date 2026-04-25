import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

interface RateLimitOptions {
  uniqueTokenPerInterval?: number;
  interval?: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export class RateLimiter {
  private cache: LRUCache<string, number[]>;
  private interval: number;

  constructor(options: RateLimitOptions = {}) {
    const { uniqueTokenPerInterval = 500, interval = 60000 } = options;
    this.interval = interval;
    this.cache = new LRUCache({
      max: uniqueTokenPerInterval,
    });
  }

  check(token: string, limit: number): RateLimitResult {
    const now = Date.now();
    const tokenKey = token;
    
    const timestamps = this.cache.get(tokenKey) || [];
    
    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < this.interval
    );
    
    // Check if limit exceeded
    if (validTimestamps.length >= limit) {
      const oldestTimestamp = validTimestamps[0];
      return {
        success: false,
        limit,
        remaining: 0,
        reset: oldestTimestamp + this.interval,
      };
    }
    
    // Add current timestamp
    validTimestamps.push(now);
    this.cache.set(tokenKey, validTimestamps);
    
    return {
      success: true,
      limit,
      remaining: limit - validTimestamps.length,
      reset: now + this.interval,
    };
  }
}

// Global rate limiters
const orderLimiter = new RateLimiter({ interval: 60000 }); // 1 minute
const apiLimiter = new RateLimiter({ interval: 60000 });
const inventoryLimiter = new RateLimiter({ interval: 10000 }); // 10 seconds

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

export async function rateLimitOrder(
  request: NextRequest,
  limit: number = 5
): Promise<{ success: boolean; result?: RateLimitResult }> {
  const ip = getClientIP(request);
  const phone = request.headers.get('x-customer-phone') || ip;
  
  const result = orderLimiter.check(phone, limit);
  
  if (!result.success) {
    return { success: false, result };
  }
  
  return { success: true };
}

export async function rateLimitAPI(
  request: NextRequest,
  limit: number = 100
): Promise<{ success: boolean; result?: RateLimitResult }> {
  const ip = getClientIP(request);
  const result = apiLimiter.check(ip, limit);
  
  if (!result.success) {
    return { success: false, result };
  }
  
  return { success: true };
}

export async function rateLimitInventory(
  request: NextRequest,
  limit: number = 30
): Promise<{ success: boolean; result?: RateLimitResult }> {
  const ip = getClientIP(request);
  const result = inventoryLimiter.check(ip, limit);
  
  if (!result.success) {
    return { success: false, result };
  }
  
  return { success: true };
}

export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}
