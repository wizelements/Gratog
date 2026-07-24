export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/unified-admin';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

const COLLECTION = 'fresh_batch_requests';

/**
 * Admin endpoint: list fresh batch requests with optional filters.
 *
 * GET /api/admin/fresh-batch/requests?status=requested&marketId=serenbe
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const marketId = searchParams.get('marketId');
    const flavor = searchParams.get('flavor');
    const limit = Math.min(Number(searchParams.get('limit') || '100'), 200);

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (marketId) query.preferredMarketId = marketId;
    if (flavor) {
      query.$or = [
        { requestedProductSlug: flavor },
        { flavorProfile: flavor },
      ];
    }

    const { db } = await connectToDatabase();
    const requests = await db
      .collection(COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ success: true, data: { requests } });
  } catch (error) {
    logger.error('AdminFreshBatch', 'Failed to load requests', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Failed to load requests' },
      { status: 500 }
    );
  }
}

/**
 * Admin endpoint: bulk update request status.
 *
 * PATCH /api/admin/fresh-batch/requests
 * Body: { ids: string[], status: string, ownerNotes?: string }
 */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const body = raw as { ids?: string[]; status?: string; ownerNotes?: string };
  if (!Array.isArray(body.ids) || body.ids.length === 0 || !body.status) {
    return NextResponse.json(
      { success: false, error: 'ids and status are required' },
      { status: 400 }
    );
  }

  try {
    const { db } = await connectToDatabase();
    const update: Record<string, unknown> = { status: body.status, updatedAt: new Date() };
    if (body.ownerNotes !== undefined) update.ownerNotes = body.ownerNotes;

    const result = await db.collection(COLLECTION).updateMany(
      { id: { $in: body.ids } },
      { $set: update }
    );

    return NextResponse.json({
      success: true,
      data: { matched: result.matchedCount, modified: result.modifiedCount },
    });
  } catch (error) {
    logger.error('AdminFreshBatch', 'Failed to update requests', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Failed to update requests' },
      { status: 500 }
    );
  }
}
