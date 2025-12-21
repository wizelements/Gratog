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

export const PassportIdSchema = z.string()
  .uuid('Invalid passport ID format');

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
  email: EmailSchema,
  name: z.string()
    .max(255, 'Name too long')
    .optional()
    .refine(
      (name) => !name || !/[<>'"]/g.test(name),
      'Name contains invalid characters'
    ),
  idempotencyKey: z.string().uuid().optional()
});

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
    // Check for API key authentication
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;
    const masterKey = process.env.MASTER_API_KEY;
    
    // Check for user email header (set by middleware or client)
    const userEmail = request.headers.get('x-user-email');
    
    // API key authentication
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7)
        : authHeader;
      
      // Master key has all permissions
      if (masterKey && token === masterKey) {
        return {
          authenticated: true,
          userId: userEmail || 'system',
          userEmail: userEmail || 'system@local'
        };
      }
      
      // Regular admin key
      if (apiKey && token === apiKey) {
        return {
          authenticated: true,
          userId: userEmail || 'admin',
          userEmail: userEmail || 'admin@local'
        };
      }
    }
    
    // Check for cookie-based session (customer email stored in cookie)
    const cookies = request.headers.get('cookie') || '';
    const customerEmailMatch = cookies.match(/customer_email=([^;]+)/);
    if (customerEmailMatch) {
      try {
        const decodedEmail = decodeURIComponent(customerEmailMatch[1]);
        if (decodedEmail && decodedEmail.includes('@')) {
          return {
            authenticated: true,
            userId: decodedEmail,
            userEmail: decodedEmail
          };
        }
      } catch {
        // Invalid cookie value
      }
    }
    
    // Check for X-User-Email header (trusted internal requests)
    if (userEmail && userEmail.includes('@')) {
      return {
        authenticated: true,
        userId: userEmail,
        userEmail: userEmail
      };
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
  // User can only access their own passport
  return userEmail === passportEmail;
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

/**
 * Generate CSRF token
 * @param {string} sessionId - User session ID
 * @returns {string} CSRF token
 */
export function generateCsrfToken(sessionId) {
  const token = randomBytes(32).toString('hex');
  
  csrfTokenMap.set(token, {
    sessionId,
    createdAt: Date.now(),
    used: false
  });
  
  // Clean up expired tokens
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

/**
 * Check rate limit for stamp request
 * @param {string} email - User email
 * @param {string} market - Market name
 * @returns {{allowed: boolean, remainingToday?: number, resetTime?: number}}
 */
export function checkStampRateLimit(email, market) {
  const key = `${email}:${market}`;
  const now = Date.now();
  
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

export default {
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
