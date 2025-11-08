import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.delete('admin_token');
    return response;
  } catch (error) {
    console.error('❌ Logout error:', error);
    return NextResponse.json(
      { 
        error: 'Logout failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
