export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/unified-admin';
import { logger } from '@/lib/logger';
import { isExpiredInZone, getTodayStart } from '@/lib/menus/week-utils';
import { archiveTursoMenus, listTursoMenus } from '@/lib/menus/turso-repository';

/**
 * POST /api/admin/menus/archive
 * Cron-safe endpoint to archive expired menus.
 *
 * Authorization: CRON_SECRET or ADMIN_API_TOKEN via Bearer header or body secret.
 * Idempotent; safe to call from Vercel cron.
 */
export async function POST(request: NextRequest) {
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
    const todayStart = getTodayStart();
    const candidates = (await listTursoMenus('all')).filter((menu) => menu.isActive || !menu.isArchived);

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

    const ids = toArchive.map((doc) => doc.id);
    const archived = await archiveTursoMenus(ids);

    logger.info('ArchiveExpiredMenus', 'Archived expired menus', {
      count: archived,
      todayStart: todayStart.toISOString(),
      ids,
    });

    return NextResponse.json({
      success: true,
      archived,
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
