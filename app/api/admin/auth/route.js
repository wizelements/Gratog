import { NextResponse } from 'next/server';
import { loginAdmin } from '@/lib/admin-auth';
import { getAdminFromRequest } from '@/lib/admin-auth';

/**
 * POST /api/admin/auth - Admin login
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Attempt login
    const result = await loginAdmin(email, password);

    console.log(`✅ Admin login successful: ${email}`);

    return NextResponse.json({
      success: true,
      admin: result.admin,
      token: result.token
    });

  } catch (error) {
    console.error('Admin login error:', error);
    
    // Don't expose specific error messages for security
    return NextResponse.json(
      { error: error.message === 'Invalid credentials' || error.message === 'Admin account is disabled'
        ? error.message
        : 'Login failed'
      },
      { status: 401 }
    );
  }
}

/**
 * GET /api/admin/auth - Get current admin session
 */
export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      admin
    });

  } catch (error) {
    console.error('Admin session error:', error);
    return NextResponse.json(
      { error: 'Session validation failed' },
      { status: 401 }
    );
  }
}
