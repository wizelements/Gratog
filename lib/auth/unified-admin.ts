/**
 * Unified Admin Authentication System
 * 
 * This is the SINGLE SOURCE OF TRUTH for admin authentication.
 * All admin authentication must use these helpers.
 * 
 * Features:
 * - JWT with jose (Edge-compatible)
 * - Secret enforcement in production
 * - Token rotation
 * - Secure cookie handling
 * - RBAC integration
 * - Comprehensive audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const IS_BUILD_TIME = process.env.NEXT_PHASE === 'phase-production-build';

// Token settings
const TOKEN_EXPIRY = '7d';
const TOKEN_ROTATION_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 1 day
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

// Rate limiting (requests per window)
const RATE_LIMITS = {
  login: { max: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  refresh: { max: 30, windowMs: 60 * 1000 }, // 30 per min
  general: { max: 100, windowMs: 60 * 1000 }, // 100 per min
};

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// ============================================================================
// TYPES
// ============================================================================

export interface AdminSession {
  id: string;
  email: string;
  role: string;
  name?: string;
  iat?: number;
  exp?: number;
}

export interface AdminUser {
  _id?: string;
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  passwordHash?: string;
  lastLogin?: Date;
  createdAt?: Date;
}

export class AdminAuthError extends Error {
  statusCode: number;
  code: string;
  
  constructor(message: string, statusCode: number = 401, code: string = 'AUTH_ERROR') {
    super(message);
    this.name = 'AdminAuthError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// ============================================================================
// JWT SECRET MANAGEMENT
// ============================================================================

const textEncoder = new TextEncoder();

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  
  // Build-time placeholder
  if (IS_BUILD_TIME) {
    return textEncoder.encode('build-time-placeholder-do-not-use');
  }
  
  // Production enforcement
  if (IS_PRODUCTION) {
    if (!secret) {
      throw new AdminAuthError(
        'JWT_SECRET environment variable is required in production',
        500,
        'MISSING_SECRET'
      );
    }
    
    if (secret.length < 32) {
      throw new AdminAuthError(
        'JWT_SECRET must be at least 32 characters in production',
        500,
        'WEAK_SECRET'
      );
    }
    
    // Check for common weak secrets
    const weakSecrets = [
      'secret', 'password', 'admin', '123456', 'changeme',
      'dev-only', 'development', 'test', 'example'
    ];
    
    if (weakSecrets.some(w => secret.toLowerCase().includes(w))) {
      throw new AdminAuthError(
        'JWT_SECRET contains weak/common values',
        500,
        'WEAK_SECRET'
      );
    }
  }
  
  // Development fallback (warn but allow)
  if (!secret) {
    console.warn('⚠️  JWT_SECRET not set - using insecure development secret');
    return textEncoder.encode('dev-only-insecure-secret-do-not-use-in-production');
  }
  
  if (secret.length < 32 && !IS_PRODUCTION) {
    console.warn('⚠️  JWT_SECRET should be at least 32 characters');
  }
  
  return textEncoder.encode(secret);
}

// ============================================================================
// TOKEN OPERATIONS
// ============================================================================

/**
 * Generate a new admin JWT token
 */
export async function generateAdminToken(admin: {
  id: string;
  email: string;
  role: string;
  name?: string;
}): Promise<string> {
  const secretKey = getJwtSecret();
  
  const token = await new SignJWT({
    id: admin.id,
    email: admin.email,
    role: admin.role,
    name: admin.name,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secretKey);
  
  return token;
}

/**
 * Verify an admin JWT token
 */
export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const secretKey = getJwtSecret();
    const { payload } = await jwtVerify(token, secretKey);
    
    // Validate required fields
    if (!payload.id || !payload.email || !payload.role) {
      logger.warn('AUTH', 'Token missing required fields');
      return null;
    }
    
    // Validate role
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      logger.warn('AUTH', 'Token has invalid role', { role: payload.role });
      return null;
    }
    
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as string,
      name: payload.name as string | undefined,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.debug('AUTH', 'Token verification failed', { error: error.message });
    }
    return null;
  }
}

/**
 * Check if token should be rotated (older than threshold)
 */
