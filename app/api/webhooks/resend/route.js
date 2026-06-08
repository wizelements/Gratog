export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;
const SVIX_TOLERANCE_SECONDS = 5 * 60;

/**
 * Verify Resend webhook signature.
 * Resend signs webhooks with Svix headers: svix-id, svix-timestamp,
 * svix-signature. Keep a legacy HMAC fallback for any older test tooling that
 * still posts `resend-signature` as hex(payload, secret).
 */
function verifyWebhookSignature(payload, headers) {
  if (!RESEND_WEBHOOK_SECRET) {
    logger.warn('Webhook', 'RESEND_WEBHOOK_SECRET not configured');
    return process.env.NODE_ENV !== 'production';
  }

  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');

  if (svixId && svixTimestamp && svixSignature) {
    return verifySvixSignature(payload, {
      id: svixId,
      timestamp: svixTimestamp,
      signature: svixSignature,
    });
  }

  const legacySignature = headers.get('resend-signature');
  if (!legacySignature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', RESEND_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const actual = Buffer.from(legacySignature || '');
  const expected = Buffer.from(expectedSignature);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function verifySvixSignature(payload, { id, timestamp, signature }) {
  const numericTimestamp = Number(timestamp);
  if (!Number.isFinite(numericTimestamp)) return false;

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - numericTimestamp);
  if (ageSeconds > SVIX_TOLERANCE_SECONDS) {
    logger.warn('Webhook', 'Rejected stale Resend webhook signature', { ageSeconds });
    return false;
  }

  const secretBytes = RESEND_WEBHOOK_SECRET.startsWith('whsec_')
    ? Buffer.from(RESEND_WEBHOOK_SECRET.slice('whsec_'.length), 'base64')
    : Buffer.from(RESEND_WEBHOOK_SECRET, 'utf8');
  const signedContent = `${id}.${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64');

  return signature
    .split(' ')
    .map(part => part.trim())
    .filter(Boolean)
    .some((part) => {
      const [version, candidate] = part.split(',');
      if (version !== 'v1' || !candidate) return false;

      const actual = Buffer.from(candidate, 'base64');
      const expectedBuffer = Buffer.from(expected, 'base64');
      return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
    });
}

function getEventEmailId(data = {}) {
  return data.email_id || data.emailId || data.id || null;
}

function normalizeRecipientEmail(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim().toLowerCase() : null;
}

function shouldPromoteStatus(status) {
  return ['sent', 'delivered', 'delayed', 'bounced', 'complained', 'failed'].includes(status);
}

async function recordSuppression(db, status, data, emailId, webhookType) {
  if (!['bounced', 'complained'].includes(status)) return;

  const email = normalizeRecipientEmail(data?.to || data?.email);
  if (!email) return;

  const now = new Date();
  const reason = status === 'complained' ? 'complaint' : 'bounce';

  await db.collection('email_suppressions').updateOne(
    { email, reason },
    {
      $set: {
        email,
        reason,
        active: true,
        source: 'resend_webhook',
        provider: 'resend',
        lastEventType: webhookType,
        messageId: emailId,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  if (status === 'complained') {
    await db.collection('unsubscribes').updateOne(
      { email },
      {
        $set: {
          email,
          source: 'resend_complaint',
          unsubscribedAt: now,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
  }
}

/**
 * POST /api/webhooks/resend - Handle Resend webhook events
 * 
 * Events: email.sent, email.delivered, email.delivery_delayed,
 *         email.complained, email.bounced, email.opened, email.clicked
 */
export async function POST(request) {
  let db = null;
  let svixId = null;

  try {
    svixId = request.headers.get('svix-id');
    const rawBody = await request.text();
    
    // Verify signature in production
    if (!verifyWebhookSignature(rawBody, request.headers)) {
      logger.error('Webhook', 'Invalid Resend webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const event = JSON.parse(rawBody);
    const { type, data } = event;
    const emailId = getEventEmailId(data);
    
    logger.info('Webhook', `Resend event received: ${type}`, { emailId, svixId });
    
    ({ db } = await connectToDatabase());

    if (svixId) {
      const existingEvent = await db.collection('resend_webhook_events').findOne(
        { svixId },
        { projection: { processedAt: 1 } }
      );

      if (existingEvent?.processedAt) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      await db.collection('resend_webhook_events').updateOne(
        { svixId },
        {
          $set: {
            svixId,
            type,
            messageId: emailId,
            status: 'processing',
            lastReceivedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    }
    
    // Map Resend event types to our status
    const statusMap = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.delivery_delayed': 'delayed',
      'email.failed': 'failed',
      'email.complained': 'complained',
      'email.bounced': 'bounced',
      'email.opened': 'opened',
      'email.clicked': 'clicked'
    };
    
    const status = statusMap[type];
    if (!status) {
      logger.warn('Webhook', `Unknown Resend event type: ${type}`);
      if (svixId) {
        await db.collection('resend_webhook_events').updateOne(
          { svixId },
          { $set: { status: 'ignored', processedAt: new Date(), ignoredReason: 'unknown_event_type' } }
        );
      }
      return NextResponse.json({ received: true, ignored: true });
    }

    await recordSuppression(db, status, data, emailId, type);
    
    // Update email_sends record (check both resendId and messageId for correlation)
    let updateResult = { matchedCount: 0 };
    if (emailId) {
      updateResult = await db.collection('email_sends').updateOne(
        {
          $or: [
            { resendId: emailId },
            { messageId: emailId }
          ]
        },
        {
          $set: {
            [`events.${status}`]: new Date(),
            lastEventType: status,
            lastEventAt: new Date(),
            deliveryStatus: status,
            updatedAt: new Date(),
            ...(shouldPromoteStatus(status) && { status }),
            ...(status === 'delivered' && { deliveredAt: new Date() }),
            ...(status === 'bounced' && { bouncedAt: new Date() }),
            ...(status === 'complained' && { complainedAt: new Date() }),
          },
          $push: {
            eventLog: {
              type: status,
              timestamp: new Date(),
              svixId,
              data: {
                to: data.to,
                subject: data.subject,
                ...(data.click && { clickedUrl: data.click.link }),
                ...(data.bounce && { bounceType: data.bounce.type })
              }
            }
          }
        }
      );
    }
    
    // Also update email_logs for individual emails
    if (emailId) {
      await db.collection('email_logs').updateOne(
        { $or: [{ resendId: emailId }, { messageId: emailId }] },
        {
          $set: {
            deliveryStatus: status,
            lastEventAt: new Date(),
            updatedAt: new Date(),
          }
        }
      );
    }
    
    // Update campaign stats if this was a campaign email
    if (updateResult.matchedCount > 0) {
      const emailSend = await db.collection('email_sends').findOne({
        $or: [{ resendId: emailId }, { messageId: emailId }]
      });
      
      if (emailSend?.campaignId) {
        const statField = `stats.${status}`;
        await db.collection('campaigns').updateOne(
          { id: emailSend.campaignId },
          { $inc: { [statField]: 1 } }
        );
      }
    }

    if (svixId) {
      await db.collection('resend_webhook_events').updateOne(
        { svixId },
        {
          $set: {
            status: 'processed',
            processedAt: new Date(),
            emailSendMatched: updateResult.matchedCount > 0,
          },
        }
      );
    }
    
    return NextResponse.json({ received: true, status, matched: updateResult.matchedCount > 0 });
    
  } catch (error) {
    logger.error('Webhook', 'Resend webhook error:', error);
    if (db && svixId) {
      await db.collection('resend_webhook_events').updateOne(
        { svixId },
        {
          $set: {
            status: 'failed',
            failedAt: new Date(),
            error: error?.message || String(error),
          },
        },
        { upsert: true }
      );
    }
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Resend uses POST for webhooks
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Resend webhook endpoint active',
    events: ['email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced', 'email.complained', 'email.opened', 'email.clicked']
  });
}
