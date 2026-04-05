/**
 * Unified Security Module
 * 
 * Centralized security utilities for the admin system:
 * - RBAC (Role-Based Access Control)
 * - Audit logging
 * - Rate limiting
 * - Input validation helpers
 * - Security utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

// Re-export from unified auth
export { 
  getAdminSession, 
  requireAdminSession,
  type AdminSession,
  type AdminUser,
  AdminAuthError,
} from '@/lib/auth/unified-admin';

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY: Role[] = [ROLES.VIEWER, ROLES.EDITOR, ROLES.ADMIN, ROLES.SUPER_ADMIN];

// Permission definitions
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard:view',
  
  // Products
  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',
  PRODUCTS_SYNC: 'products:sync',
  
  // Inventory
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_ADJUST: 'inventory:adjust',
  
  // Orders
  ORDERS_VIEW: 'orders:view',
  ORDERS_UPDATE_STATUS: 'orders:update_status',
  ORDERS_REFUND: 'orders:refund',
  
  // Customers
  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_EXPORT: 'customers:export',
  
  // Campaigns
  CAMPAIGNS_VIEW: 'campaigns:view',
  CAMPAIGNS_CREATE: 'campaigns:create',
  CAMPAIGNS_SEND: 'campaigns:send',
  CAMPAIGNS_DELETE: 'campaigns:delete',
  
  // Reviews
  REVIEWS_VIEW: 'reviews:view',
  REVIEWS_MODERATE: 'reviews:moderate',
  
  // Coupons
  COUPONS_VIEW: 'coupons:view',
  COUPONS_CREATE: 'coupons:create',
  COUPONS_DELETE: 'coupons:delete',
  
  // Analytics
  ANALYTICS_VIEW: 'analytics:view',
  
  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_UPDATE: 'settings:update',
  
  // Admin Management (Super Admin only)
  ADMINS_MANAGE: 'admins:manage',
  AUDIT_LOGS_VIEW: 'audit_logs:view',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role to permissions mapping
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.VIEWER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CAMPAIGNS_VIEW,
    PERMISSIONS.REVIEWS_VIEW,
    PERMISSIONS.COUPONS_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
  ],
  [ROLES.EDITOR]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.PRODUCTS_SYNC,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_UPDATE_STATUS,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CAMPAIGNS_VIEW,
    PERMISSIONS.CAMPAIGNS_CREATE,
    PERMISSIONS.REVIEWS_VIEW,
    PERMISSIONS.REVIEWS_MODERATE,
    PERMISSIONS.COUPONS_VIEW,
    PERMISSIONS.COUPONS_CREATE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.PRODUCTS_SYNC,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_UPDATE_STATUS,
    PERMISSIONS.ORDERS_REFUND,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_EXPORT,
    PERMISSIONS.CAMPAIGNS_VIEW,
    PERMISSIONS.CAMPAIGNS_CREATE,
    PERMISSIONS.CAMPAIGNS_SEND,
    PERMISSIONS.CAMPAIGNS_DELETE,
    PERMISSIONS.REVIEWS_VIEW,
    PERMISSIONS.REVIEWS_MODERATE,
    PERMISSIONS.COUPONS_VIEW,
    PERMISSIONS.COUPONS_CREATE,
    PERMISSIONS.COUPONS_DELETE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_UPDATE,
  ],
  [ROLES.SUPER_ADMIN]: [
    // Super Admin has all permissions
    ...Object.values(PERMISSIONS),
  ],
};

// ============================================================================
// RBAC FUNCTIONS
// ============================================================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if roleA has equal or higher rank than roleB
 */
export function hasEqualOrHigherRole(roleA: Role, roleB: Role): boolean {
  const indexA = ROLE_HIERARCHY.indexOf(roleA);
  const indexB = ROLE_HIERARCHY.indexOf(roleB);
  return indexA >= indexB;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Validate that a role string is valid
 */
export function isValidRole(role: string): role is Role {
  return Object.values(ROLES).includes(role as Role);
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export interface AuditLogEntry {
  id?: string;
  timestamp: Date;
  adminId: string;
  adminEmail: string;
  adminRole: Role;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Log an admin action to the audit log
 */
export async function logAdminAction(
  admin: { id: string; email: string; role: Role },
  action: string,
  resource: string,
  details: Record<string, unknown>,
  request: NextRequest,
  options: {
    resourceId?: string;
    success?: boolean;
    errorMessage?: string;
  } = {}
): Promise<void> {
  const { resourceId, success = true, errorMessage } = options;
  
  const entry: AuditLogEntry = {
    timestamp: new Date(),
    adminId: admin.id,
    adminEmail: admin.email,
    adminRole: admin.role,
    action,
    resource,
    resourceId,
    details: sanitizeForLogging(details),
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    success,
    errorMessage,
  };

  // Log to console immediately
  logger.info('AUDIT', `${admin.email} (${admin.role}): ${action} on ${resource}`, {
    resourceId,
    success,
    ip: entry.ipAddress,
  });

  // Persist to database (async, don't wait)
  try {
    const { db } = await connectToDatabase();
    await db.collection('audit_logs').insertOne(entry);
  } catch (error) {
    logger.error('AUDIT', 'Failed to persist audit log to MongoDB', error);
  }
}

/**
 * Retrieve audit logs with pagination and filtering
 */
export async function getAuditLogs(
  filters: {
    adminId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
  } = {},
  pagination: {
    page?: number;
    limit?: number;
  } = {}
): Promise<{ logs: AuditLogEntry[]; total: number; page: number; pages: number }> {
  const { page = 1, limit = 50 } = pagination;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (filters.adminId) query.adminId = filters.adminId;
  if (filters.action) query.action = filters.action;
  if (filters.resource) query.resource = filters.resource;
  if (filters.success !== undefined) query.success = filters.success;
  
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) (query.timestamp as Record<string, Date>).$gte = filters.startDate;
    if (filters.endDate) (query.timestamp as Record<string, Date>).$lte = filters.endDate;
  }

  try {
    const { db } = await connectToDatabase();
    
    const [logs, total] = await Promise.all([
      (db.collection('audit_logs') as any)
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('audit_logs').countDocuments(query),
    ]);

    return {
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error('AUDIT', 'Failed to retrieve audit logs', error);
    throw error;
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (e.g., IP + route)
 * @param maxRequests - Maximum requests allowed
 * @param windowSeconds - Time window in seconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetAt) {
    // New window or expired
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

/**
 * Get rate limit key for an admin request
 */
export function getRateLimitKey(request: NextRequest, action: string): string {
  const ip = getClientIp(request);
  return `admin:${action}:${ip}`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get client IP from request
 */
export function getClientIp(request: NextRequest): string {
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

/**
 * Sanitize data for logging (remove sensitive fields)
 */
function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'creditCard'];
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number,
  code?: string
): NextResponse {
  const isDev = process.env.NODE_ENV === 'development';
  
  const body: Record<string, unknown> = {
    success: false,
    error: message,
  };
  
  if (code) {
    body.code = code;
  }
  
  if (isDev) {
    body.stack = new Error().stack;
  }
  
  return NextResponse.json(body, { status });
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta }),
  });
}
