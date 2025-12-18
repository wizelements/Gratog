/**
 * Admin token verification for middleware
 * Uses 'jose' library for Edge Runtime compatibility
 * 
 * Note: jsonwebtoken is not compatible with Edge Runtime,
 * so we use jose for middleware verification
 */

import { jwtVerify, SignJWT } from 'jose';

interface AdminTokenPayload {
  id: string;
  email: string;
  role: string;
  name?: string;
  iat?: number;
  exp?: number;
}

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
    if (isProd) {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    return new TextEncoder().encode('dev-only-insecure-secret-do-not-use-in-production');
  }
  
  return new TextEncoder().encode(secret);
}

/**
 * Verify admin cookie token without database access
 * For use in middleware where we need fast, stateless verification
 * Edge Runtime compatible using jose library
 */
export async function verifyAdminCookieToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    
    if (payload.role !== 'admin') {
      return null;
    }
    
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as string,
      name: payload.name as string | undefined,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Synchronous version for non-async contexts
 * Uses base64 decoding only (no crypto verification)
 * Only use for quick checks, always verify properly for auth decisions
 */
export function decodeTokenPayload(token: string): AdminTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    
    if (payload.role !== 'admin') {
      return null;
    }
    
    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    
    return {
      id: payload.id || payload.userId,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a token is valid (without full verification)
 * Useful for quick checks before doing full verification
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(atob(parts[1]));
    
    if (!payload.exp) {
      return true;
    }
    
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
