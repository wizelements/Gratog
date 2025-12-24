/**
 * Unified Admin Session Management
 * 
 * This is the SINGLE SOURCE OF TRUTH for admin authentication.
 * All admin API routes and middleware should use these helpers.
 * 
 * SECURITY: Never use client-side checks as the sole protection.
 * Always validate on the server using these helpers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

// Standardized admin token payload shape
export interface AdminTokenPayload {
  id: string;
  email: string;
  role: 'admin';
  name?: string;
  iat?: number;
  exp?: number;
}

export interface AdminSession {
  id: string;
  email: string;
  role: 'admin';
  name?: string;
}

// MEMORY FIX: Reuse TextEncoder instance instead of creating new one every time
const textEncoder = new TextEncoder();

// Get JWT secret as Uint8Array for jose library
function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
    if (isProd) {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    // Development fallback - NEVER use in production
    console.warn('⚠️ Using insecure development JWT secret');
    return textEncoder.encode('dev-only-insecure-secret-do-not-use-in-production');
  }
  
  // Warn if secret is too short
  if (secret.length < 32) {
    console.warn('⚠️ JWT_SECRET should be at least 32 characters for security');
  }
  
  return textEncoder.encode(secret);
}

/**
 * Verify admin token and return payload
 * Uses jose library for Edge Runtime compatibility
 */
export async function verifyAdminToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    
    // SECURITY: Must have admin role
    if (payload.role !== 'admin') {
      return null;
    }
    
    // Support both 'id' and 'userId' for backward compatibility
    const id = (payload.id || payload.userId) as string;
    if (!id) {
      return null;
    }
    
    return {
      id,
      email: payload.email as string,
      role: 'admin',
      name: payload.name as string | undefined,
    };
  } catch (error) {
    return null;
  }
}

// Token configuration
const TOKEN_EXPIRY = '7d';
const TOKEN_ROTATION_THRESHOLD_MS = 24 * 60 * 60 * 1000; // Rotate if more than 1 day old

/**
 * Generate admin JWT token with standardized payload
 */
export async function generateAdminToken(admin: {
  id: string;
  email: string;
  name?: string;
}): Promise<string> {
  const secretKey = getJwtSecretKey();
  
  const token = await new SignJWT({
    id: admin.id,
    email: admin.email,
    role: 'admin',
    name: admin.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secretKey);
  
  return token;
}

/**
 * Check if token should be rotated (more than 1 day old)
 */
export function shouldRotateToken(payload: AdminTokenPayload): boolean {
  if (!payload.iat) return false;
  
  const issuedAt = payload.iat * 1000; // Convert to milliseconds
  const age = Date.now() - issuedAt;
  
  return age > TOKEN_ROTATION_THRESHOLD_MS;
}

/**
 * Refresh token if it's getting old but not yet expired
 * This provides sliding window expiration for active users
 */
export async function refreshTokenIfNeeded(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const token = getAdminTokenFromRequest(request);
  if (!token) return response;
  
  const payload = await verifyAdminToken(token);
  if (!payload) return response;
  
  if (shouldRotateToken(payload)) {
    const newToken = await generateAdminToken({
      id: payload.id,
      email: payload.email,
      name: payload.name,
    });
    
    // Set new token in response
    return setAdminCookie(response, newToken);
  }
  
  return response;
}

/**
 * Extract admin token from request cookies
 */
function getAdminTokenFromRequest(request: NextRequest | Request): string | null {
  if ('cookies' in request && typeof request.cookies.get === 'function') {
    return (request as NextRequest).cookies.get('admin_token')?.value || null;
  }
  
  // Fallback for standard Request object
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/admin_token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Get admin session from request (returns null if not authenticated)
 * Use this for optional auth checks
 */
export async function getAdminSession(request: NextRequest | Request): Promise<AdminSession | null> {
  const token = getAdminTokenFromRequest(request);
  if (!token) {
    return null;
  }
  
  const payload = await verifyAdminToken(token);
  if (!payload) {
    return null;
  }
  
  return {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    name: payload.name,
  };
}

/**
 * Require admin authentication - throws if not authenticated
 * Use this for mandatory auth checks in API routes
 * 
 * @example
 * export async function GET(request: NextRequest) {
 *   const admin = await requireAdmin(request);
 *   // admin is guaranteed to be valid here
 * }
 */
export async function requireAdmin(request: NextRequest | Request): Promise<AdminSession> {
  const session = await getAdminSession(request);
  
  if (!session) {
    throw new AdminAuthError('Unauthorized - Admin access required', 401);
  }
  
  return session;
}

/**
 * Custom error class for admin authentication failures
 */
export class AdminAuthError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AdminAuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Create unauthorized response for API routes
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}

/**
 * Create forbidden response for API routes
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

/**
 * Higher-order function to wrap API route handlers with admin auth
 * 
 * @example
 * export const GET = withAdminAuth(async (request, admin) => {
 *   // admin is guaranteed to be valid
 *   return NextResponse.json({ data: 'protected' });
 * });
 */
export function withAdminAuth<T extends NextRequest>(
  handler: (request: T, admin: AdminSession) => Promise<NextResponse>
): (request: T) => Promise<NextResponse> {
  return async (request: T): Promise<NextResponse> => {
    try {
      const admin = await requireAdmin(request);
      return await handler(request, admin);
    } catch (error) {
      if (error instanceof AdminAuthError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.statusCode }
        );
      }
      throw error;
    }
  };
}

/**
 * Set admin token cookie on response
 */
export function setAdminCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}

/**
 * Clear admin token cookie on response
 */
export function clearAdminCookie(response: NextResponse): NextResponse {
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
