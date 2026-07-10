#!/usr/bin/env npx tsx
/**
 * Pickup reminder emails — Resend only.
 *
 * Sends a 24-hour reminder email to customers with an upcoming market pickup.
 * Email includes signed confirm/cancel links. No SMS. No Twilio.
 *
 * Usage:
 *   npx tsx scripts/pickup-reminders.ts --dry-run
 *   npx tsx scripts/pickup-reminders.ts --send
 *
 * Defaults to dry-run unless --send is explicitly passed.
 */

import { connectToDatabase } from '../lib/db-optimized.js';
import { logger } from '../lib/logger.js';
import { Resend } from 'resend';
import { findOrdersNeedingReminder, updateConfirmationStatus } from '../lib/preorder/repository.js';
import { signOrderToken, buildOrderActionUrl } from '../lib/preorder/tokens.js';

interface Args {
  send: boolean;
  marketDay?: string;
  batchSize: number;
  delayMs: number;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { send: false, batchSize: 50, delayMs: 250 };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    const next = argv[i + 1];
    if (name === 'send') {
      out.send = true;
    } else if (name === 'market-day' && next && !next.startsWith('--')) {
      out.marketDay = next;
      i++;
    } else if (name === 'batch-size' && next && !next.startsWith('--')) {
      out.batchSize = Number(next) || 50;
      i++;
    } else if (name === 'delay-ms' && next && !next.startsWith('--')) {
      out.delayMs = Number(next) || 250;
      i++;
    }
  }
  return out;
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop').replace(/\/$/, '');
}

