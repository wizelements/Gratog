import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = await MongoClient.connect(MONGO_URL);
  cachedDb = client.db();
  return cachedDb;
}

/**
 * Email Preferences API
 * GET - Get user's email preferences
 * PUT - Update email preferences
 */

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const db = await connectToDatabase();
    
    const userData = await db.collection('users').findOne({ id: user.userId });
    
    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const preferences = userData.emailPreferences || {
      marketing: true,
      orderUpdates: true,
      rewards: true,
      challenges: true
    };

    return NextResponse.json({
      success: true,
      preferences
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    );
  }
}

export async function PUT(request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid preferences object' },
        { status: 400 }
      );
    }

    // Validate preference keys
    const validKeys = ['marketing', 'orderUpdates', 'rewards', 'challenges'];
    const updates = {};
    
    for (const key of validKeys) {
      if (key in preferences) {
        updates[`emailPreferences.${key}`] = Boolean(preferences[key]);
      }
    }

    const db = await connectToDatabase();
    
    await db.collection('users').updateOne(
      { id: user.userId },
      { 
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Email preferences updated for user ${user.userId}`);

    return NextResponse.json({
      success: true,
      message: 'Email preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating email preferences:', error);
    
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
