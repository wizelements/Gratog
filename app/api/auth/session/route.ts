import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { findUserById } from '@/lib/db/users';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false });
    }

    const user = await findUserById(payload.userId as string);
    if (!user) {
      return NextResponse.json({ success: false });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        joinedAt: user.joinedAt,
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ success: false });
  }
}
