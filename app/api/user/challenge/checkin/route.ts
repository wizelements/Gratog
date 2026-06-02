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

function wasYesterday(lastCheckIn: Date): boolean {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const lastDate = new Date(lastCheckIn);
  const lastMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
  return lastMidnight.getTime() === yesterday.getTime();
}

const MILESTONES: Record<number, { points: number; label: string }> = {
  3: { points: 10, label: '3 Day Streak!' },
  7: { points: 50, label: '7 Day Streak!' },
  14: { points: 100, label: '14 Day Streak!' },
  30: { points: 200, label: '30 Day Streak!' },
};

const BASE_POINTS = 5;

export async function POST(request: NextRequest) {
  try {
    const decoded = await getAuthUser(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const userId = decoded.userId;

    const challenge = await db.collection('challenges').findOne({ userId });

    if (!canCheckIn(challenge?.lastCheckIn || null)) {
      return NextResponse.json(
        { success: false, error: 'Already checked in today' },
        { status: 400 },
      );
    }

    // Calculate new streak
    let newStreak = 1;
    if (challenge?.lastCheckIn && wasYesterday(challenge.lastCheckIn)) {
      newStreak = (challenge.streakDays || 0) + 1;
    }

    // Check milestones
    const milestone = MILESTONES[newStreak] || null;
    const milestoneBonus = milestone?.points || 0;
    const totalPointsEarned = BASE_POINTS + milestoneBonus;

    // Update challenge
    await db.collection('challenges').updateOne(
      { userId },
      {
        $set: {
          streakDays: newStreak,
          lastCheckIn: new Date(),
          totalCheckIns: (challenge?.totalCheckIns || 0) + 1,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    // Add points to rewards
    await db.collection('rewards').updateOne(
      { userId },
      {
        $inc: {
          points: totalPointsEarned,
          lifetimePoints: totalPointsEarned,
        },
        $push: {
          history: {
            type: 'check_in',
            points: totalPointsEarned,
            description: milestone ? `Daily check-in + ${milestone.label}` : 'Daily check-in',
            createdAt: new Date(),
          },
        } as any,
      },
      { upsert: true },
    );

    return NextResponse.json({
      success: true,
      pointsEarned: totalPointsEarned,
      milestoneReached: milestone?.label || null,
      streak: newStreak,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ success: false, error: 'Failed to check in' }, { status: 500 });
  }
}
