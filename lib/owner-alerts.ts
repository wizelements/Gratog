/**
 * Owner alert router for Taste of Gratitude.
 *
 * Replaces the legacy Twilio/SMS owner-notification path with a no-SMS
 * design:
 *   1. Telegram cloud bot (the SMAD bot) — instant rich message.
 *   2. Resend email fallback — if Telegram is not configured or fails.
 *
 * Safety:
 *   - Always writes to the durable `owner_alert_queue` first.
 *   - Only sends when both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are
 *     configured. If either is missing, the event is queued and the email
 *     fallback is attempted.
 *   - Telegram failures fall back to Resend. Resend failures are recorded in
 *     the queue for retry.
 *   - No outbound traffic occurs for unknown/incomplete configuration.
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN  - Cloud SMAD bot token (NOT the local OpenClaw bot).
 *   TELEGRAM_CHAT_ID    - Owner Telegram id or group id for alerts.
 *   RESEND_API_KEY      - Existing Resend key.
 *   RESEND_FROM_EMAIL   - Existing sender address.
 *   ALERT_EMAIL         - Optional fallback staff email address.
 */

import { sendEmail } from '@/lib/resend-email';
import {
  enqueueOwnerAlert,
  fetchPendingOwnerAlerts,
  claimAlert,
  markAlertSent,
  markAlertFailed,
  type OwnerAlertEvent,
  type QueueItem,
} from '@/lib/event-queue';
import { logger } from '@/lib/logger';

export type OwnerAlertResult = {
  queued: boolean;
  telegram?: { ok: boolean; messageId?: number; error?: string };
  email?: { ok: boolean; messageId?: string; error?: string };
  dryRun?: boolean;
};

