import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const { db } = await connectToDatabase();
    const interactions = await db.collection('community_interactions')
      .find({ published: true })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      interactions
    });
  } catch (error) {
    logger.error('API', 'Failed to fetch community interactions', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load interactions' },
      { status: 500 }
    );
  }
}
