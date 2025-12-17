const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

import { NextRequest } from 'next/server';

/**
 * Simple authentication utilities for admin endpoints
 * In production, replace with proper JWT validation, OAuth, or similar
 */

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
}

export function isAuthorized(request: NextRequest, requiredRole?: string): boolean {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return false;
  }
  
  // Simple API key validation
  const apiKey = process.env.ADMIN_API_KEY;
  const masterKey = process.env.MASTER_API_KEY;
  
  if (!apiKey && !masterKey) {
    throw new Error('ADMIN_API_KEY or MASTER_API_KEY environment variable is required');
  }
  
  // Check for Bearer token or direct API key
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7)
    : authHeader;
  
  // Master key has all permissions
  if (masterKey && token === masterKey) {
    return true;
  }
  
  // Regular admin key
  if (token === apiKey) {
    return !requiredRole || requiredRole === 'admin';
  }
  
  // In production, add JWT validation here
  // const user = validateJWT(token);
  // return user && (!requiredRole || user.roles.includes(requiredRole));
  
  return false;
}

export function extractUser(request: NextRequest): AuthUser | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }
  
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7)
    : authHeader;
  
  const apiKey = process.env.ADMIN_API_KEY;
  const masterKey = process.env.MASTER_API_KEY;
  
  if (!apiKey && !masterKey) {
    throw new Error('ADMIN_API_KEY or MASTER_API_KEY environment variable is required');
  }
  
  if (masterKey && token === masterKey) {
    return {
      id: 'master',
      email: 'master@system.local',
      roles: ['master', 'admin']
    };
  }
  
  if (token === apiKey) {
    return {
      id: 'admin',
      email: 'admin@system.local',
      roles: ['admin']
    };
  }
  
  // In production, decode and validate JWT here
  
  return null;
}

export function createAuthHeaders(user: AuthUser) {
  return {
    'X-User-ID': user.id,
    'X-User-Email': user.email,
    'X-User-Roles': user.roles.join(',')
  };
}

/**
 * Rate limiting for authenticated requests
 */
export function getAuthRateLimit(user: AuthUser): { limit: number; window: number } {
  if (user.roles.includes('master')) {
    return { limit: 1000, window: 60 }; // 1000/min for master
  } else if (user.roles.includes('admin')) {
    return { limit: 500, window: 60 }; // 500/min for admin
  } else {
    return { limit: 100, window: 60 }; // 100/min for regular users
  }
}

/**
 * Audit logging for admin actions
 */
export function logAdminAction(user: AuthUser, action: string, details: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    user_id: user.id,
    user_email: user.email,
    action,
    details,
    ip: 'unknown', // Would extract from request in real implementation
    user_agent: 'unknown'
  };
  
  // In production, send to proper logging service
  debug('[ADMIN_ACTION]', JSON.stringify(logEntry));
  
  // Could also store in database for audit trail
  // await database.collection('audit_log').insertOne(logEntry);
}
