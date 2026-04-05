/**
 * Admin Auth Me Route
 * 
 * Returns current admin user info for session validation.
 */

import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/unified-admin';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const admin = await getAdminSession(request as any);
    
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
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
    
  } catch (error) {
    logger.error('AUTH', '/me error', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 401 }
    );
  }
}
