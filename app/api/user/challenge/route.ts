import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { connectToDatabase } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';

async function getAuthUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = await verifyToken(token);
  if (!decoded?.userId) return null;
  return decoded;
}

function canCheckIn(lastCheckIn: Date | null): boolean {
  if (!lastCheckIn) return true;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(lastCheckIn) < todayMidnight;
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await getAuthUser(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const challenge = await db.collection('challenges').findOne({ userId: decoded.userId });

    return NextResponse.json({
      success: true,
      challenge: {
        streakDays: challenge?.streakDays || 0,
        lastCheckIn: challenge?.lastCheckIn || null,
        totalCheckIns: challenge?.totalCheckIns || 0,
        canCheckIn: canCheckIn(challenge?.lastCheckIn || null),
      },
    });
  } catch (error) {
    console.error('Challenge fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch challenge' }, { status: 500 });
  }
}