function buildReminderHtml(order: any): string {
  const confirmUrl = buildOrderActionUrl(baseUrl(), 'confirm', order.orderNumber, signOrderToken(order.orderNumber, 'confirm'));
  const cancelUrl = buildOrderActionUrl(baseUrl(), 'cancel', order.orderNumber, signOrderToken(order.orderNumber, 'cancel'));
  const statusUrl = `${baseUrl()}/preorder/status?order=${encodeURIComponent(order.orderNumber)}`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pickup reminder • Taste of Gratitude</title>
  </head>
  <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1c1917; max-width: 600px; margin: 0 auto; padding: 24px;">
    <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #047857;">Pickup reminder • Taste of Gratitude</p>

    <h1 style="font-size: 22px; margin: 16px 0 12px;">Your preorder is almost ready for pickup</h1>

    <p>Hi ${escapeHtml(order.customerName || 'there')}, your preorder will be waiting at the ${escapeHtml(order.pickupLocation || 'market')} pickup:</p>

    <ul style="padding-left: 20px;">
      <li><strong>Order #:</strong> ${escapeHtml(order.orderNumber)}</li>
      <li><strong>Waitlist #:</strong> ${escapeHtml(order.waitlistNumber || 'N/A')}</li>
      <li><strong>Pickup date:</strong> ${escapeHtml(order.pickupDate || 'See market schedule')}</li>
      <li><strong>Pickup hours:</strong> ${escapeHtml(order.pickupHours || 'See market schedule')}</li>
      <li><strong>Total:</strong> $${(Number(order.total) || 0).toFixed(2)} (pay at pickup)</li>
    </ul>

    <p style="margin-top: 24px;">
      <a href="${confirmUrl}" style="display: inline-block; padding: 14px 24px; background: #047857; color: #fff; text-decoration: none; border-radius: 9999px; font-weight: 600; margin-right: 8px;">Confirm pickup</a>
      <a href="${cancelUrl}" style="display: inline-block; padding: 14px 24px; background: #fff; color: #44403c; border: 1px solid #d6d3d1; text-decoration: none; border-radius: 9999px; font-weight: 600;">Cancel order</a>
    </p>

    <hr style="border: 0; border-top: 1px solid #e7e5e4; margin: 32px 0;" />

    <p style="font-size: 13px; color: #78716c;">
      You can also <a href="${statusUrl}" style="color: #78716c; text-decoration: underline;">check your order status</a> anytime.
      <br />Questions? <a href="${baseUrl()}/contact" style="color: #78716c; text-decoration: underline;">Contact Taste of Gratitude</a>.
    </p>
  </body>
</html>`;
}

function buildReminderText(order: any): string {
  const confirmUrl = buildOrderActionUrl(baseUrl(), 'confirm', order.orderNumber, signOrderToken(order.orderNumber, 'confirm'));
  const cancelUrl = buildOrderActionUrl(baseUrl(), 'cancel', order.orderNumber, signOrderToken(order.orderNumber, 'cancel'));
  return `Hi ${order.customerName || 'there'}, your Taste of Gratitude preorder ${order.orderNumber} is ready for pickup soon at ${order.pickupLocation || 'the market'} (${order.pickupDate}, ${order.pickupHours}). Total: $${(Number(order.total) || 0).toFixed(2)} (pay at pickup).

Confirm: ${confirmUrl}
Cancel: ${cancelUrl}
Status: ${baseUrl()}/preorder/status?order=${encodeURIComponent(order.orderNumber)}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function logReminder(db: any, entry: Record<string, any>) {
  await db.collection('pickup_reminder_logs').insertOne({
    ...entry,
    createdAt: new Date(),
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI is required.');
    process.exit(1);
  }
  if (!process.env.RESEND_API_KEY && !args.send) {
    console.error('Error: RESEND_API_KEY is required to send real emails.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET && !process.env.PREORDER_TOKEN_SECRET && !process.env.UNSUBSCRIBE_SECRET) {
    console.error('Error: JWT_SECRET, PREORDER_TOKEN_SECRET, or UNSUBSCRIBE_SECRET is required for order action tokens.');
    process.exit(1);
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const { db } = await connectToDatabase();
  const orders = await findOrdersNeedingReminder(args.marketDay);

  console.log('\n=== Pickup reminder preview ===');
  console.log(`Mode: ${args.send ? 'LIVE SEND' : 'DRY-RUN (no emails sent)'}`);
  console.log(`Market day filter: ${args.marketDay || '(any)'}`);
  console.log(`Orders needing reminder: ${orders.length}`);
  for (const order of orders) {
    console.log(`  - ${order.orderNumber} | ${order.customerEmail} | ${order.pickupLocation} | ${order.pickupDate}`);
  }
  console.log('================================\n');

  if (!args.send) {
    console.log('Dry run complete. Pass --send to send emails.');
    process.exit(0);
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < orders.length; i += args.batchSize) {
    const batch = orders.slice(i, i + args.batchSize);
    await Promise.all(
      batch.map(async (order) => {
        const logBase = {
          orderNumber: order.orderNumber,
          marketId: order.marketId,
          customerEmail: order.customerEmail,
          pickupDate: order.pickupDate,
          source: 'scripts/pickup-reminders.ts',
        };
        try {
          if (!resend) throw new Error('Resend client not initialized');
          const html = buildReminderHtml(order);
          const text = buildReminderText(order);
          const result = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'hello@tasteofgratitude.shop',
            to: order.customerEmail,
            subject: `Reminder: your Taste of Gratitude pickup is tomorrow`,
            html,
            text,
          });
          if (result.error) throw new Error(result.error.message || 'Resend error');

          await updateConfirmationStatus(order.orderNumber, 'reminder_sent');
          sent++;
          await logReminder(db, {
            ...logBase,
            status: 'sent',
            providerMessageId: result.data?.id || null,
            sentAt: new Date(),
          });
        } catch (err) {
          failed++;
          const message = err instanceof Error ? err.message : String(err);
          logger.error('PickupReminder', 'Send failed', { orderNumber: order.orderNumber, error: message });
          await logReminder(db, {
            ...logBase,
            status: 'failed',
            error: message,
            sentAt: new Date(),
          });
        }
      })
    );
    if (i + args.batchSize < orders.length) {
      await new Promise((resolve) => setTimeout(resolve, args.delayMs));
    }
  }

  console.log(`\nPickup reminders complete: ${sent} sent, ${failed} failed.`);
  process.exit(failed > 0 ? 2 : 0);
}

main().catch((err) => {
  logger.error('PickupReminder', 'Fatal error', { error: err instanceof Error ? err.message : String(err) });
  console.error(err);
  process.exit(1);
});
