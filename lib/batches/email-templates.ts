/**
 * Fresh Batch Request System — transactional email templates
 *
 * All templates return both HTML and plain text. They use the existing
 * `sendEmail` from `lib/resend-email.js` and record to `email_sends`.
 */

import { sendEmail } from '@/lib/resend-email';
import { EMAIL_SENDERS } from '@/lib/email-config';
import { customerStatusCopy, type RequestStatus } from './types';

const FROM = EMAIL_SENDERS.hello.formatted;
const REPLY_TO = EMAIL_SENDERS.support.address;

function baseHtml(subject: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; background: #f8f8f6; margin: 0; padding: 24px; }
      .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; }
      h1 { font-size: 20px; margin: 0 0 16px; }
      p { line-height: 1.6; margin: 0 0 16px; }
      .cta { display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; margin: 8px 0; }
      .footer { font-size: 13px; color: #6b7280; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    </style>
  </head>
  <body>
    <div class="container">
      ${body}
      <div class="footer">
        <p>Taste of Gratitude · Atlanta-area fresh drinks · Pickup at the market</p>
        <p>This is a transactional message about your request. Update your preferences at any time by replying to this email.</p>
      </div>
    </div>
  </body>
</html>
  `.trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface RequestReceivedContext {
  requestId: string;
  email: string;
  productName: string | null;
  flavorProfile: string | null;
  flavorText: string | null;
  quantity: string;
  marketName: string;
  status: RequestStatus;
  requestUrl?: string;
}

interface FlavorDescription {
  productName: string | null;
  flavorProfile: string | null;
  flavorText: string | null;
}

function describeFlavor(ctx: FlavorDescription): string {
  if (ctx.productName) return escapeHtml(ctx.productName);
  if (ctx.flavorProfile) return escapeHtml(ctx.flavorProfile.replace(/-/g, ' '));
  if (ctx.flavorText) return escapeHtml(ctx.flavorText);
  return 'a flavor of your choice';
}

export async function sendRequestReceivedEmail(ctx: RequestReceivedContext) {
  const subject = 'We received your fresh batch request';
  const statusMessage = customerStatusCopy(ctx.status);
  const flavor = describeFlavor(ctx);
  const htmlBody = `
    <h1>Your request is in.</h1>
    <p>Hi there,</p>
    <p>We received your request for ${flavor} (${escapeHtml(ctx.quantity)}) for pickup at ${escapeHtml(ctx.marketName)}.</p>
    <p><strong>${statusMessage}</strong> We will confirm availability, price, and pickup details by email before any payment is requested.</p>
    ${ctx.requestUrl ? `<p><a class="cta" href="${escapeHtml(ctx.requestUrl)}">View your request</a></p>` : ''}
    <p>If you have questions, reply to this email anytime.</p>
  `;

  return sendEmail({
    to: ctx.email,
    from: FROM,
    replyTo: REPLY_TO,
    subject,
    html: baseHtml(subject, htmlBody),
    text: `Your request is in.\n\nWe received your request for ${flavor} (${ctx.quantity}) for pickup at ${ctx.marketName}.\n\n${statusMessage} We will confirm availability, price, and pickup details by email before any payment is requested.\n\nRequest ID: ${ctx.requestId}\n\nReply to this email with any questions.`,
    emailType: 'fresh_batch_request',
    template: 'fresh_batch_request_received',
    customerEmail: ctx.email,
    metadata: { requestId: ctx.requestId, status: ctx.status },
  });
}

export interface BatchConfirmedContext {
  requestId: string;
  email: string;
  batchName: string;
  productName: string | null;
  flavorProfile: string | null;
  flavorText: string | null;
  quantity: string;
  marketName: string;
  productionDate: string;
  reservationUrl?: string;
  finalPriceCents: number;
  depositCents: number;
  setupFeeCents: number;
}

export async function sendBatchConfirmedEmail(ctx: BatchConfirmedContext) {
  const subject = `Your batch is confirmed: ${ctx.batchName}`;
  const flavor = describeFlavor(ctx);
  const total = (ctx.finalPriceCents / 100).toFixed(2);
  const deposit = (ctx.depositCents / 100).toFixed(2);
  const htmlBody = `
    <h1>Your batch is confirmed.</h1>
    <p>Good news — we confirmed ${ctx.batchName} with ${flavor} for ${escapeHtml(ctx.quantity)}.</p>
    <p><strong>Production date:</strong> ${escapeHtml(ctx.productionDate)}<br/><strong>Pickup market:</strong> ${escapeHtml(ctx.marketName)}</p>
    <p><strong>Total:</strong> $${total}${ctx.setupFeeCents > 0 ? ` (includes a $${(ctx.setupFeeCents / 100).toFixed(2)} setup fee)` : ''}<br/><strong>Deposit due now:</strong> $${deposit}</p>
    ${ctx.reservationUrl ? `<p><a class="cta" href="${escapeHtml(ctx.reservationUrl)}">Reserve and pay deposit</a></p>` : ''}
    <p>Your reservation is not complete until the deposit is paid. If you change your mind before paying, no charge is made.</p>
  `;

  return sendEmail({
    to: ctx.email,
    from: FROM,
    replyTo: REPLY_TO,
    subject,
    html: baseHtml(subject, htmlBody),
    text: `Your batch is confirmed: ${ctx.batchName}.\n\nWe confirmed ${flavor} for ${ctx.quantity}.\nProduction date: ${ctx.productionDate}\nPickup market: ${ctx.marketName}\nTotal: $${total}\nDeposit due now: $${deposit}\n\n${ctx.reservationUrl ? `Reserve here: ${ctx.reservationUrl}` : ''}\n\nYour reservation is not complete until the deposit is paid.`,
    emailType: 'fresh_batch_request',
    template: 'fresh_batch_confirmed',
    customerEmail: ctx.email,
    metadata: { requestId: ctx.requestId, batchName: ctx.batchName },
  });
}
