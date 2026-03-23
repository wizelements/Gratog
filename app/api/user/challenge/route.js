import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { connectToDatabase } from '@/lib/db-optimized';

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

    // Fetch user's challenge
    const challenge = await db.collection('challenges').findOne({ userId });

    if (!challenge) {
      return NextResponse.json({
        success: true,
        challenge: {
          streakDays: 0,
          lastCheckIn: null,
          totalCheckIns: 0,
          canCheckIn: true
        }
      });
    }

    // Check if user can check in today
    const now = new Date();
    const lastCheckIn = challenge.lastCheckIn ? new Date(challenge.lastCheckIn) : null;
    
    let canCheckIn = true;
    if (lastCheckIn) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastCheckInDate = new Date(lastCheckIn.getFullYear(), lastCheckIn.getMonth(), lastCheckIn.getDate());
      canCheckIn = today > lastCheckInDate;
    }

    return NextResponse.json({
      success: true,
      challenge: {
        streakDays: challenge.streakDays || 0,
        lastCheckIn: challenge.lastCheckIn,
        totalCheckIns: challenge.totalCheckIns || 0,
        canCheckIn
      }
    });
  } catch (error) {
    console.error('Challenge fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch challenge' },
      { status: 500 }
    );
  }
}
