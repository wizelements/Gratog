import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/auth/me
 * Get current admin user info
 * 
 * SECURITY: This endpoint now properly validates the admin token.
 * It will return 401 if not authenticated.
 */
export async function GET(request) {
  try {
    const admin = await getAdminSession(request);
    
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        name: admin.name || 'Admin User',
        email: admin.email,
        role: admin.role,
      }
    });
  } catch (error) {
    logger.error('API', 'Admin auth/me error', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 401 }
    );
  }
}
