export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getActiveMarketPickups } from '@/data/markets';
import { captureMarketingLead, getMarketingClient, needsMarketingEmail } from '@/lib/marketing/turso-store.mjs';

const LeadSchema = z.object({
  intent: z.string().min(1).max(80),
  source: z.string().max(120).optional().default('site'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  name: z.string().max(120).optional().or(z.literal('')),
  message: z.string().max(1000).optional().or(z.literal('')),
  metadata: z.record(z.unknown()).optional(),
  website: z.string().optional(),
  marketingConsent: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const bytes = Number(request.headers.get('content-length') || 0);
  if (bytes > 8192) return NextResponse.json({ success: false, error: 'Request is too large' }, { status: 413 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = LeadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const lead = parsed.data;
  if (lead.website) return NextResponse.json({ success: true, message: 'Thanks for your interest.' });
  if (!lead.email && !lead.phone) {
    return NextResponse.json({ success: false, error: 'Email or phone is required' }, { status: 400 });
  }
  if (needsMarketingEmail(lead.intent) && !lead.email) {
    return NextResponse.json({ success: false, error: 'Email is required for this signup' }, { status: 400 });
  }

  if ((lead.intent === 'weekly_menu_email' || lead.intent === 'email_signup') && lead.marketingConsent !== true) {
    return NextResponse.json({ success: false, error: 'Please confirm your email subscription consent' }, { status: 400 });
  }

  const metadata = lead.metadata || {};
  if (JSON.stringify(metadata).length > 3500) {
    return NextResponse.json({ success: false, error: 'Too much metadata' }, { status: 400 });
  }
  const marketId = typeof metadata.marketId === 'string'
    ? metadata.marketId
    : typeof metadata.landingMarketId === 'string' ? metadata.landingMarketId : null;
  if (marketId && needsMarketingEmail(lead.intent) && !getActiveMarketPickups().some(m => m.id === marketId)) {
    return NextResponse.json({ success: false, error: 'This market is not currently accepting signups' }, { status: 400 });
  }
  const campaign = typeof metadata.sourceCampaign === 'string'
    ? metadata.sourceCampaign.slice(0, 120)
    : typeof metadata.utmCampaign === 'string' ? metadata.utmCampaign.slice(0, 120) : null;

  try {
    const id = await captureMarketingLead(getMarketingClient(), {
      intent: lead.intent,
      source: lead.source,
      email: lead.email,
      phone: lead.phone?.trim(),
      name: lead.name?.trim(),
      message: lead.message?.trim(),
      marketId,
      campaign,
      metadata,
      marketingConsent: lead.marketingConsent === true,
    });
    return NextResponse.json({ success: true, persisted: true, id, message: 'Thanks — your request has been saved.' });
  } catch (error) {
    logger.error('LeadCapture', 'Turso lead persistence failed', { intent: lead.intent, code: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, persisted: false, error: 'We could not save your signup. Please try again shortly.' }, { status: 503 });
  }
}
