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
      replyTo: 'nook@tasteofgratitude.net',
      emailType: 'contact_form',
    });

    if (!result.success) {
      logger.error('Contact', 'Failed to send contact form email', { error: result.error });
      return NextResponse.json(
        { error: 'Unable to send your message right now. Please try again.', _debug: result.error },
        { status: 500 }
      );
    }

    // Send confirmation email to the submitter
    const confirmationHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🌿 Thank You, ${escapedName}!</h1>
          <p style="color: #d1fae5; margin: 8px 0 0; font-size: 14px;">We received your message and will get back to you soon.</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 16px;">
            Hi ${escapedName}, thanks for reaching out to Taste of Gratitude! We appreciate you taking the time to contact us about <strong>"${escapedSubject}"</strong>. A member of our team will respond within 24 hours.
          </p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="margin: 0 0 12px; font-size: 16px; color: #166534;">📍 Come See Us This Saturday!</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; vertical-align: top; width: 20px;">🌾</td>
                <td style="padding: 8px 0 8px 8px;">
                  <strong style="color: #166534;">Serenbe Farmers Market</strong><br>
                  <span style="color: #374151; font-size: 13px;">Saturdays, 9 AM – 1 PM<br>10950 Hutcheson Ferry Rd, Palmetto, GA 30268<br>Look for the gold banners at Booth #12!</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; vertical-align: top;">🏡</td>
                <td style="padding: 8px 0 8px 8px;">
                  <strong style="color: #166534;">DHA Dunwoody Farmers Market</strong><br>
                  <span style="color: #374151; font-size: 13px;">Saturdays, 9 AM – 12 PM<br>4770 N Peachtree Rd, Dunwoody, GA 30338<br>Brook Run Park — fresh samples every week!</span>
                </td>
              </tr>
            </table>
          </div>

          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="margin: 0 0 12px; font-size: 16px; color: #92400e;">🌊 Try Our Bestsellers</h2>
            <p style="margin: 0 0 8px; color: #374151; font-size: 14px; line-height: 1.5;">
              Our wildcrafted sea moss gels are hand-crafted with 92 essential minerals. Customer favorites include:
            </p>
            <ul style="margin: 0; padding-left: 18px; color: #374151; font-size: 14px; line-height: 1.8;">
              <li><strong>Golden Glow Gel</strong> — Turmeric + ginger for inflammation & immunity</li>
              <li><strong>Elderberry Moss</strong> — Immune support powerhouse</li>
              <li><strong>Blue Lotus</strong> — Ashwagandha + maca for energy & calm</li>
              <li><strong>Grateful Greens</strong> — Spirulina + chlorophyll for cellular rejuvenation</li>
            </ul>
            <p style="margin: 12px 0 0; text-align: center;">
              <a href="https://tasteofgratitude.shop/catalog" style="display: inline-block; padding: 12px 28px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Browse All Products</a>
            </p>
          </div>

          <p style="font-size: 14px; color: #6b7280; line-height: 1.5; margin: 16px 0 0;">
            With gratitude,<br>
            <strong>The Taste of Gratitude Team</strong><br>
            <a href="https://tasteofgratitude.shop" style="color: #059669;">tasteofgratitude.shop</a>
          </p>
        </div>
        <div style="background: #f9fafb; padding: 16px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            You're receiving this because you contacted us at tasteofgratitude.shop.
          </p>
        </div>
      </div>
    `;

    const confirmationText = `Hi ${name},\n\nThank you for reaching out to Taste of Gratitude! We received your message about "${subject}" and will get back to you within 24 hours.\n\nCome see us this Saturday!\n\nSerenbe Farmers Market — Saturdays, 9 AM – 1 PM\n10950 Hutcheson Ferry Rd, Palmetto, GA 30268 (Booth #12)\n\nDHA Dunwoody Farmers Market — Saturdays, 9 AM – 12 PM\n4770 N Peachtree Rd, Dunwoody, GA 30338 (Brook Run Park)\n\nBestsellers: Golden Glow Gel, Elderberry Moss, Blue Lotus, Grateful Greens\nShop: https://tasteofgratitude.shop/catalog\n\nWith gratitude,\nThe Taste of Gratitude Team`;

    try {
      await sendEmail({
        to: email,
        subject: `Thanks for reaching out, ${name}! — Taste of Gratitude`,
        html: confirmationHtml,
        text: confirmationText,
        replyTo: 'nook@tasteofgratitude.net',
        emailType: 'contact_form',
      });
      logger.info('Contact', 'Confirmation email sent to submitter', { to: email });
    } catch (confirmErr) {
      logger.warn('Contact', 'Failed to send confirmation to submitter', {
        to: email,
        error: confirmErr instanceof Error ? confirmErr.message : String(confirmErr),
      });
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
