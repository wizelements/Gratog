import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { requireAdmin } from '@/lib/admin-session';
import { logger } from '@/lib/logger';

export async function PATCH(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const update = { updatedAt: new Date() };

    if (typeof body.featured === 'boolean') {
      update.featured = body.featured;
    }

    if (typeof body.published === 'boolean') {
      update.published = body.published;
      update.publishedAt = body.published ? new Date() : null;
    }

    const { db } = await connectToDatabase();
    const result = await db.collection('community_interactions').updateOne(
      { id },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Interaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }

    logger.error('API', 'Failed to update interaction', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update interaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const { db } = await connectToDatabase();
    const result = await db.collection('community_interactions').deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Interaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }

    logger.error('API', 'Failed to delete interaction', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete interaction' },
      { status: 500 }
    );
  }
}
