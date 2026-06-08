export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware, AuthenticatedRequest } from '@/lib/middleware/admin';
import { logger } from '@/lib/logger';

const ALLOWED_STATUSES = new Set([
  'sent',
  'delivered',
  'delayed',
  'bounced',
  'complained',
  'failed',
  'skipped',
  'mock',
  'mock_not_sent',
]);

function parseLimit(value: string | null) {
  const n = Number(value || 50);
  if (!Number.isFinite(n)) return 50;
  return Math.min(200, Math.max(1, Math.floor(n)));
}

function parseDays(value: string | null) {
  const n = Number(value || 14);
  if (!Number.isFinite(n)) return 14;
  return Math.min(90, Math.max(1, Math.floor(n)));
}

function redactEmail(email: unknown) {
  if (typeof email !== 'string' || !email.includes('@')) return email || null;
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}${name.length > 2 ? '***' : '*'}@${domain}`;
}

export const GET = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get('limit'));
    const days = parseDays(searchParams.get('days'));
    const status = searchParams.get('status')?.trim();
    const type = searchParams.get('type')?.trim();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    if (status && !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email status filter' },
        { status: 400 }
      );
    }

    try {
      const { db } = await connectToDatabase();
      const dateMatch = {
        $or: [
          { createdAt: { $gte: since } },
          { sentAt: { $gte: since } },
          { createdAt: { $gte: since.toISOString() } },
          { sentAt: { $gte: since.toISOString() } },
        ],
      };
      const query: Record<string, unknown> = { ...dateMatch };
      if (status) query.status = status;
      if (type) query.emailType = type;

      const [emails, statusCounts, typeCounts, suppressionCount, recentWebhookFailures] = await Promise.all([
        db.collection('email_sends')
          .find(query, {
            projection: {
              to: 1,
              email: 1,
              subject: 1,
              emailType: 1,
              template: 1,
              provider: 1,
              status: 1,
              deliveryStatus: 1,
              lastEventType: 1,
              lastEventAt: 1,
              createdAt: 1,
              sentAt: 1,
              deliveredAt: 1,
              bouncedAt: 1,
              complainedAt: 1,
              error: 1,
              reason: 1,
              campaignId: 1,
              orderId: 1,
              messageId: 1,
              resendId: 1,
            },
          })
          .sort({ createdAt: -1, sentAt: -1 })
          .limit(limit)
          .toArray(),
        db.collection('email_sends').aggregate([
          { $match: dateMatch },
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray(),
        db.collection('email_sends').aggregate([
          { $match: dateMatch },
          { $group: { _id: '$emailType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray(),
        db.collection('email_suppressions').countDocuments({ active: { $ne: false } }),
        db.collection('resend_webhook_events')
          .find({ status: 'failed' }, { projection: { svixId: 1, type: 1, messageId: 1, failedAt: 1, error: 1 } })
          .sort({ failedAt: -1 })
          .limit(10)
          .toArray(),
      ]);

      const statusMap = Object.fromEntries(statusCounts.map((row: any) => [row._id || 'unknown', row.count]));
      const sent = Number(statusMap.sent || 0) + Number(statusMap.delivered || 0);
      const bounced = Number(statusMap.bounced || 0) + Number(statusMap.complained || 0);
      const bounceRate = sent > 0 ? Number(((bounced / sent) * 100).toFixed(2)) : 0;

      return NextResponse.json({
        success: true,
        data: {
          range: { days, since: since.toISOString() },
          summary: {
            total: statusCounts.reduce((sum: number, row: any) => sum + row.count, 0),
            sent,
            delivered: Number(statusMap.delivered || 0),
            failed: Number(statusMap.failed || 0),
            bounced,
            skipped: Number(statusMap.skipped || 0),
            bounceRate,
            activeSuppressions: suppressionCount,
          },
          statuses: statusCounts,
          types: typeCounts,
          webhookFailures: recentWebhookFailures,
          emails: emails.map((email: any) => ({
            ...email,
            recipient: redactEmail(email.to || email.email),
            to: undefined,
            email: undefined,
          })),
        },
      });
    } catch (error) {
      logger.error('ADMIN_EMAILS', 'Failed to fetch email health', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch email health' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.ANALYTICS_VIEW,
    resource: 'emails',
    action: 'view',
    rateLimit: { maxRequests: 60, windowSeconds: 60 },
  }
);
