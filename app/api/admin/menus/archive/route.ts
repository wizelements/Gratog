export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/unified-admin';
import { requireCronSecret } from '@/lib/cron-auth';
import { logger } from '@/lib/logger';
import { isExpiredInZone, getTodayStart } from '@/lib/menus/week-utils';
import { connectToDatabase } from '@/lib/db-optimized';

const COLLECTION_NAME = 'menus';

/**
 * POST /api/admin/menus/archive
 * Cron-safe endpoint to archive expired menus.
 *
 * OPEE ADMIN-04: Authorization uses requireCronSecret() for machine-to-machine
 * cron calls, or requireAdminSession() for interactive admin access.
 * ADMIN_API_TOKEN is no longer accepted; use CRON_SECRET for cron jobs.
 */
export async function POST(request: NextRequest) {
  // OPEE ADMIN-04: Parse body for cron-secret-in-body auth before consuming the stream.
  let body: Record<string, unknown> | undefined;
  try {
    body = await request.clone().json();
  } catch {
    // No JSON body or parse failure — body auth is optional.
  }

  // Try cron secret first (machine-to-machine), including body.secret path
  const cronResult = requireCronSecret(request, body);
  if (cronResult === null) {
    // Cron auth passed, proceed
  } else {
    // Cron auth failed, try admin session (interactive)
    try {
      const session = await requireAdminSession(request);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    const todayStart = getTodayStart();

    const candidates = await collection
      .find({
        $or: [{ isActive: true }, { isArchived: { $ne: true } }],
      })
      .toArray();

    const toArchive = candidates.filter((doc: any) => isExpiredInZone(doc.weekEnd?.toISOString?.()));

    if (toArchive.length === 0) {
      logger.info('ArchiveExpiredMenus', 'No expired menus to archive', {
        todayStart: todayStart.toISOString(),
      });
      return NextResponse.json({
        success: true,
        archived: 0,
        todayStart: todayStart.toISOString(),
      });
    }

    const objectIds = toArchive.map((doc: any) => doc._id);
    const ids = toArchive.map((doc: any) => doc._id.toString());

    const result = await collection.updateMany(
      { _id: { $in: objectIds } },
      {
        $set: {
          isActive: false,
          isArchived: true,
          updatedAt: new Date(),
        },
      }
    );

    logger.info('ArchiveExpiredMenus', 'Archived expired menus', {
      count: result.modifiedCount,
      todayStart: todayStart.toISOString(),
      ids,
    });

    return NextResponse.json({
      success: true,
      archived: result.modifiedCount,
      todayStart: todayStart.toISOString(),
      ids,
    });
  } catch (error: any) {
    logger.error('ArchiveExpiredMenus', 'Failed to archive expired menus', error);
    return NextResponse.json(
      { success: false, error: 'Failed to archive expired menus', message: error.message },
      { status: 500 }
    );
  }
}
