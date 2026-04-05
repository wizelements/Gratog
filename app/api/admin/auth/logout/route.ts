/**
 * Admin Logout Route
 * 
 * Clears authentication cookies and logs the logout action.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { getAdminSession } from '@/lib/auth/unified-admin';

export async function POST(request: NextRequest) {
  try {
    // Get current session for audit logging
    const admin = await getAdminSession(request);
    
    if (admin) {
      // Log the logout
      const { db } = await connectToDatabase();
      await db.collection('audit_logs').insertOne({
        timestamp: new Date(),
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'LOGOUT',
        resource: 'auth',
        details: {},
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        success: true,
      });
      
      logger.info('AUTH', `Logout: ${admin.email}`);
    }
    
    // Clear cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
    
    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
    
    response.cookies.set('admin_csrf', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
    
    return response;
    
  } catch (error) {
    logger.error('AUTH', 'Logout error', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
