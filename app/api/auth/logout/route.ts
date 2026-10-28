import { NextRequest, NextResponse } from 'next/server';
import {revokeToken} from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {await revokeToken(request.cookies.get('auth_token')?.value);}
  catch {return NextResponse.json({success:false,error:'Logout could not be persisted. Please retry.'},{status:503});}
  const response = NextResponse.json({ success: true });

  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
