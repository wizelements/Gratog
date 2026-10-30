import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { orderMessagingConfigured, sendOrderToOwners } from '@/lib/order-chat-delivery';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const InquirySchema = z.object({
  requestId: z.string().uuid(),
  intent: z.enum(['market', 'preorder', 'delivery']),
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(10).max(25),
  items: z.string().trim().min(2).max(600),
  desiredDate: z.string().trim().max(80).optional().default(''),
  location: z.string().trim().max(100).optional().default(''),
  notes: z.string().trim().max(400).optional().default(''),
  contactConsent: z.literal(true),
  website: z.string().max(100).optional().default(''),
}).strict();

const json = (value: Record<string, unknown>, status: number) =>
  NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });

// Nonsecret readiness helps the UI fail closed before asking for customer details.
export async function GET() {
  return json({ available: orderMessagingConfigured() }, 200);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  // Browser-only channel: avoid cross-site form posts.
  if (!origin) return json({ success: false, error: 'Start your request from our website.' }, 403);
  try {
    if (new URL(origin).host !== new URL(request.url).host) {
      return json({ success: false, error: 'Start your request from our website.' }, 403);
    }
  } catch {
    return json({ success: false, error: 'Invalid request origin.' }, 403);
  }

  if (!orderMessagingConfigured()) {
    return json({
      success: false, code: 'MESSAGING_UNAVAILABLE',
      error: 'Messaging is not available yet. Please try again later.',
    }, 503);
  }

  const length = Number(request.headers.get('content-length') || 0);
  if (length > 3500) return json({ success: false, error: 'Message too long.' }, 413);
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return json({ success: false, error: 'Invalid message.' }, 400); }
  const parsed = InquirySchema.safeParse(raw);
  if (!parsed.success) return json({ success: false, error: 'Complete the required fields and callback number.' }, 400);
  if (parsed.data.website) return json({ success: false, error: 'Message not accepted.' }, 400);

  const { requestId, intent, name, phone, items, desiredDate, location, notes } = parsed.data;
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  try {
    const result = await sendOrderToOwners({
      requestId, intent, name, phone, items, desiredDate, location, notes,
    }, ip);

    if (result.status === 'accepted') {
      return json({
        success: true, status: 'accepted', reference: result.reference,
        message: 'Both team members have been notified through our messaging provider. Please wait for confirmation.',
      }, 202);
    }
    if (result.status === 'throttled') {
      return json({ success: false, code: 'TOO_MANY_REQUESTS',
        error: 'Too many requests. Please try again later.' }, 429);
    }
    if (result.status === 'unavailable') {
      return json({ success: false, code: 'MESSAGING_UNAVAILABLE',
        error: 'Messaging is not available right now. Please try again later.' }, 503);
    }
    if (result.status === 'duplicate') {
      return json({ success: false, code: 'ALREADY_ATTEMPTED',
        error: 'This request has already been attempted. Please wait for our response rather than submitting it again.',
        reference: result.reference }, 409);
    }
    return json({ success: false, code: 'DELIVERY_UNCONFIRMED',
      error: 'We could not confirm that both team members received this request. Do not resubmit immediately; please contact us through the usual contact page.',
      reference: result.reference }, 502);
  } catch {
    // Unknown provider/store state is never represented as successful delivery.
    return json({ success: false, code: 'SUBMISSION_UNCONFIRMED',
      error: 'We could not verify your message submission. Do not submit it again immediately. Please contact us through the contact page.' }, 503);
  }
}
