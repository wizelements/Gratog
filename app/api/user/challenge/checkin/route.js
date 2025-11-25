import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const MONGO_URL = process.env.MONGO_URL;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = await MongoClient.connect(MONGO_URL);
  cachedDb = client.db();
  return cachedDb;
}

export async function POST(request) {
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
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const db = await connectToDatabase();
    const userId = decoded.userId;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Fetch user's challenge
    const challenge = await db.collection('challenges').findOne({ userId });

    if (!challenge) {
      return NextResponse.json(
        { success: false, error: 'Challenge not found' },
        { status: 404 }
      );
    }

    // Check if already checked in today
    const lastCheckIn = challenge.lastCheckIn ? new Date(challenge.lastCheckIn) : null;
    if (lastCheckIn) {
      const lastCheckInDate = new Date(lastCheckIn.getFullYear(), lastCheckIn.getMonth(), lastCheckIn.getDate());
      if (lastCheckInDate.getTime() === today.getTime()) {
        return NextResponse.json(
          { success: false, error: 'Already checked in today' },
          { status: 400 }
        );
      }
    }

    // Calculate new streak
    let newStreakDays = 1;
    if (lastCheckIn) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastCheckInDate = new Date(lastCheckIn.getFullYear(), lastCheckIn.getMonth(), lastCheckIn.getDate());
      
      if (lastCheckInDate.getTime() === yesterday.getTime()) {
        // Consecutive day - increment streak
        newStreakDays = (challenge.streakDays || 0) + 1;
      }
      // If more than 1 day gap, streak resets to 1
    }

    // Calculate reward points
    let pointsEarned = 5; // Base points for check-in
    let milestoneReached = null;

    // Bonus points for milestones
    if (newStreakDays === 3) {
      pointsEarned += 10;
      milestoneReached = '3 Day Streak';
    } else if (newStreakDays === 7) {
      pointsEarned += 50;
      milestoneReached = '7 Day Streak';
    } else if (newStreakDays === 14) {
      pointsEarned += 100;
      milestoneReached = '14 Day Streak';
    } else if (newStreakDays === 30) {
      pointsEarned += 200;
      milestoneReached = '30 Day Streak';
    }

    // Update challenge
    await db.collection('challenges').updateOne(
      { userId },
      {
        $set: {
          streakDays: newStreakDays,
          lastCheckIn: now,
          updatedAt: now
        },
        $inc: { totalCheckIns: 1 }
      }
    );

    // Update rewards points
    const rewards = await db.collection('rewards').findOne({ userId });
    if (rewards) {
      await db.collection('rewards').updateOne(
        { userId },
        {
          $inc: {
            points: pointsEarned,
            lifetimePoints: pointsEarned
          },
          $push: {
            history: {
              id: uuidv4(),
              description: milestoneReached 
                ? `Check-in: ${milestoneReached} Bonus!` 
                : 'Daily check-in',
              points: pointsEarned,
              date: now,
              type: 'checkin'
            }
          },
          $set: { updatedAt: now }
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Check-in successful!',
      streakDays: newStreakDays,
      pointsEarned,
      milestoneReached
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check in' },
      { status: 500 }
    );
  }
}
