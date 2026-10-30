/**
 * Merchant-authorized order enquiry SMS fanout. SERVER ONLY.
 * A successful Twilio response means provider accepted the message, not handset delivery.
 */
import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';
import { buildOrderRequest, getOrderContacts, normalizeUSPhone } from './order-chat.js';

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function orderMessagingConfigured(env = process.env) {
  const fromReady = /^\+1\d{10}$/.test(env.TWILIO_PHONE_NUMBER || '') ||
    /^MG[a-f\d]{32}$/i.test(env.TWILIO_MESSAGING_SERVICE_SID || '');
  return Boolean(
    /^AC[a-f\d]{32}$/i.test(env.TWILIO_ACCOUNT_SID || '') &&
    env.TWILIO_AUTH_TOKEN &&
    fromReady &&
    env.UPSTASH_REDIS_REST_URL &&
    env.UPSTASH_REDIS_REST_TOKEN
  );
}

function requestMessage(input: {
  intent: string; name: string; items: string; desiredDate?: string;
  location?: string; notes?: string; phone: string;
}) {
  const message = buildOrderRequest(input);
  return message + '\nCustomer callback phone: ' + input.phone + '\nStaff alert only. Not an order or paid reservation.';
}

async function sendSms(to: string, body: string, env = process.env) {
  const account = env.TWILIO_ACCOUNT_SID!;
  const params = new URLSearchParams({ To: to, Body: body });
  if (env.TWILIO_MESSAGING_SERVICE_SID) {
    params.set('MessagingServiceSid', env.TWILIO_MESSAGING_SERVICE_SID);
  } else {
    params.set('From', env.TWILIO_PHONE_NUMBER!);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(
      'https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(account) + '/Messages.json',
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(account + ':' + env.TWILIO_AUTH_TOKEN).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
        signal: controller.signal,
        cache: 'no-store',
      }
    );
    if (response.status !== 201) {
      // Do not expose Twilio errors or provider configuration to the visitor.
      return { accepted: false, code: 'PROVIDER_REJECTED' as const };
    }
    const value = await response.json();
    return {
      accepted: typeof value.sid === 'string' && /^SM[a-f\d]{32}$/i.test(value.sid),
      code: 'ACCEPTED' as const,
    };
  } catch {
    // Timeouts are uncertain, not definitive non-delivery. Never blind-retry.
    return { accepted: false, code: 'PROVIDER_UNKNOWN' as const };
  } finally {
    clearTimeout(timeout);
  }
}

async function limited(redis: Redis, label: string, maximum: number, ttlSeconds: number) {
  // One atomic increment + expiration per key across all Vercel instances.
  const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n";
  const count = await redis.eval(script, [label], [ttlSeconds]);
  if (typeof count !== 'number') throw new Error('RATE_LIMIT_UNAVAILABLE');
  return count <= maximum;
}

export type OrderSendResult = {
  status: 'accepted' | 'partial' | 'unconfirmed' | 'duplicate' | 'throttled' | 'unavailable';
  acceptedCount: number;
  recipientCount: number;
  reference: string;
};

export async function sendOrderToOwners(input: {
  requestId: string;
  intent: string;
  name: string;
  phone: string;
  items: string;
  desiredDate?: string;
  location?: string;
  notes?: string;
}, sourceIp: string): Promise<OrderSendResult> {
  if (!orderMessagingConfigured()) {
    return { status: 'unavailable', acceptedCount: 0, recipientCount: 2, reference: '' };
  }
  const phone = normalizeUSPhone(input.phone);
  if (!phone) throw new Error('INVALID_CALLBACK_PHONE');
  const recipients = getOrderContacts();
  if (recipients.length !== 2 || new Set(recipients.map(x => x.number)).size !== 2) {
    return { status: 'unavailable', acceptedCount: 0, recipientCount: 2, reference: '' };
  }

  const redis = Redis.fromEnv();
  const reference = input.requestId;
  const key = 'tog:order-inquiry:v1:' + reference;
  const fingerprint = digest(JSON.stringify({ ...input, phone }));
  const existing = await redis.get<{ fingerprint: string; status: string; acceptedCount: number }>(key);
  if (existing) {
    return {
      status: 'duplicate',
      acceptedCount: existing.acceptedCount || 0,
      recipientCount: 2,
      reference,
    };
  }
  const ipHash = digest(sourceIp || 'unknown');
  if (!await limited(redis, 'tog:order-rate:ip:' + ipHash, 4, 3600) ||
      !await limited(redis, 'tog:order-rate:phone:' + digest(phone), 3, 3600)) {
    return { status: 'throttled', acceptedCount: 0, recipientCount: 2, reference: '' };
  }
  // NX single-flight claim. No repeated sends on timeout or a changed payload
  // using the same requestId; uncertain partial delivery requires staff review.
  const claim = await redis.set(key, {
    fingerprint, status: 'processing', acceptedCount: 0,
  }, { nx: true, ex: 86400 });
  if (claim !== 'OK') {
    return { status: 'duplicate', acceptedCount: 0, recipientCount: 2, reference };
  }

  const body = '[Taste of Gratitude enquiry ' + reference.slice(0, 8) + ']\n' +
    requestMessage({ ...input, phone });
  const results = await Promise.all(recipients.map(recipient => sendSms(recipient.number, body)));
  const count = results.filter(result => result.accepted).length;
  const status = count === 2 ? 'accepted' : count === 1 ? 'partial' : 'unconfirmed';
  // If this store fails, do NOT resend. The provider may have accepted messages.
  await redis.set(key, { fingerprint, status, acceptedCount: count }, { ex: 86400 });
  return { status, acceptedCount: count, recipientCount: 2, reference };
}
