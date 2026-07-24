export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/unified-admin';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { isValidRequestTransition } from '@/lib/batches/state-machine';
import { logRequestStatusChange } from '@/lib/batches/audit-log';
import type { FreshBatchRequest, RequestStatus } from '@/lib/batches/types';

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
    const targetStatus = body.status as RequestStatus;

    // Fetch current states to validate transitions and audit-log each change.
    const existing = await db
      .collection<FreshBatchRequest>(COLLECTION)
      .find({ id: { $in: body.ids } })
      .toArray();

    const invalid = existing.filter((r) => !isValidRequestTransition(r.status, targetStatus));
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid state transition for some requests',
          details: invalid.map((r) => ({ id: r.id, from: r.status, to: targetStatus })),
        },
        { status: 409 }
      );
    }

    const update: Record<string, unknown> = { status: targetStatus, updatedAt: new Date() };
    if (body.ownerNotes !== undefined) update.ownerNotes = body.ownerNotes;

    const result = await db.collection(COLLECTION).updateMany(
      { id: { $in: body.ids } },
      { $set: update }
    );

    // Append audit-log entries asynchronously; failures are logged, not surfaced.
    const actor = admin.email || 'unknown';
    existing.forEach((r) => {
      logRequestStatusChange(r.id, actor, r.status, targetStatus, body.ownerNotes).catch(
        (err) => {
          logger.warn('AdminFreshBatch', 'Audit log failed', {
            requestId: r.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      );
    });

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
