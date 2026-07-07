#!/usr/bin/env node
/**
 * Taste of Gratitude Telegram Notifier
 * Sends a daily digest of taskfeed items to the owner via Telegram.
 *
 * Usage:
 *   node scripts/tog-telegram-notify.js [--dry-run]
 *
 * Requires:
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 *
 * Safe: sends messages only; does not deploy or mutate production code.
 */

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const OWNER_TIMEZONE = 'America/New_York';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const TASKS_FILE = join(__dirname, '..', 'taskfeed', 'tog', 'tasks.json');

function nowEastern() {
  return new Date().toLocaleString('en-US', { timeZone: OWNER_TIMEZONE, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function loadTasks() {
  if (!existsSync(TASKS_FILE)) return { tasks: [] };
  try {
    return JSON.parse(readFileSync(TASKS_FILE, 'utf8'));
  } catch {
    return { tasks: [] };
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDigest(tasks) {
  const open = tasks.filter((t) => t.status === 'new' || t.status === 'approved' || t.status === 'in_progress');
  const p0 = open.filter((t) => t.priority === 'P0');
  const p1 = open.filter((t) => t.priority === 'P1');
  const p2 = open.filter((t) => t.priority === 'P2');

  let body = `🍋 <b>Taste of Gratitude Funnel Digest</b>\n${nowEastern()} — ${open.length} open task(s)\n\n`;

  if (p0.length) {
    body += '<b>🔴 P0 — Urgent</b>\n';
    for (const t of p0.slice(0, 5)) {
      body += `<b>${escapeHtml(t.title)}</b>\nEvidence: ${escapeHtml(t.evidence.slice(0, 120))}${t.evidence.length > 120 ? '…' : ''}\nFix: ${escapeHtml(t.recommended_fix.slice(0, 100))}${t.recommended_fix.length > 100 ? '…' : ''}\n\n`;
    }
  }

  if (p1.length) {
    body += '<b>🟡 P1 — Conversion / brand</b>\n';
    for (const t of p1.slice(0, 5)) {
      body += `• ${escapeHtml(t.title)}\n`;
    }
    body += '\n';
  }

  if (p2.length) {
    body += `<b>🔵 P2 — Infrastructure (${p2.length})</b>\n`;
  }

  body += '\nCommands: /status /tasks /approve TASK_ID /snooze TASK_ID /done TASK_ID';
  return body;
}

async function sendTelegram(message) {
  if (!BOT_TOKEN || !CHAT_ID) {
    return { ok: false, error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' };
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'HTML',
  };

  if (DRY_RUN) {
    console.log('DRY RUN — would send:\n' + message);
    return { ok: true, dryRun: true };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Telegram API error');
    return { ok: true, messageId: data.result?.message_id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  const queue = loadTasks();
  const message = buildDigest(queue.tasks);

  console.log(message);
  console.log('\n---');

  const result = await sendTelegram(message);
  if (result.ok) {
    if (result.dryRun) {
      console.log('Dry-run output printed above.');
    } else {
      console.log(`Telegram message sent. Message ID: ${result.messageId}`);
    }
  } else {
    console.error(`Telegram send failed: ${result.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Notifier failed:', err.message);
  process.exit(1);
});
