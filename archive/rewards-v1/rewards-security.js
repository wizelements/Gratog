/**
 * Rewards System Security Module
 * 
 * Provides:
 * - Request authentication and authorization
 * - Input validation schemas
 * - CSRF protection
 * - Rate limiting
 * - Secure code generation
 */

import { z } from 'zod';
import { randomBytes, randomUUID } from 'crypto';
import { verifyToken } from '@/lib/auth/jwt';

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

export const EmailSchema = z.string()
  .email('Invalid email format')
  .toLowerCase()
  .refine(
    (email) => email.length <= 255,
    'Email too long'
  )
  .refine(
    (email) => !email.includes('\n') && !email.includes('\r'),
    'Invalid email format'
  );

export const MarketNameSchema = z.string()
  .min(1, 'Market name required')
  .max(100, 'Market name too long')
  .trim()
  .refine(
    (name) => /^[a-zA-Z0-9\s\-&,.'()]+$/.test(name),
    'Invalid market name format - only alphanumeric, spaces, and basic punctuation allowed'
  );

export const ActivityTypeSchema = z.enum([
  'visit',
  'purchase',
  'challenge_complete',
  'referral',
  'review'
]);

const PassportObjectIdRegex = /^[a-f0-9]{24}$/i;
const PassportUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PassportIdSchema = z.string()
  .trim()
  .refine(
    (value) => PassportObjectIdRegex.test(value) || PassportUuidRegex.test(value),
    'Invalid passport ID format'
  );

const SafeNameSchema = z.string()
  .max(255, 'Name too long')
  .optional()
  .refine(
    (name) => !name || !/[<>'"]/g.test(name),
    'Name contains invalid characters'
  );

// Stamp request validation
export const StampRequestSchema = z.object({
  email: EmailSchema.optional(),
  passportId: PassportIdSchema.optional(),
  marketName: MarketNameSchema,
  activityType: ActivityTypeSchema.default('visit'),
  idempotencyKey: z.string().uuid().optional()
}).refine(
  (data) => data.email || data.passportId,
  { 
    message: 'Either email or passportId is required',
    path: ['email']
  }
);

// Passport creation validation
export const PassportCreateSchema = z.object({
  email: EmailSchema.optional(),
  customerEmail: EmailSchema.optional(),
  name: SafeNameSchema,
  customerName: SafeNameSchema,
  idempotencyKey: z.string().uuid().optional()
}).refine(
  (data) => data.email || data.customerEmail,
  {
    message: 'Email is required',
    path: ['email']
  }
).transform((data) => ({
  email: data.email || data.customerEmail,
  name: data.name || data.customerName,
  idempotencyKey: data.idempotencyKey
}));

// Voucher redemption validation
export const VoucherRedeemSchema = z.object({
  voucherId: z.string().uuid('Invalid voucher ID'),
  orderId: z.string().optional()
});

// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================

/**
 * Verify request is authenticated and user is authorized
 * @param {Request} request - Next.js request object
 * @param {object} options - { requireUserId: boolean, allowPublic: boolean }
 * @returns {Promise<{authenticated: boolean, userId?: string, error?: string}>}
 */
export async function verifyRequestAuthentication(request, options = {}) {
  const { requireUserId = true, allowPublic = false } = options;

  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;
    const masterKey = process.env.MASTER_API_KEY;

    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7)
        : authHeader;

      // Internal non-user principals
      if (masterKey && token === masterKey) {
        return {
          authenticated: true,
          userId: 'system',
          userEmail: 'system@local',
          authType: 'master_key'
        };
      }

      if (apiKey && token === apiKey) {
        return {
          authenticated: true,
          userId: 'admin',
          userEmail: 'admin@local',
          authType: 'admin_key'
        };
      }

      // User JWT in Authorization header
      const headerPayload = await verifyToken(token);
      if (headerPayload?.email) {
        const normalizedEmail = String(headerPayload.email).trim().toLowerCase();
        const derivedUserId =
          headerPayload.userId ||
          headerPayload.sub ||
          headerPayload.id ||
          normalizedEmail;

        if (!requireUserId || derivedUserId) {
          return {
            authenticated: true,
            userId: String(derivedUserId),
            userEmail: normalizedEmail,
            authType: 'jwt_header'
          };
        }
      }
    }

    // User JWT in auth cookie
    const cookies = request.headers.get('cookie') || '';
    const authTokenMatch = cookies.match(/(?:^|;\s*)auth_token=([^;]+)/);
    if (authTokenMatch) {
      try {
        const decodedToken = decodeURIComponent(authTokenMatch[1]);
        const cookiePayload = await verifyToken(decodedToken);

        if (cookiePayload?.email) {
          const normalizedEmail = String(cookiePayload.email).trim().toLowerCase();
          const derivedUserId =
            cookiePayload.userId ||
            cookiePayload.sub ||
            cookiePayload.id ||
            normalizedEmail;

          if (!requireUserId || derivedUserId) {
            return {
              authenticated: true,
              userId: String(derivedUserId),
              userEmail: normalizedEmail,
              authType: 'jwt_cookie'
            };
          }
        }
      } catch {
        // Invalid cookie value
      }
    }

    if (allowPublic) {
      return { authenticated: false };
    }
    
    return {
      authenticated: false,
      error: 'Unauthorized',
      statusCode: 401
    };
  } catch (error) {
    console.error('Authentication verification error:', error);
    return {
      authenticated: false,
      error: 'Authentication verification failed',
      statusCode: 500
    };
  }
}

