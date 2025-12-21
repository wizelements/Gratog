/**
 * Secure Storage Module
 * 
 * Replaces localStorage with sessionStorage for security-sensitive data.
 * Provides:
 * - TTL-based expiration (default 30 minutes)
 * - Automatic cleanup of expired entries
 * - No persistent storage (cleared on browser close)
 * - Type-safe interface
 */

interface StorageEntry<T> {
  value: T;
  expiry: number;
  created: number;
}

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

class SecureStorage {
  private readonly prefix: string;
  private readonly maxEntries: number;

  constructor(prefix = 'secure_', maxEntries = 100) {
    this.prefix = prefix;
    this.maxEntries = maxEntries;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private isClient(): boolean {
    return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
  }

  private cleanupExpired(): void {
    if (!this.isClient()) return;

    try {
      const now = Date.now();
      const keysToRemove: string[] = [];

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          try {
            const raw = sessionStorage.getItem(key);
            if (raw) {
              const entry = JSON.parse(raw) as StorageEntry<unknown>;
              if (entry.expiry && now > entry.expiry) {
                keysToRemove.push(key);
              }
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch (e) {
      console.warn('SecureStorage cleanup failed:', e);
    }
  }

  set<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
    if (!this.isClient()) return;

    try {
      this.cleanupExpired();

      const storageKey = this.getKey(key);
      const now = Date.now();
      
      const entry: StorageEntry<T> = {
        value,
        expiry: now + ttlMs,
        created: now
      };

      sessionStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (e) {
      console.warn('SecureStorage set failed:', e);
    }
  }

  get<T>(key: string): T | null {
    if (!this.isClient()) return null;

    try {
      const storageKey = this.getKey(key);
      const raw = sessionStorage.getItem(storageKey);
      
      if (!raw) return null;

      const entry = JSON.parse(raw) as StorageEntry<T>;
      const now = Date.now();

      // Check expiry
      if (entry.expiry && now > entry.expiry) {
        sessionStorage.removeItem(storageKey);
        return null;
      }

      return entry.value;
    } catch (e) {
      console.warn('SecureStorage get failed:', e);
      return null;
    }
  }

  remove(key: string): void {
    if (!this.isClient()) return;

    try {
      sessionStorage.removeItem(this.getKey(key));
    } catch (e) {
      console.warn('SecureStorage remove failed:', e);
    }
  }

  clear(): void {
    if (!this.isClient()) return;

    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch (e) {
      console.warn('SecureStorage clear failed:', e);
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

// Singleton instances for different security contexts
export const rewardsStorage = new SecureStorage('rewards_secure_');
export const sessionDataStorage = new SecureStorage('session_data_');
export const checkoutStorage = new SecureStorage('checkout_secure_');

// Export class for custom instances
export { SecureStorage };
export default SecureStorage;
