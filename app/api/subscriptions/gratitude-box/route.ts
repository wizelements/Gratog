export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import resend from '@/lib/email/resend-client';

const SubscriptionSchema = z.object({
  name: z.string().max(120).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  marketId: z.string().min(1).max(80),
  bundleId: z.string().min(1).max(80),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']).default('weekly'),
});

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
  if (!data.email && !data.phone) {
    return NextResponse.json({ success: false, error: 'Email or phone is required' }, { status: 400 });
  }

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
    status: 'waitlist',
    billingStatus: 'pending', // stripe/square not yet active
    createdAt: now,
    updatedAt: now,
  };

  try {
    const { db } = await connectToDatabase();

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
          source: 'gratitude_box_waitlist',
          intent: 'subscription_waitlist',
          marketInterest: document.marketId,
          subscribedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    if (resend && document.email) {
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
  } catch (error) {
    logger.error('GratitudeBox', 'Subscription intent persistence failed', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save subscription intent' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, id, message: 'Thanks — you are on the Gratitude Box waitlist.' });
}
