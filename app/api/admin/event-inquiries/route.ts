export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db-optimized';
import { withAdminMiddleware, type AuthenticatedRequest } from '@/lib/middleware/admin';
import { PERMISSIONS, ROLES } from '@/lib/security';
import { logger } from '@/lib/logger';

const STATUS = ['new', 'contacted', 'quoted', 'booked', 'closed'] as const;
const StatusSchema = z.enum(STATUS);
const UpdateSchema = z.object({
  id: z.string().uuid(),
  status: StatusSchema,
}).strict();

export const GET = withAdminMiddleware(async (request: AuthenticatedRequest) => {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get('page') || '1');
  const status = params.get('status');
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) {
    return NextResponse.json({ success: false, error: 'Invalid page' }, { status: 400 });
  }
  if (status && !StatusSchema.safeParse(status).success) {
    return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const filter = { intent: 'event_booking_inquiry', ...(status ? { status } : {}) };
    const cursor = db.collection('lead_intents').find(filter, {
      projection: {
        _id: 0, id: 1, name: 1, email: 1, phone: 1, message: 1,
        metadata: 1, source: 1, status: 1, createdAt: 1, updatedAt: 1,
      },
    });
    const [inquiries, total] = await Promise.all([
      cursor.sort({ createdAt: -1, id: -1 }).skip((page - 1) * 25).limit(25).toArray(),
      db.collection('lead_intents').countDocuments(filter),
    ]);
    return NextResponse.json({ success: true, inquiries, pagination: { page, total, pages: Math.ceil(total / 25) } }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    logger.error('EventInquiries', 'Failed to load event inquiries', error);
    return NextResponse.json({ success: false, error: 'Unable to load event inquiries' }, { status: 503 });
  }
}, {
  permission: PERMISSIONS.CUSTOMERS_VIEW,
  resource: 'event_inquiries',
  action: 'list',
  rateLimit: { maxRequests: 60, windowSeconds: 60 },
});

export const PATCH = withAdminMiddleware(async (request: AuthenticatedRequest) => {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid inquiry update' }, { status: 400 });
  }
  const { id, status } = parsed.data;
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('lead_intents').updateOne(
      { id, intent: 'event_booking_inquiry' },
      { $set: { status, updatedAt: new Date(), updatedByAdminId: request.admin.id } },
    );
    if (result.matchedCount !== 1) {
      return NextResponse.json({ success: false, error: 'Inquiry not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, id, status }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    logger.error('EventInquiries', 'Unable to update event inquiry', error);
    return NextResponse.json({ success: false, error: 'Unable to save inquiry status' }, { status: 503 });
  }
}, {
  permission: PERMISSIONS.CUSTOMERS_VIEW,
  minRole: ROLES.EDITOR,
  resource: 'event_inquiries',
  action: 'update',
  rateLimit: { maxRequests: 30, windowSeconds: 60 },
});
