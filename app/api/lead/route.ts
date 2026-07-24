export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

const LeadSchema = z.object({
  intent: z.string().min(1).max(80),
  source: z.string().max(120).optional().default('site'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  name: z.string().max(120).optional().or(z.literal('')),
  message: z.string().max(1000).optional().or(z.literal('')),
  metadata: z.record(z.unknown()).optional(),
  website: z.string().optional(),
});

const EMAIL_REQUIRED_INTENTS = new Set([
  'weekly_menu_email',
  'email_signup',
  'subscription_waitlist',
  'preorder_intent_no_market',
]);

function intentRequiresEmail(intent: string): boolean {
  return EMAIL_REQUIRED_INTENTS.has(intent);
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const lead = parsed.data;
  if (lead.website) {
    return NextResponse.json({ success: true, message: 'Thanks — you are on the list.' });
  }

  if (!lead.email && !lead.phone) {
    return NextResponse.json({ success: false, error: 'Email or phone is required' }, { status: 400 });
  }
  if (intentRequiresEmail(lead.intent) && !lead.email) {
    return NextResponse.json({ success: false, error: 'Email is required for this signup' }, { status: 400 });
  }

  const id = randomUUID();
  const now = new Date();
  const document = {
    id,
    intent: lead.intent,
    source: lead.source || 'site',
    email: lead.email ? lead.email.toLowerCase().trim() : null,
    phone: lead.phone?.trim() || null,
    name: lead.name?.trim() || null,
    message: lead.message?.trim() || null,
    metadata: lead.metadata || {},
    userAgent: request.headers.get('user-agent') || null,
    createdAt: now,
    updatedAt: now,
    status: 'new',
  };
  const marketInterest = typeof document.metadata.marketId === 'string'
    ? document.metadata.marketId
    : null;
  const sourceCampaign = typeof document.metadata.sourceCampaign === 'string'
    ? document.metadata.sourceCampaign
    : typeof document.metadata.utmCampaign === 'string'
      ? document.metadata.utmCampaign
      : null;

  try {
    const { db } = await connectToDatabase();
    await db.collection('lead_intents').updateOne(
      {
        intent: document.intent,
        $or: [
          ...(document.email ? [{ email: document.email }] : []),
          ...(document.phone ? [{ phone: document.phone }] : []),
        ],
      },
      { $set: document, $setOnInsert: { firstCapturedAt: now } },
      { upsert: true }
    );

    if (document.email && intentRequiresEmail(document.intent)) {
      await db.collection('newsletter_subscribers').updateOne(
        { email: document.email },
        {
          $set: {
            email: document.email,
            phone: document.phone,
            firstName: document.name,
            source: document.source,
            intent: document.intent,
            marketInterest,
            sourceCampaign,
            subscribedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );
    }
  } catch (error) {
    logger.warn('LeadCapture', 'Lead captured in UI but database persistence failed', {
      id,
      intent: document.intent,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({
      success: false,
      persisted: false,
      id,
      error: 'We could not save your signup. Please try again shortly.',
    }, { status: 503 });
  }

  return NextResponse.json({
    success: true,
    persisted: true,
    id,
    message: 'Thanks — you are on the list.',
  });
}
