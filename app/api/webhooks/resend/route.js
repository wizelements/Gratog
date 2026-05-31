export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

/**
 * Verify Resend webhook signature
 */
function verifyWebhookSignature(payload, signature) {
  if (!RESEND_WEBHOOK_SECRET) {
    logger.warn('Webhook', 'RESEND_WEBHOOK_SECRET not configured - skipping verification');
    return true; // Allow in dev mode
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', RESEND_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature || ''),
    Buffer.from(expectedSignature)
  );
}

/**
 * POST /api/webhooks/resend - Handle Resend webhook events
 * 
 * Events: email.sent, email.delivered, email.delivery_delayed,
 *         email.complained, email.bounced, email.opened, email.clicked
 */
export async function POST(request) {
  try {
    const signature = request.headers.get('resend-signature') || request.headers.get('svix-signature');
    const rawBody = await request.text();
    
    // Verify signature in production
    if (process.env.NODE_ENV === 'production' && !verifyWebhookSignature(rawBody, signature)) {
      logger.error('Webhook', 'Invalid Resend webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const event = JSON.parse(rawBody);
    const { type, data } = event;
    
    logger.info('Webhook', `Resend event received: ${type}`, { emailId: data?.email_id });
    
    const { db } = await connectToDatabase();
    
    // Map Resend event types to our status
    const statusMap = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.delivery_delayed': 'delayed',
      'email.complained': 'complained',
      'email.bounced': 'bounced',
      'email.opened': 'opened',
      'email.clicked': 'clicked'
    };
    
    const status = statusMap[type];
    if (!status) {
      logger.warn('Webhook', `Unknown Resend event type: ${type}`);
      return NextResponse.json({ received: true, ignored: true });
    }
    
    // Update email_sends record
    const updateResult = await db.collection('email_sends').updateOne(
      { resendId: data.email_id },
      {
        $set: {
          [`events.${status}`]: new Date(),
          lastEventType: status,
          lastEventAt: new Date()
        },
        $push: {
          eventLog: {
            type: status,
            timestamp: new Date(),
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
    
    // Also update email_logs for individual emails
    await db.collection('email_logs').updateOne(
      { resendId: data.email_id },
      {
        $set: {
          deliveryStatus: status,
          lastEventAt: new Date()
        }
      }
    );
    
    // Update campaign stats if this was a campaign email
    if (updateResult.matchedCount > 0) {
      const emailSend = await db.collection('email_sends').findOne({ resendId: data.email_id });
      
      if (emailSend?.campaignId) {
        const statField = `stats.${status}`;
        await db.collection('campaigns').updateOne(
          { id: emailSend.campaignId },
          { $inc: { [statField]: 1 } }
        );
      }
    }
    
    return NextResponse.json({ received: true, status });
    
  } catch (error) {
    logger.error('Webhook', 'Resend webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Resend uses POST for webhooks
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Resend webhook endpoint active',
    events: ['email.sent', 'email.delivered', 'email.bounced', 'email.opened', 'email.clicked']
  });
}