export function shouldRotateToken(session: AdminSession): boolean {
  if (!session.iat) return false;
  
  const issuedAt = session.iat * 1000;
  const age = Date.now() - issuedAt;
  
  return age > TOKEN_ROTATION_THRESHOLD_MS;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Extract admin session from request
 * Primary method for checking authentication
 */
export async function getAdminSession(request: NextRequest): Promise<AdminSession | null> {
  const token = extractTokenFromRequest(request);
  
  if (!token) {
    return null;
  }
  
  const session = await verifyAdminToken(token);
  
  if (!session) {
    return null;
  }
  
  // Additional validation: check if admin still exists and is active
  try {
    const { db } = await connectToDatabase();
    const admin = await db.collection('admin_users').findOne(
      { id: session.id },
      { projection: { isActive: 1, role: 1 } }
    );
    
    if (!admin || admin.isActive === false) {
      logger.warn('AUTH', 'Session valid but admin inactive or deleted', {
        adminId: session.id,
      });
      return null;
    }
    
    // Update session with current role from DB
    session.role = admin.role;
    
  } catch (error) {
    // Database error - don't fail auth, but log
    logger.error('AUTH', 'Failed to verify admin in database', error);
  }
  
  return session;
}

/**
 * Require admin session - throws if not authenticated
 */
export async function requireAdminSession(request: NextRequest): Promise<AdminSession> {
  const session = await getAdminSession(request);
  
  if (!session) {
    throw new AdminAuthError(
      'Unauthorized - Admin access required',
      401,
      'UNAUTHORIZED'
    );
  }
  
  return session;
}

/**
 * Extract token from request (cookie or header)
 */
function extractTokenFromRequest(request: NextRequest): string | null {
  // Check cookie first
  const cookieToken = request.cookies.get('admin_token')?.value;
  if (cookieToken) {
    return cookieToken;
  }
  
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

// ============================================================================
// COOKIE MANAGEMENT
// ============================================================================

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge: number;
}

export const ADMIN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'strict',
  path: '/',
  maxAge: COOKIE_MAX_AGE,
};

/**
 * Set admin token cookie on response
 */
export function setAdminCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set('admin_token', token, ADMIN_COOKIE_OPTIONS);
  return response;
}

/**
 * Clear admin token cookie
 */
export function clearAdminCookie(response: NextResponse): NextResponse {
  response.cookies.set('admin_token', '', {
    ...ADMIN_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}

/**
 * Set CSRF token cookie
 */
export function setCsrfCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set('admin_csrf', token, {
    ...ADMIN_COOKIE_OPTIONS,
    httpOnly: false, // CSRF token must be readable by JS
  });
  return response;
}

/**
 * Generate a random CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }
  
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  
  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

export function getLoginRateLimitKey(ip: string): string {
  return `login:${ip}`;
}

export function getGeneralRateLimitKey(ip: string, path: string): string {
  return `general:${ip}:${path}`;
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================

/**
 * Validate CSRF token from request
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const csrfHeader = request.headers.get('x-csrf-token');
  const csrfCookie = request.cookies.get('admin_csrf')?.value;
  
  if (!csrfHeader || !csrfCookie) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(csrfHeader, csrfCookie);
  } catch {
    return false;
  }
}

/**
 * Constant-time string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do comparison to maintain constant time
    const dummy = '0'.repeat(b.length);
    let result = 0;
    for (let i = 0; i < dummy.length; i++) {
      result |= dummy.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0 && false; // Always false due to length mismatch
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================================
// PASSWORD UTILITIES
// ============================================================================

/**
 * Hash a password using bcrypt (browser-compatible)
 * Note: In production, this should use Node.js crypto or a proper bcrypt implementation
 */
export async function hashPassword(password: string): Promise<string> {
  // For browser/Edge compatibility, we'll use a simple hash
  // In production, use a proper bcrypt implementation on the server
  const encoder = new TextEncoder();
  const data = encoder.encode(password + getJwtSecret().slice(0, 32));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  return timingSafeEqual(computedHash, hash);
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

export function createAuthErrorResponse(error: AdminAuthError): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: error.message,
      code: error.code,
    },
    { status: error.statusCode }
  );
}

export function createSuccessResponse<T>(data: T, meta?: Record<string, unknown>): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta }),
  });
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Find admin by email
 */
export async function findAdminByEmail(email: string): Promise<AdminUser | null> {
  const { db } = await connectToDatabase();
  
  const admin = await db.collection('admin_users').findOne({
    email: email.toLowerCase(),
  });
  
  if (!admin) {
    return null;
  }
  
  return {
    _id: admin._id.toString(),
    id: admin.id || admin._id.toString(),
    email: admin.email,
    name: admin.name,
    role: admin.role,
    isActive: admin.isActive !== false,
    passwordHash: admin.passwordHash,
    lastLogin: admin.lastLogin,
    createdAt: admin.createdAt,
  };
}

/**
 * Update admin last login
 */
export async function updateAdminLastLogin(adminId: string): Promise<void> {
  const { db } = await connectToDatabase();
  
  await db.collection('admin_users').updateOne(
    { id: adminId },
    { $set: { lastLogin: new Date() } }
  );
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export interface AuditLogEntry {
  timestamp: Date;
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
}

export async function logAdminAction(
  admin: AdminSession,
  action: string,
  resource: string,
  details: Record<string, unknown>,
  request: NextRequest,
  success: boolean = true
): Promise<void> {
  const entry: AuditLogEntry = {
    timestamp: new Date(),
    adminId: admin.id,
    adminEmail: admin.email,
    action,
    resource,
    details: sanitizeForLogging(details),
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    success,
  };
  
  logger.info('AUDIT', `${admin.email}: ${action} on ${resource}`, {
    success,
    ip: entry.ipAddress,
  });
  
  // Persist async
  try {
    const { db } = await connectToDatabase();
    await db.collection('audit_logs').insertOne(entry);
  } catch (error) {
    logger.error('AUDIT', 'Failed to persist audit log', error);
  }
}

function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'csrf'];
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(s => lowerKey.includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}
