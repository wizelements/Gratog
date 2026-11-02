import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { rateLimitByIp } from '@/lib/rate-limit';
import { sendOwnerAlert } from '@/lib/owner-alerts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const HEADERS = { 'Cache-Control': 'no-store' };
const fail = (code: string, error: string, status = 422) =>
  NextResponse.json({ success: false, code, error }, { status, headers: HEADERS });

/**
 * Customer-initiated website messages on an already persisted NON-market order
 * request. This is NOT Square SMS and does not imply a Square conversation
 * exists. It gives the customer a reliable, durable way to ask questions when
 * the native Square Online-only Text Us widget cannot run on Vercel.
 */
export async function POST(request: NextRequest) {
  const throttle = await rateLimitByIp(request, 8);
  if (!throttle.ok) return fail('RATE_LIMITED', 'Too many messages. Please try again later.', 429);

  let body: any;
  try { body = await request.json(); } catch { return fail('INVALID_JSON', 'Invalid message.', 400); }
  const requestId = typeof body?.requestId === 'string' ? body.requestId : '';
  const messageId = typeof body?.messageId === 'string' ? body.messageId : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!/^nonmarket_order_request_[0-9a-f]{64}$/.test(requestId) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      message.length < 5 || message.length > 2000) {
    return fail('MESSAGE_DETAILS_REQUIRED', 'Provide a valid request, email, and message of 5–2,000 characters.');
  }

  try {
    const { db } = await connectToDatabase();
    const orders = db.collection('nonmarket_order_requests');
    const record = await orders.findOne({ _id: requestId, 'customer.email': email },
      { projection: { _id: 1, customer: 1, customerMessages: 1 } });
    if (!record) return fail('REQUEST_NOT_FOUND', 'The request and email could not be matched.', 404);
    const existingMessages = Array.isArray(record.customerMessages) ? record.customerMessages : [];
    if (existingMessages.some((entry: any) => entry.messageId === messageId)) {
      return NextResponse.json({ success: true, status: 'saved', messageId,
        delivery: 'merchant_inbox', squareSmsSent: false, duplicate: true }, { headers: HEADERS });
    }
    if (existingMessages.length >= 12) return fail('MESSAGE_LIMIT_REACHED',
      'Contact the business using the email in your acknowledgment for additional messages.', 409);

    const now = new Date();
    // Atomic idempotent append. Simultaneous retries cannot create duplicate
    // messages. A bounded array also prevents unbounded document growth.
    const updated = await orders.updateOne({
      _id: requestId,
      'customer.email': email,
      'customerMessages.messageId': { $ne: messageId },
      'customerMessages.11': { $exists: false },
    }, {
      $push: { customerMessages: { messageId, message, createdAt: now,
        source: 'website_form', delivery: 'merchant_inbox', squareSmsSent: false } },
      $set: { lastCustomerMessageAt: now },
    });
    if (updated.modifiedCount !== 1) {
      const reloaded = await orders.findOne({ _id: requestId, 'customer.email': email },
        { projection: { customerMessages: 1 } });
      if (Array.isArray(reloaded?.customerMessages) &&
          reloaded.customerMessages.some((entry: any) => entry.messageId === messageId)) {
        return NextResponse.json({ success: true, status: 'saved', messageId,
          delivery: 'merchant_inbox', squareSmsSent: false, duplicate: true }, { headers: HEADERS });
      }
      return fail('MESSAGE_CONFLICT', 'Please refresh and try again.', 409);
    }

    // The saved message remains visible in the authenticated order inbox even
    // when delivery of the owner alert is unavailable.
    try {
      await sendOwnerAlert({
        sourceEventId: 'customer_message:' + requestId + ':' + messageId,
        category: 'fresh_batch', severity: 'info',
        title: 'Customer message about website order request',
        body: 'Request ' + requestId.slice(-12) + ' / ' + record.customer.name +
          ' / Website message (not Square SMS): ' + message.slice(0, 600),
        actionUrl: 'https://tasteofgratitude.shop/admin/nonmarket-orders',
        channel: 'all', eventAt: now.toISOString(),
        metadata: { requestId, messageId, source: 'website_form' },
      });
    } catch { /* saved message can be reviewed by staff independently */ }

    return NextResponse.json({ success: true, status: 'saved', messageId,
      delivery: 'merchant_inbox', squareSmsSent: false,
      message: 'Your website message was saved for the Taste of Gratitude team. No SMS or payment was sent.' },
      { status: 201, headers: HEADERS });
  } catch {
    return fail('MESSAGE_SERVICE_UNAVAILABLE',
      'Your message could not be saved. Please use the business contact page.', 503);
  }
}
