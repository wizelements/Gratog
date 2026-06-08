export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/resend-email';
import { canSendEmail, generateUnsubscribeToken } from '@/lib/email/service';

const RECOVERY_AFTER_MINUTES = 45;
const ABANDON_AFTER_HOURS = 24;
const MAX_RECOVERY_EMAILS = 30;

const PENDING_PAYMENT_STATUSES = [
  'pending',
  'PENDING',
  'PENDING_PAYMENT',
  'payment_processing',
  'processing',
  'PROCESSING',
];

const TERMINAL_STATUSES = [
  'paid',
  'PAID',
  'completed',
  'COMPLETED',
  'fulfilled',
  'cancelled',
  'canceled',
  'refunded',
  'abandoned',
];

function verifyCronAuth(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

function baseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://tasteofgratitude.shop').replace(/\/$/, '');
}

function escapeHtml(value: unknown) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCustomerEmail(order: any) {
  return String(order.customerEmail || order.customer?.email || '').trim().toLowerCase();
}

function getOrderTotal(order: any) {
  const total = Number(order.total || order.pricing?.total || 0);
  return Number.isFinite(total) ? total : 0;
}

function dateRangeMatch(start: Date, end: Date) {
  return {
    $or: [
      { createdAt: { $gte: start, $lte: end } },
      { createdAt: { $gte: start.toISOString(), $lte: end.toISOString() } },
    ],
  };
}

function abandonedCandidateMatch(end: Date) {
  return {
    $and: [
      {
        $or: [
          { createdAt: { $lte: end } },
          { createdAt: { $lte: end.toISOString() } },
        ],
      },
      { paymentStatus: { $in: PENDING_PAYMENT_STATUSES } },
      { status: { $nin: TERMINAL_STATUSES } },
      { paymentId: { $exists: false } },
      { squarePaymentId: { $exists: false } },
      { abandonedAt: { $exists: false } },
    ],
  };
}

