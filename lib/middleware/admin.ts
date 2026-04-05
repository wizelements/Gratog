/**
 * Unified Admin Middleware
 * 
 * Provides standardized protection for all admin API routes:
 * - Authentication
 * - Authorization (RBAC)
 * - Rate limiting
 * - CSRF protection
 * - Audit logging
 * - Error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, AdminSession } from '@/lib/admin-session';
import {
  ROLES,
  Permission,
  hasPermission,
  logAdminAction,
  checkRateLimit,
  getRateLimitKey,
  createErrorResponse,
  Role,
} from '@/lib/security';
import { logger } from '@/lib/logger';

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

interface MiddlewareConfig {
  // Required permission for this route (optional - defaults to just requiring auth)
  permission?: Permission;
  
  // Minimum role required (optional)
  minRole?: Role;
  
  // Rate limiting
  rateLimit?: {
    maxRequests: number;
    windowSeconds: number;
  };
  
  // CSRF protection (default true for mutations)
  csrf?: boolean;
  
  // Skip audit logging for this route (default false)
  skipAudit?: boolean;
  
  // Resource type for audit logging (e.g., 'products', 'orders')
  resource?: string;
  
  // Action type for audit logging (e.g., 'create', 'update', 'delete')
  action?: string;
}

// Default rate limits by HTTP method
const DEFAULT_RATE_LIMITS: Record<string, { maxRequests: number; windowSeconds: number }> = {
  GET: { maxRequests: 300, windowSeconds: 60 },
  POST: { maxRequests: 60, windowSeconds: 60 },
  PUT: { maxRequests: 60, windowSeconds: 60 },
  PATCH: { maxRequests: 60, windowSeconds: 60 },
  DELETE: { maxRequests: 30, windowSeconds: 60 },
};

// ============================================================================
// MAIN MIDDLEWARE FUNCTION
// ============================================================================

export interface AuthenticatedRequest extends NextRequest {
  admin: AdminSession;
}

/**
 * Apply admin middleware to a route handler
 * 
 * Usage:
 * export const GET = withAdminMiddleware(
 *   async (request) => { ... },
 *   { permission: PERMISSIONS.PRODUCTS_VIEW }
 * );
 */