const getTelegramConfig = () => ({
  token: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
});
function getAlertEmail(): string | undefined {
  return process.env.ALERT_EMAIL;
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Build a Telegram-friendly plain-text message from an alert event.
 */
export function formatTelegramMessage(event: OwnerAlertEvent): string {
  const emoji =
    { info: 'ℹ️', warning: '⚠️', critical: '🚨' }[event.severity] ?? 'ℹ️';

  let text = `${emoji} *${event.title}*\n\n${event.body}`;
  if (event.actionUrl) {
    text += `\n\n[View in admin](${event.actionUrl})`;
  }
  if (event.metadata && Object.keys(event.metadata).length > 0) {
    text += `\n\n_Ref: ${event.sourceEventId}_`;
  }
  return text;
}

async function sendTelegramMessage(text: string): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) {
    return { ok: false, error: 'Telegram not configured (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing)' };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Telegram HTTP ${response.status}: ${body}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description || JSON.stringify(data)}`);
    }

    return { ok: true, messageId: data.result?.message_id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('OwnerAlert', 'Telegram send failed', { error });
    return { ok: false, error };
  }
}

async function sendResendFallback(event: OwnerAlertEvent): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const to = getAlertEmail();
  if (!to) {
    return { ok: false, error: 'No ALERT_EMAIL configured for fallback' };
  }

  try {
    const result = await sendEmail({
      to,
      subject: `[${event.severity.toUpperCase()}] ${event.title}`,
      text: `${event.title}\n\n${event.body}\n\nRef: ${event.sourceEventId}${event.actionUrl ? `\nLink: ${event.actionUrl}` : ''}`,
      emailType: 'alert',
      template: 'owner_alert',
    });

    if (!result?.success) {
      throw new Error(result?.error || 'Resend returned unsuccessful result');
    }

    return { ok: true, messageId: result.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('OwnerAlert', 'Resend fallback failed', { error });
    return { ok: false, error };
  }
}

/**
 * Public entry point: enqueue an owner alert and immediately attempt delivery.
 * If Telegram/Resend are not configured, the event is still queued and delivery
 * is deferred until configuration is added.
 */
export async function sendOwnerAlert(event: OwnerAlertEvent): Promise<OwnerAlertResult> {
  const item = await enqueueOwnerAlert(event);
  const result: OwnerAlertResult = { queued: true };

  const { token, chatId } = getTelegramConfig();
  const configured = Boolean(token && chatId);

  if (!configured) {
    result.dryRun = true;
    result.telegram = { ok: false, error: 'Telegram not configured; using Resend fallback' };
    result.email = await sendResendFallback(event);
    logger.warn('OwnerAlert', 'Telegram not configured; queued and attempted email fallback', {
      sourceEventId: event.sourceEventId,
      emailOk: result.email.ok,
    });
    return result;
  }

  // Try Telegram first.
  result.telegram = await sendTelegramMessage(formatTelegramMessage(event));
  if (result.telegram.ok) {
    result.email = { ok: false, error: 'Skipped because Telegram succeeded' };
  } else {
    result.email = await sendResendFallback(event);
  }

  logger.info('OwnerAlert', 'Owner alert delivered', {
    sourceEventId: event.sourceEventId,
    telegramOk: result.telegram.ok,
    emailOk: result.email.ok,
  });

  return result;
}

/**
 * Consumer for the durable event queue.
 * Intended to be called from a Vercel cron or an OpenClaw/SMAD worker.
 */
export async function processOwnerAlertQueue(limit = 10): Promise<OwnerAlertResult[]> {
  const pending = await fetchPendingOwnerAlerts(limit);
  const results: OwnerAlertResult[] = [];

  for (const item of pending) {
    const claimed = await claimAlert(item._id as string);
    if (!claimed) continue;

    try {
      const delivered = await sendOwnerAlert(item);

      // `sendOwnerAlert` re-enqueues by sourceEventId. We still need to mark
      // the originally claimed item sent/failed.
      const anyChannelOk = delivered.telegram?.ok || delivered.email?.ok;
      if (anyChannelOk) {
        await markAlertSent(item._id as string, delivered);
      } else {
        await markAlertFailed(item._id as string, item, delivered.telegram?.error || delivered.email?.error || 'Unknown failure');
      }
      results.push(delivered);
    } catch (err) {
      await markAlertFailed(item._id as string, item, err);
      results.push({ queued: true, telegram: { ok: false, error: String(err) } });
    }
  }

  return results;
}

/**
 * Convenience builders for common business events.
 */
export function buildOrderConfirmedAlert(order: {
  orderNumber: string;
  customerName?: string;
  total?: number;
  fulfillmentType?: string;
  id?: string;
}): OwnerAlertEvent {
  return {
    sourceEventId: `order:${order.id || order.orderNumber}`,
    category: 'order',
    severity: 'info',
    title: `Order confirmed: #${order.orderNumber}`,
    body: `${order.customerName || 'A customer'} placed order #${order.orderNumber} for $${order.total ?? 'unknown'}.\nFulfillment: ${order.fulfillmentType || 'unknown'}.`,
    actionUrl: order.id ? `${process.env.VERCEL_URL}/admin/orders/${order.id}` : undefined,
    channel: 'all',
    eventAt: now(),
  };
}

export function buildDailyReportAlert(report: {
  date: string;
  summary: { totalRevenue: number; totalOrders: number; avgOrderValue: number };
  topItems: Array<{ name: string; count: number }>;
}): OwnerAlertEvent {
  const top = report.topItems[0];
  return {
    sourceEventId: `daily_report:${report.date}`,
    category: 'daily_report',
    severity: 'info',
    title: `Daily report: ${report.date}`,
    body: `Revenue: $${report.summary.totalRevenue.toFixed(0)}\nOrders: ${report.summary.totalOrders}\nAOV: $${report.summary.avgOrderValue.toFixed(2)}\nTop item: ${top ? `${top.name} (${top.count})` : 'N/A'}`,
    channel: 'all',
    eventAt: now(),
  };
}