function buildRecoveryEmail(order: any) {
  const url = `${baseUrl()}/checkout?utm_source=abandoned_cart&utm_medium=email&utm_campaign=cart_recovery`;
  const items = Array.isArray(order.items) ? order.items.slice(0, 4) : [];
  const itemsHtml = items.map((item: any) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
        <strong>${escapeHtml(item.name)}</strong>
        <span style="color:#6b7280;"> × ${escapeHtml(item.quantity || 1)}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;">$${Number(item.lineTotal || item.price || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const customerName = escapeHtml(order.customerName || order.customer?.name || 'there');
  const total = getOrderTotal(order).toFixed(2);

  const html = `
    <div style="margin:0;padding:0;background:#f7f4ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2933;">
      <div style="max-width:620px;margin:0 auto;padding:28px 16px;">
        <div style="background:#fffaf0;border:1px solid #eadfca;border-radius:24px;overflow:hidden;">
          <div style="padding:30px 28px;background:linear-gradient(135deg,#315c45,#7a5c2e);color:white;">
            <p style="margin:0 0 8px;text-transform:uppercase;letter-spacing:.12em;font-size:12px;">Taste of Gratitude</p>
            <h1 style="margin:0;font-size:28px;line-height:1.2;">Your wellness order is still waiting.</h1>
          </div>
          <div style="padding:28px;">
            <p style="font-size:17px;line-height:1.6;margin:0 0 16px;">Hi ${customerName},</p>
            <p style="font-size:16px;line-height:1.7;margin:0 0 20px;">You started an order with Taste of Gratitude but did not finish checkout. If it still feels right, you can come back and complete it securely through Square.</p>
            ${itemsHtml ? `<table style="width:100%;border-collapse:collapse;margin:18px 0;">${itemsHtml}<tr><td style="padding:14px 0;font-weight:700;">Estimated total</td><td style="padding:14px 0;text-align:right;font-weight:700;">$${total}</td></tr></table>` : ''}
            <div style="text-align:center;margin:28px 0;">
              <a href="${url}" style="display:inline-block;background:#315c45;color:#fff;text-decoration:none;border-radius:999px;padding:14px 24px;font-weight:700;">Return to secure checkout</a>
            </div>
            <div style="background:#f1eadb;border-radius:18px;padding:18px;margin-top:20px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">Small-batch products are prepared with care around market flow and fulfillment windows. If you need help, reply to this email and we’ll take care of you.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const text = `Hi ${customerName}, you started a Taste of Gratitude order but did not finish checkout. Return to secure checkout: ${url}`;
  return { html, text, url };
}

async function handleCron(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const now = new Date();
  const recoveryEnd = new Date(now.getTime() - RECOVERY_AFTER_MINUTES * 60 * 1000);
  const recoveryStart = new Date(now.getTime() - ABANDON_AFTER_HOURS * 60 * 60 * 1000);
  const abandonBefore = recoveryStart;

  try {
    const { db } = await connectToDatabase();

    const recoveryCandidates = await db.collection('orders')
      .find({
        $and: [
          dateRangeMatch(recoveryStart, recoveryEnd),
          { paymentStatus: { $in: PENDING_PAYMENT_STATUSES } },
          { status: { $nin: TERMINAL_STATUSES } },
          { paymentId: { $exists: false } },
          { squarePaymentId: { $exists: false } },
          { abandonedRecoverySentAt: { $exists: false } },
          { abandonedRecoverySkippedAt: { $exists: false } },
          { emailSentAt: { $exists: false } },
          { $or: [{ customerEmail: { $type: 'string' } }, { 'customer.email': { $type: 'string' } }] },
        ],
      })
      .sort({ createdAt: 1 })
      .limit(MAX_RECOVERY_EMAILS)
      .toArray();

    let recoverySent = 0;
    let recoverySkipped = 0;
    let recoveryFailed = 0;

    for (const order of recoveryCandidates) {
      const email = getCustomerEmail(order);
      if (!email) continue;

      const pref = await (canSendEmail as any)(null, 'promotional', email);
      if (!pref.allowed) {
        recoverySkipped++;
        await db.collection('orders').updateOne(
          { id: order.id },
          { $set: { abandonedRecoverySkippedAt: now, abandonedRecoverySkipReason: pref.reason, updatedAt: now } }
        );
        continue;
      }

      const { html, text, url } = buildRecoveryEmail(order);
      const unsubscribeToken = generateUnsubscribeToken(email, email);
      const result = await sendEmail({
        to: email,
        subject: 'Your Taste of Gratitude order is still waiting',
        html,
        text,
        emailType: 'promotional',
        template: 'abandoned_cart_recovery',
        orderId: order.id,
        customerEmail: email,
        metadata: {
          orderNumber: order.orderNumber || null,
          recoveryUrl: url,
          source: 'cleanup_abandoned_orders_cron',
        },
        listUnsubscribeUrl: `${baseUrl()}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`,
      });

      if (result.success) {
        recoverySent++;
        await db.collection('orders').updateOne(
          { id: order.id },
          {
            $set: {
              abandonedRecoverySentAt: now,
              abandonedRecoveryMessageId: result.messageId || null,
              updatedAt: now,
            },
          }
        );
      } else {
        recoveryFailed++;
        await db.collection('orders').updateOne(
          { id: order.id },
          {
            $set: {
              abandonedRecoveryFailedAt: now,
              abandonedRecoveryError: result.error || 'unknown',
              updatedAt: now,
            },
          }
        );
      }
    }

    const abandonedOrders = await db.collection('orders')
      .find(abandonedCandidateMatch(abandonBefore), { projection: { id: 1 } })
      .limit(500)
      .toArray();
    const abandonedOrderIds = abandonedOrders.map((order: any) => order.id).filter(Boolean);

    let markedAbandoned = 0;
    let releasedLocks = 0;

    if (abandonedOrderIds.length > 0) {
      const updateResult = await db.collection('orders').updateMany(
        { id: { $in: abandonedOrderIds } },
        {
          $set: {
            status: 'abandoned',
            paymentStatus: 'abandoned',
            abandonedAt: now,
            updatedAt: now,
          },
        }
      );
      markedAbandoned = updateResult.modifiedCount;

      const lockResult = await db.collection('inventory_locks').updateMany(
        { orderId: { $in: abandonedOrderIds }, status: 'active' },
        {
          $set: {
            status: 'released',
            releasedAt: now,
            releaseReason: 'abandoned_order_cleanup',
            updatedAt: now,
          },
        }
      );
      releasedLocks = lockResult.modifiedCount;
    }

    const durationMs = Date.now() - startedAt;
    logger.info('Cron', 'Abandoned order cleanup completed', {
      recoveryCandidates: recoveryCandidates.length,
      recoverySent,
      recoverySkipped,
      recoveryFailed,
      markedAbandoned,
      releasedLocks,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      recoveryCandidates: recoveryCandidates.length,
      recoverySent,
      recoverySkipped,
      recoveryFailed,
      markedAbandoned,
      releasedLocks,
      durationMs,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error('Cron', 'Abandoned order cleanup failed', error);
    return NextResponse.json(
      { success: false, error: 'Abandoned order cleanup failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
