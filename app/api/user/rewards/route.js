import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { connectToDatabase } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Get auth token from cookie
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const userId = decoded.userId;

    // Fetch user's rewards
    const rewards = await db.collection('rewards').findOne({ userId });

    if (!rewards) {
      return NextResponse.json({
        success: true,
        rewards: {
          points: 0,
          lifetimePoints: 0,
          history: []
        }
      });
    }

    return NextResponse.json({
      success: true,
      rewards: {
        points: rewards.points || 0,
        lifetimePoints: rewards.lifetimePoints || 0,
        history: rewards.history || []
      }
    });
  } catch (error) {
    console.error('Rewards fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}
