// Redis utilities for caching, rate limiting, and queue management

// For now, use in-memory cache since we don't have Redis configured
// In production, replace with actual Redis connection

interface CacheEntry {
  value: any;
  expiry: number;
}

const memoryCache = new Map<string, CacheEntry>();
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cache operations
export class Cache {
  static set(key: string, value: any, ttlSeconds: number = 300): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    memoryCache.set(key, { value, expiry });
  }
  
  static get(key: string): any {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      memoryCache.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  static delete(key: string): void {
    memoryCache.delete(key);
  }
  
  static clear(): void {
    memoryCache.clear();
  }
  
  // Clean expired entries
  static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
      if (now > entry.expiry) {
        memoryCache.delete(key);
      }
    }
  }
}

// Rate limiting
export class RateLimit {
  static check(key: string, limit: number, windowSeconds: number): boolean {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    
    let bucket = rateLimitStore.get(key);
    
    if (!bucket || now > bucket.resetTime) {
      // Create new bucket or reset expired one
      bucket = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(key, bucket);
    }
    
    if (bucket.count >= limit) {
      return false; // Rate limit exceeded
    }
    
    bucket.count++;
    return true;
  }
  
  static reset(key: string): void {
    rateLimitStore.delete(key);
  }
  
  static getStatus(key: string): { count: number; remaining: number; resetTime: number } | null {
    const bucket = rateLimitStore.get(key);
    if (!bucket) {
      return { count: 0, remaining: 100, resetTime: Date.now() + 60000 };
    }
    
    return {
      count: bucket.count,
      remaining: Math.max(0, 100 - bucket.count),
      resetTime: bucket.resetTime
    };
  }
}

// Queue operations (simplified in-memory implementation)
export class Queue {
  private static queues = new Map<string, any[]>();
  
  static push(queueName: string, item: any): void {
    const queue = this.queues.get(queueName) || [];
    queue.push(item);
    this.queues.set(queueName, queue);
  }
  
  static pop(queueName: string): any {
    const queue = this.queues.get(queueName) || [];
    const item = queue.shift();
    if (queue.length === 0) {
      this.queues.delete(queueName);
    } else {
      this.queues.set(queueName, queue);
    }
    return item;
  }
  
  static getLength(queueName: string): number {
    const queue = this.queues.get(queueName);
    return queue ? queue.length : 0;
  }
  
  static clear(queueName: string): void {
    this.queues.delete(queueName);
  }
}

// URL frontier for crawling
export class UrlFrontier {
  private static readonly FRONTIER_KEY = 'url_frontier';
  private static readonly VISITED_KEY = 'visited_urls';
  
  static addUrl(url: string): void {
    const normalizedUrl = this.normalizeUrl(url);
    if (!this.isVisited(normalizedUrl)) {
      Queue.push(this.FRONTIER_KEY, normalizedUrl);
    }
  }
  
  static addUrls(urls: string[]): void {
    for (const url of urls) {
      this.addUrl(url);
    }
  }
  
  static getNextUrl(): string | null {
    return Queue.pop(this.FRONTIER_KEY);
  }
  
  static markVisited(url: string): void {
    const normalizedUrl = this.normalizeUrl(url);
    const visitedSet = Cache.get(this.VISITED_KEY) || new Set();
    visitedSet.add(normalizedUrl);
    Cache.set(this.VISITED_KEY, visitedSet, 3600); // 1 hour TTL
  }
  
  static isVisited(url: string): boolean {
    const normalizedUrl = this.normalizeUrl(url);
    const visitedSet = Cache.get(this.VISITED_KEY) || new Set();
    return visitedSet.has(normalizedUrl);
  }
  
  static getPendingCount(): number {
    return Queue.getLength(this.FRONTIER_KEY);
  }
  
  private static normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove query params and fragment
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      return url;
    }
  }
}

// Dead Letter Queue for failed items
export class DeadLetterQueue {
  private static readonly DLQ_KEY = 'dead_letter_queue';
  
  static add(item: { url: string; error: string; timestamp: number; attempts: number }): void {
    Queue.push(this.DLQ_KEY, item);
  }
  
  static getItems(): any[] {
    const items = [];
    let item;
    while ((item = Queue.pop(this.DLQ_KEY)) !== undefined) {
      items.push(item);
    }
    return items;
  }
  
  static count(): number {
    return Queue.getLength(this.DLQ_KEY);
  }
}

// Periodic cleanup
setInterval(() => {
  Cache.cleanup();
}, 60000); // Clean every minute
