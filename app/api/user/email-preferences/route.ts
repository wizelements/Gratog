import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { connectToDatabase } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';

const DEFAULT_PREFERENCES = {
  marketing: true,
  orderUpdates: true,
  rewards: true,
  challenges: true,
};

async function getAuthUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = await verifyToken(token);
  if (!decoded?.userId) return null;
  return decoded;
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await getAuthUser(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const prefs = await db.collection('user_preferences').findOne({ userId: decoded.userId });

    return NextResponse.json({
      success: true,
      preferences: {
        marketing: prefs?.marketing ?? DEFAULT_PREFERENCES.marketing,
        orderUpdates: prefs?.orderUpdates ?? DEFAULT_PREFERENCES.orderUpdates,
        rewards: prefs?.rewards ?? DEFAULT_PREFERENCES.rewards,
        challenges: prefs?.challenges ?? DEFAULT_PREFERENCES.challenges,
      },
    });
  } catch (error) {
    console.error('Email preferences fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const decoded = await getAuthUser(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid preferences' }, { status: 400 });
    }

    const update: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of ['marketing', 'orderUpdates', 'rewards', 'challenges']) {
      if (key in preferences) {
        update[key] = Boolean(preferences[key]);
      }
    }

    const { db } = await connectToDatabase();
    await db.collection('user_preferences').updateOne(
      { userId: decoded.userId },
      { $set: update },
      { upsert: true },
    );

    const saved = await db.collection('user_preferences').findOne({ userId: decoded.userId });

    return NextResponse.json({
      success: true,
      preferences: {
        marketing: saved?.marketing ?? DEFAULT_PREFERENCES.marketing,
        orderUpdates: saved?.orderUpdates ?? DEFAULT_PREFERENCES.orderUpdates,
        rewards: saved?.rewards ?? DEFAULT_PREFERENCES.rewards,
        challenges: saved?.challenges ?? DEFAULT_PREFERENCES.challenges,
      },
    });
  } catch (error) {
    console.error('Email preferences update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update preferences' }, { status: 500 });
  }
}
