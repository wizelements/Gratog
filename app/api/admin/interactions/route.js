export const dynamic = 'force-dynamic';

import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { requireAdmin } from '@/lib/admin-session';
import { logger } from '@/lib/logger';

const VALID_TYPES = new Set(['video_review', 'customer_experience', 'event_moment']);

function isValidUrl(value) {
  if (!value) return true;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function GET(request) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const includeDrafts = searchParams.get('includeDrafts') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const { db } = await connectToDatabase();
    const query = includeDrafts ? {} : { published: true };
    const interactions = await db.collection('community_interactions')
      .find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ success: true, interactions });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }

    logger.error('API', 'Failed to load admin interactions', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load interactions' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();

    const type = body.type || 'event_moment';
    const title = String(body.title || '').trim();
    const customerName = String(body.customerName || '').trim();
    const text = String(body.text || '').trim();
    const mediaUrl = String(body.mediaUrl || '').trim();
    const sourceUrl = String(body.sourceUrl || '').trim();
    const sourcePlatform = String(body.sourcePlatform || '').trim();
    const published = body.published !== false;

    if (!VALID_TYPES.has(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid interaction type' },
        { status: 400 }
      );
    }

    if (!title || !customerName || !text) {
      return NextResponse.json(
        { success: false, error: 'Title, customer name, and interaction text are required' },
        { status: 400 }
      );
    }

    if (!isValidUrl(mediaUrl) || !isValidUrl(sourceUrl)) {
      return NextResponse.json(
        { success: false, error: 'Invalid media/source URL format' },
        { status: 400 }
      );
    }

    const now = new Date();
    const interaction = {
      id: randomUUID(),
      type,
      title,
      customerName,
      text,
      mediaUrl: mediaUrl || null,
      sourceUrl: sourceUrl || null,
      sourcePlatform: sourcePlatform || null,
      featured: body.featured === true,
      published,
      publishedAt: published ? now : null,
      createdBy: admin.email,
      createdAt: now,
      updatedAt: now
    };

    const { db } = await connectToDatabase();
    await db.collection('community_interactions').insertOne(interaction);

    return NextResponse.json({ success: true, interaction }, { status: 201 });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }

    logger.error('API', 'Failed to create interaction', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create interaction' },
      { status: 500 }
    );
  }
}
