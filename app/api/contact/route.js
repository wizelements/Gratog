import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/resend-email';
import { logger } from '@/lib/logger';
import { RateLimit } from '@/lib/redis';
import { connectToDatabase } from '@/lib/db-optimized';

const CONTACT_INBOX = process.env.CONTACT_FORM_TO || 'jenneisha.glover@gmail.com';
const MAX_FIELD_LENGTH = 2000;

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstHop = forwardedFor.split(',')[0]?.trim();
    if (firstHop) return firstHop;
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function sanitize(value, maxLen = MAX_FIELD_LENGTH) {
  return String(value || '').trim().slice(0, maxLen);
}

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    if (!RateLimit.check(`contact_form:${clientIp}`, 5, 60 * 60)) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const name = sanitize(body.name, 200);
    const email = sanitize(body.email, 320);
    const subject = sanitize(body.subject, 500);
    const message = sanitize(body.message);

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const escapedName = name.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const escapedSubject = subject.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const escapedMessage = message.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])).replace(/\n/g, '<br>');

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">New Contact Form Message</h1>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 80px; vertical-align: top;">From:</td>
              <td style="padding: 8px 0; font-size: 14px;"><strong>${escapedName}</strong> &lt;${email}&gt;</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Subject:</td>
              <td style="padding: 8px 0; font-size: 14px;">${escapedSubject}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
          <div style="font-size: 14px; line-height: 1.6; color: #374151;">
            ${escapedMessage}
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">
            Sent from tasteofgratitude.shop contact form
          </p>
        </div>
      </div>
    `;

    const text = `New Contact Form Message\n\nFrom: ${name} <${email}>\nSubject: ${subject}\n\n${message}`;

    const result = await sendEmail({
      to: CONTACT_INBOX,
      subject: `[Contact] ${subject}`,
      html,
      text,
      replyTo: 'nook@tasteofgratitude.shop',
      emailType: 'contact_form',
    });

    if (!result.success) {
      logger.error('Contact', 'Failed to send contact form email', { error: result.error });
      return NextResponse.json(
        { error: 'Unable to send your message right now. Please try again.' },
        { status: 500 }
      );
    }

    try {
      const { db } = await connectToDatabase();
      await db.collection('contact_messages').insertOne({
        name,
        email,
        subject,
        message,
        ip: clientIp,
        resendId: result.messageId,
        createdAt: new Date(),
      });
    } catch (dbError) {
      logger.warn('Contact', 'Failed to log contact message to DB', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }

    logger.info('Contact', 'Contact form message sent', { to: CONTACT_INBOX, from: email });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Contact', 'Contact form error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
