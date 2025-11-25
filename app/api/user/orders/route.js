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

    // Fetch user's orders, sorted by most recent first
    const orders = await db.collection('orders')
      .find({ 'customer.userId': userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