/**
 * Verify user is authorized to access/modify a specific passport
 * @param {string} userEmail - Authenticated user email
 * @param {string} passportEmail - Email of passport owner
 * @returns {boolean}
 */
export function authorizePassportAccess(userEmail, passportEmail) {
  const normalizedUserEmail = String(userEmail || '').trim().toLowerCase();
  const normalizedPassportEmail = String(passportEmail || '').trim().toLowerCase();

  // User can only access their own passport
  return normalizedUserEmail.length > 0 && normalizedUserEmail === normalizedPassportEmail;
}

// ============================================================================
// SECURE CODE GENERATION
// ============================================================================

/**
 * Generate cryptographically secure voucher code
 * @param {string} prefix - Code prefix (e.g., 'SHOT2OZ')
 * @returns {string} Secure voucher code
 */
export function generateSecureVoucherCode(prefix = 'VOUCHER') {
  // Generate 8 random bytes (16 hex characters)
  const random = randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}_${random}`;
}

/**
 * Generate random password/secret
 * @param {number} length - Length in bytes
 * @returns {string} Secure random string (hex)
 */
export function generateSecureSecret(length = 32) {
  return randomBytes(length).toString('hex');
}

/**
 * Generate UUID
 * @returns {string} UUID v4
 */
export function generateIdempotencyKey() {
  return randomUUID();
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================

const csrfTokenMap = new Map();
const CSRF_TOKEN_EXPIRY = 1800000; // 30 minutes
const MAX_CSRF_TOKENS = 100; // MEMORY FIX: Limit to 100 active tokens

/**
 * Resolve a stable CSRF session key from the authenticated principal or request context.
 * @param {Request} request
 * @param {{authenticated?: boolean, userId?: string, userEmail?: string}|null} auth
 * @returns {string}
 */
export function resolveCsrfSessionId(request, auth = null) {
  const principal = auth?.authenticated
    ? String(auth.userId || auth.userEmail || '').trim()
    : '';
  if (principal) {
    return principal.substring(0, 64);
  }

  const cookies = request.headers.get('cookie') || '';
  const authTokenMatch = cookies.match(/(?:^|;\s*)auth_token=([^;]+)/);
  if (authTokenMatch) {
    try {
      return decodeURIComponent(authTokenMatch[1]).substring(0, 64);
    } catch {
      // Ignore malformed cookie values.
    }
  }

  const sessionTokenMatch = cookies.match(/(?:^|;\s*)(?:next-auth\.session-token|customer_email)=([^;]+)/);
  if (sessionTokenMatch) {
    try {
      return decodeURIComponent(sessionTokenMatch[1]).substring(0, 64);
    } catch {
      // Ignore malformed cookie values.
    }
  }

  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (forwardedIp || request.headers.get('x-real-ip') || 'anonymous').substring(0, 64);
}

/**
 * Generate CSRF token
 * @param {string} sessionId - User session ID
 * @returns {string} CSRF token
 */
export function generateCsrfToken(sessionId) {
  const token = randomBytes(32).toString('hex');
  
  // MEMORY FIX: Check size limit before adding
  if (csrfTokenMap.size >= MAX_CSRF_TOKENS) {
    // Remove oldest token
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, value] of csrfTokenMap.entries()) {
      if (value.createdAt < oldestTime) {
        oldestTime = value.createdAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      csrfTokenMap.delete(oldestKey);
    }
  }
  
  csrfTokenMap.set(token, {
    sessionId,
    createdAt: Date.now(),
    used: false
  });
  
  // Clean up expired tokens (keep expiry check too)
  for (const [key, value] of csrfTokenMap.entries()) {
    if (Date.now() - value.createdAt > CSRF_TOKEN_EXPIRY) {
      csrfTokenMap.delete(key);
    }
  }
  
  return token;
}

/**
 * Verify CSRF token
 * @param {string} token - CSRF token to verify
 * @param {string} sessionId - User session ID
 * @returns {boolean}
 */
export function verifyCsrfToken(token, sessionId) {
  const record = csrfTokenMap.get(token);
  
  if (!record) return false;
  if (record.used) return false;
  if (Date.now() - record.createdAt > CSRF_TOKEN_EXPIRY) return false;
  if (record.sessionId !== sessionId) return false;
  
  // Mark as used (one-time token)
  record.used = true;
  
  return true;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

const stampRateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 3600000; // 1 hour
const MAX_STAMPS_PER_HOUR = 10;
const MAX_STAMPS_PER_MARKET_PER_HOUR = 2;
const MAX_RATE_LIMIT_ENTRIES = 200; // MEMORY FIX: Limit total entries

/**
 * Check rate limit for stamp request
 * @param {string} email - User email
 * @param {string} market - Market name
 * @returns {{allowed: boolean, remainingToday?: number, resetTime?: number}}
 */
export function checkStampRateLimit(email, market) {
  const key = `${email}:${market}`;
  const now = Date.now();
  
  // MEMORY FIX: Check size limit before adding new entries
  if (stampRateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
    // Remove oldest entries (clean up expired ones first, then oldest)
    const keysToDelete = [];
    for (const [k, timestamps] of stampRateLimitMap.entries()) {
      if (!Array.isArray(timestamps) || timestamps.length === 0) {
        keysToDelete.push(k);
      } else {
        // If all entries in this bucket are expired, mark for deletion
        const recentTs = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
        if (recentTs.length === 0) {
          keysToDelete.push(k);
        }
      }
    }
    
    // Delete marked keys
    keysToDelete.forEach(k => stampRateLimitMap.delete(k));
    
    // If still over limit, remove oldest by bucket (this is a fallback)
    if (stampRateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      const firstKey = stampRateLimitMap.keys().next().value;
      if (firstKey) stampRateLimitMap.delete(firstKey);
    }
  }
  
  if (!stampRateLimitMap.has(key)) {
    stampRateLimitMap.set(key, []);
  }
  
  const timestamps = stampRateLimitMap.get(key);
  
  // Remove old entries outside the window
  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  
  // Check global limit (per hour)
  const globalKey = `${email}:global`;
  if (!stampRateLimitMap.has(globalKey)) {
    stampRateLimitMap.set(globalKey, []);
  }
  const globalTimestamps = stampRateLimitMap.get(globalKey)
    .filter(ts => now - ts < RATE_LIMIT_WINDOW);
  
  if (globalTimestamps.length >= MAX_STAMPS_PER_HOUR) {
    const oldestTimestamp = Math.min(...globalTimestamps);
    const resetTime = oldestTimestamp + RATE_LIMIT_WINDOW;
    
    return {
      allowed: false,
      error: 'Rate limit exceeded',
      resetTime
    };
  }
  
  // Check market-specific limit
  if (recentTimestamps.length >= MAX_STAMPS_PER_MARKET_PER_HOUR) {
    const oldestTimestamp = Math.min(...recentTimestamps);
    const resetTime = oldestTimestamp + RATE_LIMIT_WINDOW;
    
    return {
      allowed: false,
      error: `Too many stamps at ${market} this hour`,
      resetTime
    };
  }
  
  // Record this stamp
  recentTimestamps.push(now);
  stampRateLimitMap.set(key, recentTimestamps);
  globalTimestamps.push(now);
  stampRateLimitMap.set(globalKey, globalTimestamps);
  
  return {
    allowed: true,
    remainingToday: MAX_STAMPS_PER_HOUR - globalTimestamps.length
  };
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize string input (remove/escape dangerous characters)
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Remove potential HTML/script tags
    .replace(/<[^>]*>/g, '')
    // Remove null bytes
    .replace(/\0/g, '');
}

/**
 * Validate and sanitize email
 * @param {string} email - Email to validate
 * @returns {{valid: boolean, email?: string, error?: string}}
 */
export function validateEmail(email) {
  try {
    const validated = EmailSchema.parse(email);
    return { valid: true, email: validated };
  } catch (error) {
    return {
      valid: false,
      error: error.errors?.[0]?.message || 'Invalid email'
    };
  }
}

// ============================================================================
// RESPONSE SECURITY
// ============================================================================

/**
 * Create secure response with proper headers
 * @param {any} data - Response data
 * @param {number} status - HTTP status code
 * @returns {Response} NextResponse-compatible response
 */
export function createSecureResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000',
      'Content-Security-Policy': "default-src 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

/**
 * Create error response without exposing internals
 * @param {string} userMessage - Message to show user
 * @param {number} status - HTTP status code
 * @param {Error} internalError - Internal error for logging (not exposed)
 * @returns {Response} Error response
 */
export function createErrorResponse(userMessage, status = 400, internalError = null) {
  if (internalError) {
    console.error('API Error:', {
      message: internalError.message,
      stack: internalError.stack,
      status
    });
  }
  
  return createSecureResponse(
    {
      success: false,
      error: userMessage
    },
    status
  );
}

// ============================================================================
// VALIDATION HELPER
// ============================================================================

/**
 * Validate request body against schema
 * @param {any} body - Request body
 * @param {z.ZodSchema} schema - Zod schema for validation
 * @returns {{valid: boolean, data?: any, error?: any}}
 */
export function validateRequest(body, schema) {
  try {
    const result = schema.safeParse(body);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    
    return {
      valid: false,
      error: {
        message: 'Validation failed',
        details: result.error.flatten()
      }
    };
  } catch (error) {
    return {
      valid: false,
      error: { message: 'Validation error', details: error.message }
    };
  }
}

const rewardsSecurity = {
  // Schemas
  EmailSchema,
  MarketNameSchema,
  ActivityTypeSchema,
  PassportIdSchema,
  StampRequestSchema,
  PassportCreateSchema,
  VoucherRedeemSchema,
  
  // Auth
  verifyRequestAuthentication,
  authorizePassportAccess,
  
  // Code generation
  generateSecureVoucherCode,
  generateSecureSecret,
  generateIdempotencyKey,
  
  // CSRF
  resolveCsrfSessionId,
  generateCsrfToken,
  verifyCsrfToken,
  
  // Rate limiting
  checkStampRateLimit,
  
  // Sanitization
  sanitizeString,
  validateEmail,
  
  // Response
  createSecureResponse,
  createErrorResponse,
  validateRequest
};

export default rewardsSecurity;
