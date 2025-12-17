const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

/**
 * Idempotency key management for payment operations
 */

interface IdempotencyRecord {
  key: string;
  response: any;
  createdAt: Date;
  expiresAt: Date;
}

// In-memory cache (replace with Redis in production)
const idempotencyCache = new Map<string, IdempotencyRecord>();

// Clean up expired keys every hour
setInterval(() => {
  const now = new Date();
  for (const [key, record] of idempotencyCache.entries()) {
    if (record.expiresAt < now) {
      idempotencyCache.delete(key);
    }
  }
}, 60 * 60 * 1000);

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
export function getIdempotentResponse(key: string): any | null {
  const record = idempotencyCache.get(key);
  
  if (!record) {
    return null;
  }

  // Check if expired
  if (record.expiresAt < new Date()) {
    idempotencyCache.delete(key);
    return null;
  }

  return record.response;
}

/**
 * Store a response for an idempotency key
 */
export function setIdempotentResponse(
  key: string,
  response: any,
  ttlSeconds: number = 86400 // 24 hours default
): void {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  idempotencyCache.set(key, {
    key,
    response,
    createdAt: now,
    expiresAt,
  });
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
  const cachedResponse = getIdempotentResponse(key);
  if (cachedResponse !== null) {
    debug(`Idempotency cache hit for key: ${key}`);
    return cachedResponse;
  }

  // Execute the operation
  const response = await operation();

  // Cache the response
  setIdempotentResponse(key, response, ttlSeconds);

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
