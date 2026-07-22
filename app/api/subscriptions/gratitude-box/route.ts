export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import resend from '@/lib/email/resend-client';
import { createPaymentLink } from '@/lib/square-api';
import { BUNDLES } from '@/data/bundles';

const SubscriptionSchema = z.object({
  name: z.string().max(120).optional().or(z.literal('')),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal('')),
  marketId: z.string().min(1).max(80),
  bundleId: z.string().min(1).max(80),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']).default('weekly'),
});

const GRATITUDE_BOX_PILOT_PRICE_CENTS = Number(process.env.GRATITUDE_BOX_PILOT_PRICE_CENTS || 7000);

function isSquarePaymentConfigured() {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

function getAppBaseUrl(request: NextRequest) {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/$/, '');
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = SubscriptionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (!data.email) {
    return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
  }

  const paymentConfigured = isSquarePaymentConfigured();
  const selectedBundle = BUNDLES.find((bundle) => bundle.id === data.bundleId || bundle.slug === data.bundleId);
  const id = randomUUID();
  const now = new Date();
  const document = {
    id,
    type: 'gratitude_box',
    name: data.name?.trim() || null,
    email: data.email ? data.email.toLowerCase().trim() : null,
    phone: data.phone?.trim() || null,
    marketId: data.marketId,
    bundleId: data.bundleId,
    frequency: data.frequency,
    status: paymentConfigured ? 'pending_payment' : 'waitlist',
    billingStatus: paymentConfigured ? 'pending_payment' : 'pending',
    paymentProvider: paymentConfigured ? 'square' : null,
    amountDue: paymentConfigured ? GRATITUDE_BOX_PILOT_PRICE_CENTS / 100 : 0,
    amountPaid: 0,
    pilotPriceCents: paymentConfigured ? GRATITUDE_BOX_PILOT_PRICE_CENTS : 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const { db } = await connectToDatabase();

    let payment: null | {
      provider: 'square';
      status: 'PENDING';
      url: string;
      paymentLinkId: string;
      squareOrderId?: string;
      amountDue: number;
    } = null;

    if (paymentConfigured) {
      const paymentResult = await createPaymentLink({
        referenceId: id,
        lineItems: [{
          name: `Gratitude Box paid pilot — ${selectedBundle?.name || data.bundleId}`.slice(0, 255),
          quantity: '1',
          basePriceMoney: { amount: GRATITUDE_BOX_PILOT_PRICE_CENTS, currency: 'USD' },
        }],
        description: `Taste of Gratitude Gratitude Box paid pilot ${id}`,
        redirectUrl: `${getAppBaseUrl(request)}/subscriptions/gratitude-box?payment=return&subscription=${encodeURIComponent(id)}`,
        buyerEmail: document.email || undefined,
        buyerPhone: document.phone || undefined,
        metadata: {
          localOrderId: id,
          subscriptionIntentId: id,
          source: 'gratitude_box_paid_pilot',
        },
        idempotencyKey: `gratitude_box_${id}`,
      });

      const paymentLink = paymentResult.data?.paymentLink;
      if (!paymentResult.success || !paymentLink?.url) {
        const detail = paymentResult.errors?.[0]?.detail || paymentResult.errors?.[0]?.code || 'Square payment link creation failed';
        logger.error('GratitudeBox', 'Payment link creation failed', { id, detail });
        return NextResponse.json(
          { success: false, error: 'Failed to create secure payment link', code: 'PAYMENT_LINK_FAILED' },
          { status: 502 }
        );
      }

      payment = {
        provider: 'square',
        status: 'PENDING',
        url: paymentLink.url,
        paymentLinkId: paymentLink.id,
        squareOrderId: paymentLink.orderId,
        amountDue: GRATITUDE_BOX_PILOT_PRICE_CENTS / 100,
      };

      Object.assign(document, {
        paymentLinkId: paymentLink.id,
        paymentUrl: paymentLink.url,
        squareOrderId: paymentLink.orderId || null,
      });
    }

    await db.collection('subscription_intents').updateOne(
      {
        type: 'gratitude_box',
        $or: [
          ...(document.email ? [{ email: document.email }] : []),
          ...(document.phone ? [{ phone: document.phone }] : []),
        ],
      },
      { $set: document, $setOnInsert: { firstCapturedAt: now } },
      { upsert: true }
    );

    await db.collection('newsletter_subscribers').updateOne(
      document.email ? { email: document.email } : { phone: document.phone },
      {
        $set: {
          email: document.email,
          phone: document.phone,
          firstName: document.name,
          source: paymentConfigured ? 'gratitude_box_paid_pilot' : 'gratitude_box_waitlist',
          intent: paymentConfigured ? 'subscription_paid_pilot_pending_payment' : 'subscription_waitlist',
          marketInterest: document.marketId,
          subscribedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    if (!paymentConfigured && resend && document.email) {
      try {
        await resend.emails.send({
          from: 'Taste of Gratitude <community@tasteofgratitude.shop>',
          to: document.email,
          subject: 'You are on the Gratitude Box waitlist',
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #1c1917;">
              <h2 style="color: #047857;">Thanks for joining the Gratitude Box waitlist.</h2>
              <p>We will text you before your first box is billed and confirm your market pickup window.</p>
              <p>In the meantime, you can <a href="https://tasteofgratitude.shop/weekly-menu">preorder this week&apos;s menu</a>.</p>
              <p style="font-size:12px;color:#78716c;margin-top:24px;">
                <a href="https://tasteofgratitude.shop/unsubscribe?email=${encodeURIComponent(document.email || '')}">Unsubscribe</a>
              </p>
            </div>
          `,
        });
      } catch (err) {
        logger.warn('GratitudeBox', 'Confirmation email failed', { email: document.email, error: (err as Error).message });
      }
    }

    if (payment) {
      return NextResponse.json({
        success: true,
        id,
        status: 'pending_payment',
        billingStatus: 'pending_payment',
        payment,
        message: 'Complete secure payment to reserve your first Gratitude Box pilot week.',
      });
    }
  } catch (error) {
    logger.error('GratitudeBox', 'Subscription intent persistence failed', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save subscription intent' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, id, message: 'Thanks — you are on the Gratitude Box waitlist.' });
}
