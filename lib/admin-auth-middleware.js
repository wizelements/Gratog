const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

/**
 * Middleware to protect admin API routes
 * Verifies JWT token from admin_token cookie
 */
export function requireAdminAuth(handler) {
  return async (request, context) => {
    try {
      // Get token from cookie
      const token = request.cookies.get('admin_token')?.value;
      
      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Verify token
      const decoded = verifyToken(token);
      
      if (!decoded) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Check if user has admin role
      if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Attach user to request for handler
      request.user = decoded;

      // Call the actual handler
      return handler(request, context);
    } catch (error) {
      logger.error('AdminAuth', 'Admin auth middleware error', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * Audit log admin actions - persists to MongoDB
 */
export async function logAdminAction(user, action, details, request = null) {
  const logEntry = {
    timestamp: new Date(),
    userId: user.userId,
    email: user.email,
    role: user.role,
    action,
    details,
    environment: process.env.NODE_ENV,
    ipAddress: request?.headers?.get('x-forwarded-for') || 
               request?.headers?.get('x-real-ip') || 
               'unknown',
    userAgent: request?.headers?.get('user-agent') || 'unknown'
  };

  // Always log to console as backup
  debug('[ADMIN_AUDIT]', JSON.stringify(logEntry));
  
  try {
    const { db } = await connectToDatabase();
    await db.collection('audit_log').insertOne(logEntry);
  } catch (error) {
    logger.error('AdminAuth', 'Failed to persist audit log to MongoDB', error);
  }
}

/**
 * Retrieve audit logs with pagination and filtering
 */
export async function getAuditLogs(filters = {}, limit = 50, skip = 0) {
  try {
    const { db } = await connectToDatabase();
    
    const query = {};
    
    if (filters.userId) {
      query.userId = filters.userId;
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
