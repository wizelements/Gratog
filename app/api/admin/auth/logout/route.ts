export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out' });
  for (const name of ['admin_token', 'admin_csrf']) {
    response.cookies.set(name, '', {
      httpOnly: name === 'admin_token',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', path: '/', maxAge: 0
    });
  }
  return response;
}
