export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/unified-admin';
import { logger } from '@/lib/logger';
import { isExpiredInZone, getTodayStart } from '@/lib/menus/week-utils';
import { connectToDatabase } from '@/lib/db-optimized';

const COLLECTION_NAME = 'menus';

/**
 * POST /api/admin/menus/archive
 * Cron-safe endpoint to archive expired menus.
 *
 * Authorization: CRON_SECRET or ADMIN_API_TOKEN via Bearer header or body secret.
 * Idempotent; safe to call from Vercel cron.
 */
export async function POST(request: Request) {
  let authOk = false;
  const cronSecret = process.env.CRON_SECRET;
  const adminToken = process.env.ADMIN_API_TOKEN;

  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '');

  if ((cronSecret && bearer === cronSecret) || (adminToken && bearer === adminToken)) {
    authOk = true;
  } else {
    try {
      const json = await request.clone().json();
      if ((cronSecret && json.secret === cronSecret) || (adminToken && json.secret === adminToken)) {
        authOk = true;
      }
    } catch {
      // ignore parse failure
    }
  }

  if (!authOk) {
    const session = await requireAdminSession(request);
    if (!session) {
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
