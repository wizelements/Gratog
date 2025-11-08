import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

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
      console.error('❌ Admin auth middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * Audit log admin actions
 */
export async function logAdminAction(user, action, details) {
  const logEntry = {
    timestamp: new Date(),
    userId: user.userId,
    email: user.email,
    role: user.role,
    action,
    details,
    environment: process.env.NODE_ENV
  };

  console.log('[ADMIN_AUDIT]', JSON.stringify(logEntry));
  
  // TODO: Store in audit_log collection in MongoDB
  // const { db } = await connectToDatabase();
  // await db.collection('audit_log').insertOne(logEntry);
}
