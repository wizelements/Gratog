import { NextResponse } from 'next/server';

/**
 * GET /api/admin/auth/me
 * Get current admin user info (mock for now)
 */
export async function GET(request) {
  try {
    // For now, return mock admin user
    // In production, validate JWT token from headers
    const authHeader = request.headers.get('authorization');
    
    // Mock admin user
    const adminUser = {
      id: 'admin_001',
      name: 'Admin User',
      email: 'admin@tasteofgratitude.com',
      role: 'admin',
      permissions: ['products', 'orders', 'customers', 'analytics', 'settings']
    };

    return NextResponse.json({
      success: true,
      user: adminUser
    });
  } catch (error) {
    console.error('Admin auth/me error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 401 }
    );
  }
}
