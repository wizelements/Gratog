/**
 * Redis idempotency stub - provides in-memory fallback when Redis is not available
 */

const inMemoryStore = new Map<string, { value: string; expiry: number }>();

export class RedisIdempotency {
  private ttl: number;

  constructor(ttl: number = 3600) {
    this.ttl = ttl;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiry = Date.now() + ((ttlSeconds || this.ttl) * 1000);
    inMemoryStore.set(key, { value, expiry });
    
    // Clean up expired entries
    this.cleanup();
  }

  async get(key: string): Promise<string | null> {
    const entry = inMemoryStore.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      inMemoryStore.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async delete(key: string): Promise<void> {
    inMemoryStore.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of inMemoryStore.entries()) {
      if (now > entry.expiry) {
        inMemoryStore.delete(key);
      }
    }
  }
}

export default RedisIdempotency;
