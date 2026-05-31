export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendEmail } from '@/lib/resend-email';
import { logger } from '@/lib/logger';
import { CONTACT_EMAIL, SUPPORT_EMAIL } from '@/lib/site-config';

/**
 * Contact form endpoint.
 *
 * Validates input, stores the message in `contact_messages`, and dispatches a
 * notification email through the same Resend pipeline as transactional
 * mail (so it is tracked in `email_sends`).
 *
 * NEVER fails silently: every code path returns a useful status. Soft errors
 * (DB write OK, notification email failed) still return success because the
 * customer's intent was captured.
 */

const ContactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(254),
  subject: z.string().max(200).optional().default(''),
  message: z.string().min(1).max(5000),
  // Honey-pot
  website: z.string().optional(),
});

// In-memory rate limiter — same shape as auth/login. Per-IP.
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 min
const RATE_MAX = 5;
const rate = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rate.get(key);
  if (!entry || now > entry.resetAt) {
    rate.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count += 1;
  return true;
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function notificationHtml(opts: {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
    );
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="margin:0 0 12px">New contact form submission</h2>
      <p style="color:#555;margin:0 0 16px">Ref: ${esc(opts.id)}</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:4px 8px;color:#555">Name</td><td style="padding:4px 8px"><strong>${esc(opts.name)}</strong></td></tr>
        <tr><td style="padding:4px 8px;color:#555">Email</td><td style="padding:4px 8px"><a href="mailto:${esc(opts.email)}">${esc(opts.email)}</a></td></tr>
        <tr><td style="padding:4px 8px;color:#555">Subject</td><td style="padding:4px 8px">${esc(opts.subject || '(none)')}</td></tr>
      </table>
      <div style="margin-top:16px;padding:12px;background:#f6f6f6;border-radius:6px;white-space:pre-wrap">${esc(opts.message)}</div>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const parsed = ContactSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }
  const { name, email, subject, message, website } = parsed.data;

  // Honey-pot: bots fill this; humans never see the field.
  if (website && website.length > 0) {
    return NextResponse.json({ success: true });
  }

  const ip = clientIp(request);
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const id = randomUUID();
  const now = new Date();

  try {
    const { db } = await connectToDatabase();
    await db.collection('contact_messages').insertOne({
      id,
      name,
      email: email.toLowerCase(),
      subject: subject || '',
      message,
      ip,
      userAgent: request.headers.get('user-agent') || null,
      status: 'new',
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    logger.error('Contact', 'Failed to persist contact message', {
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { success: false, error: 'We could not save your message. Please try again.' },
      { status: 500 }
    );
  }

  // Best-effort notification to the support inbox. Failure here does NOT
  // fail the request because the message is already captured in Mongo.
  try {
    await sendEmail({
      to: SUPPORT_EMAIL || CONTACT_EMAIL,
      subject: `[Contact] ${subject || 'New message'} — ${name}`,
      html: notificationHtml({ id, name, email, subject, message }),
      text: `Contact ref ${id}\nFrom: ${name} <${email}>\nSubject: ${subject || '(none)'}\n\n${message}`,
      replyTo: email,
      emailType: 'contact_form',
      template: 'contact_notification',
      metadata: { contactId: id },
    });
  } catch (err) {
    logger.warn('Contact', 'Notification email failed (non-fatal)', {
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({
    success: true,
    id,
    message: "Thanks — we've received your message.",
  });
}