export function withAdminMiddleware<T>(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  config: MiddlewareConfig = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let admin: AdminSession | null = null;
    
    try {
      // Step 1: Authentication
      admin = await getAdminSession(request);
      
      if (!admin) {
        return createErrorResponse('Unauthorized - Admin access required', 401, 'UNAUTHORIZED');
      }
      
      // Step 2: Authorization (role check)
      if (config.minRole) {
        const roleHierarchy = [ROLES.VIEWER, ROLES.EDITOR, ROLES.ADMIN, ROLES.SUPER_ADMIN];
        const userRoleIndex = roleHierarchy.indexOf(admin.role as Role);
        const requiredRoleIndex = roleHierarchy.indexOf(config.minRole);
        
        if (userRoleIndex < requiredRoleIndex) {
          await logAdminAction(
            { id: admin.id, email: admin.email, role: admin.role as Role },
            'ACCESS_DENIED',
            config.resource || 'unknown',
            { reason: 'insufficient_permissions', required: config.minRole },
            request,
            { success: false, errorMessage: `Requires ${config.minRole} role` }
          );
          
          return createErrorResponse('Forbidden - Insufficient permissions', 403, 'FORBIDDEN');
        }
      }
      
      // Step 3: Authorization (permission check)
      if (config.permission) {
        if (!hasPermission(admin.role as Role, config.permission)) {
          await logAdminAction(
            { id: admin.id, email: admin.email, role: admin.role as Role },
            'ACCESS_DENIED',
            config.resource || 'unknown',
            { reason: 'missing_permission', required: config.permission },
            request,
            { success: false, errorMessage: `Missing permission: ${config.permission}` }
          );
          
          return createErrorResponse('Forbidden - Missing permission', 403, 'FORBIDDEN');
        }
      }
      
      // Step 4: Rate limiting
      const rateLimit = config.rateLimit || DEFAULT_RATE_LIMITS[request.method] || { maxRequests: 60, windowSeconds: 60 };
      const rateLimitKey = getRateLimitKey(request, config.action || request.method);
      const rateLimitResult = checkRateLimit(rateLimitKey, rateLimit.maxRequests, rateLimit.windowSeconds);
      
      if (!rateLimitResult.allowed) {
        const response = createErrorResponse('Too many requests', 429, 'RATE_LIMITED');
        response.headers.set('Retry-After', String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)));
        response.headers.set('X-RateLimit-Limit', String(rateLimit.maxRequests));
        response.headers.set('X-RateLimit-Remaining', '0');
        response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimitResult.resetAt / 1000)));
        return response;
      }
      
      // Step 5: CSRF protection (for mutations)
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
      if (config.csrf !== false && isMutation) {
        const csrfHeader = request.headers.get('x-csrf-token');
        const csrfCookie = request.cookies.get('admin_csrf')?.value;
        
        if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
          logger.warn('SECURITY', 'CSRF validation failed', {
            admin: admin.email,
            path: request.url,
            hasHeader: !!csrfHeader,
            hasCookie: !!csrfCookie,
          });
          
          return createErrorResponse('Invalid CSRF token', 403, 'CSRF_INVALID');
        }
      }
      
      // Step 6: Attach admin to request and call handler
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.admin = admin;
      
      const response = await handler(authenticatedRequest);
      
      // Step 7: Audit logging (if enabled)
      if (!config.skipAudit && config.resource && config.action) {
        const duration = Date.now() - startTime;
        
        await logAdminAction(
          { id: admin.id, email: admin.email, role: admin.role as Role },
          config.action.toUpperCase(),
          config.resource,
          { method: request.method, duration },
          request,
          { success: true }
        );
      }
      
      // Add rate limit headers to successful response
      response.headers.set('X-RateLimit-Limit', String(rateLimit.maxRequests));
      response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimitResult.resetAt / 1000)));
      
      return response;
      
    } catch (error) {
      // Log error
      logger.error('ADMIN_MIDDLEWARE', 'Error in admin middleware', {
        error: error instanceof Error ? error.message : 'Unknown error',
        admin: admin?.email || 'unknown',
        path: request.url,
      });
      
      // If admin is authenticated, log the failure
      if (admin && config.resource && config.action) {
        await logAdminAction(
          { id: admin.id, email: admin.email, role: admin.role as Role },
          config.action.toUpperCase(),
          config.resource,
          { method: request.method, error: error instanceof Error ? error.message : 'Unknown' },
          request,
          { success: false, errorMessage: error instanceof Error ? error.message : 'Unknown error' }
        );
      }
      
      // Return sanitized error
      const isDev = process.env.NODE_ENV === 'development';
      return createErrorResponse(
        isDev ? (error instanceof Error ? error.message : 'Internal server error') : 'Internal server error',
        500,
        'INTERNAL_ERROR'
      );
    }
  };
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * Require authentication only (no specific permission)
 */
export function requireAuth<T>(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  config: Omit<MiddlewareConfig, 'permission' | 'minRole'> = {}
) {
  return withAdminMiddleware(handler, config);
}

/**
 * Require specific permission
 */
export function requirePermission<T>(
  permission: Permission,
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  config: Omit<MiddlewareConfig, 'permission'> = {}
) {
  return withAdminMiddleware(handler, { ...config, permission });
}

/**
 * Require minimum role
 */
export function requireMinRole<T>(
  minRole: Role,
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  config: Omit<MiddlewareConfig, 'minRole'> = {}
) {
  return withAdminMiddleware(handler, { ...config, minRole });
}

// ============================================================================
// LEGACY SUPPORT
// ============================================================================

/**
 * Legacy wrapper for routes that expect (request, context) signature
 * Used for dynamic routes with params
 */
export function withAdminMiddlewareLegacy<T>(
  handler: (request: AuthenticatedRequest, context: { params: Promise<Record<string, string>> }) => Promise<NextResponse>,
  config: MiddlewareConfig = {}
) {
  const wrapped = withAdminMiddleware(
    (req) => handler(req, { params: Promise.resolve({}) }),
    config
  );
  
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    // The middleware already attached admin, so we just call the handler
    return handler(authenticatedRequest, context);
  };
}
