import { NextResponse } from 'next/server';
import { clearAdminCookie } from '@/lib/admin-session';

export async function POST() {
  try {
    let response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response = clearAdminCookie(response);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { 
        error: 'Logout failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
