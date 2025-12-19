import { verifyToken } from './jwt';
import { NextResponse } from 'next/server';

/**
 * Auth middleware for API routes
 * Usage: const user = await requireAuth(request);
 */
export async function requireAuth(request) {
  try {
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth_token')?.value;

    if (!token) {
      throw new Error('No authentication token');
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      throw new Error('Invalid or expired token');
    }

    return payload;
  } catch (error) {
    throw new Error('Authentication required');
  }
}

/**
 * Optional auth - returns user if authenticated, null otherwise
 */
export async function optionalAuth(request) {
  try {
    return await requireAuth(request);
  } catch (error) {
    return null;
  }
}

/**
 * Verify authentication and return user ID
 * Returns null if not authenticated
 */
export async function verifyAuth(request) {
  try {
    const payload = await requireAuth(request);
    return payload?.userId || payload?.sub || payload?.id || null;
  } catch (error) {
    return null;
  }
}
