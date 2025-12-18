/**
 * Admin Auth Middleware
 * 
 * Provides HOF-style middleware for wrapping API route handlers
 * and audit logging functionality.
 * 
 * Uses the unified admin-session module for authentication.
 */

import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

/**
 * Higher-order function to protect admin API routes
 * Verifies JWT token from admin_token cookie using unified session
 * 
 * @example
 * async function handleGet(request) { ... }
 * export const GET = requireAdminAuth(handleGet);
 */
export function requireAdminAuth(handler) {
  return async (request, context) => {
    try {
      // Use unified session verification
      const admin = await getAdminSession(request);
      
      if (!admin) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check if user has admin role (already checked in getAdminSession, but defense in depth)
      if (admin.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Attach admin to request for handler
      request.admin = admin;
      // Legacy support
      request.user = admin;

      // Call the actual handler
      return handler(request, context);
    } catch (error) {
      logger.error('AdminAuth', 'Admin auth middleware error', error);
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * Audit log admin actions - persists to MongoDB
 * 
 * @param {Object} admin - Admin user object
 * @param {string} action - Action performed
 * @param {Object} details - Additional details
 * @param {Request} request - Optional request object for IP/UA
 */
export async function logAdminAction(admin, action, details, request = null) {
  const logEntry = {
    timestamp: new Date(),
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    action,
    details,
    environment: process.env.NODE_ENV,
    ipAddress: request?.headers?.get('x-forwarded-for') || 
               request?.headers?.get('x-real-ip') || 
               'unknown',
    userAgent: request?.headers?.get('user-agent') || 'unknown'
  };

  // Always log to console
  logger.info('AdminAudit', `${admin.email} performed ${action}`, details);
  
  try {
    const { db } = await connectToDatabase();
    await db.collection('audit_log').insertOne(logEntry);
  } catch (error) {
    logger.error('AdminAuth', 'Failed to persist audit log to MongoDB', error);
  }
}

/**
 * Retrieve audit logs with pagination and filtering
 * 
 * @param {Object} filters - Filter options
 * @param {number} limit - Max results
 * @param {number} skip - Results to skip
 */
export async function getAuditLogs(filters = {}, limit = 50, skip = 0) {
  try {
    const { db } = await connectToDatabase();
    
    const query = {};
    
    if (filters.adminId) {
      query.adminId = filters.adminId;
    }
    
    if (filters.email) {
      query.email = { $regex: filters.email, $options: 'i' };
    }
    
    if (filters.action) {
      query.action = filters.action;
    }
    
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.timestamp.$lte = new Date(filters.endDate);
      }
    }
    
    const [logs, total] = await Promise.all([
      db.collection('audit_log')
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('audit_log').countDocuments(query)
    ]);
    
    return {
      logs,
      total,
      limit,
      skip,
      hasMore: skip + logs.length < total
    };
  } catch (error) {
    logger.error('AdminAuth', 'Failed to retrieve audit logs', error);
    throw error;
  }
}
