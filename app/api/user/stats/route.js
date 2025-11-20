import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = await MongoClient.connect(MONGO_URL);
  cachedDb = client.db();
  return cachedDb;
}

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
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const db = await connectToDatabase();
    const userId = decoded.userId;

    // Fetch user stats in parallel
    const [ordersCount, rewards, challenge] = await Promise.all([
      // Count total orders for user
      db.collection('orders').countDocuments({ 'customer.userId': userId }),
      
      // Get rewards data
      db.collection('rewards').findOne({ userId }),
      
      // Get challenge data
      db.collection('challenges').findOne({ userId })
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders: ordersCount,
        rewardPoints: rewards?.points || 0,
        lifetimePoints: rewards?.lifetimePoints || 0,
        streakDays: challenge?.streakDays || 0,
        totalCheckIns: challenge?.totalCheckIns || 0
      }
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
