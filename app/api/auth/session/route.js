import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { findUserById } from '@/lib/db/users';

export async function GET(request) {
  try {
    const payload = await requireAuth(request);
    const user = await findUserById(payload.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user,
        authenticated: true
      },
      { status: 200 }
    );
  } catch (error) {
    // Expected error when user is not authenticated - no need to log
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        error: 'Not authenticated'
      },
      { status: 401 }
    );
  }
}
