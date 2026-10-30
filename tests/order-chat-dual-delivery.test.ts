import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const redisMock = vi.hoisted(() => {
  const entries = new Map<string, any>();
  const redis = {
    get: vi.fn(async (key: string) => entries.get(key) ?? null),
    eval: vi.fn(async () => 1),
    set: vi.fn(async (key: string, value: any, options: any) => {
      if (options?.nx && entries.has(key)) return null;
      entries.set(key, value);
      return 'OK';
    }),
  };
  return { redis, entries };
});
vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: () => redisMock.redis },
}));
import { orderMessagingConfigured, sendOrderToOwners } from '@/lib/order-chat-delivery';

const valid = {
  requestId: '68d23b80-27be-4dd6-9f61-f709b0f33f11',
  intent: 'preorder',
  name: 'Sample Customer',
  phone: '(404) 555-0199',
  items: '2 Calm Waters',
  desiredDate: 'Saturday',
  location: 'Serenbe',
  notes: '',
};

const sid = 'SM' + 'a'.repeat(32);
beforeEach(() => {
  redisMock.entries.clear();
  vi.clearAllMocks();
  vi.stubEnv('TWILIO_ACCOUNT_SID', 'AC' + 'a'.repeat(32));
  vi.stubEnv('TWILIO_AUTH_TOKEN', 'ci-token-not-live');
  vi.stubEnv('TWILIO_PHONE_NUMBER', '+14045550198');
  vi.stubEnv('TWILIO_MESSAGING_SERVICE_SID', '');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.invalid');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'ci-test-only');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('single-action automatic staff fanout', () => {
  it('hides SMS recipient choice and renders a single submission action', () => {
    const widget = readFileSync(resolve(process.cwd(), 'components/OrderChatWidget.jsx'), 'utf8');
    expect(widget).toContain('Send request');
    expect(widget).toContain("fetch('/api/order-chat'");
    expect(widget).not.toContain('contacts.map(');
    expect(widget).not.toContain('Text Solomon');
    expect(widget).not.toContain('Text Jenneisha');
    expect(widget).not.toContain('Text Both');
  });

  it('fails closed if messaging and distributed rate controls are absent', async () => {
    vi.stubEnv('TWILIO_AUTH_TOKEN', '');
    expect(orderMessagingConfigured()).toBe(false);
    expect(await sendOrderToOwners(valid, '198.51.100.1')).toMatchObject({
      status: 'unavailable', acceptedCount: 0,
    });
  });

  it('sends exactly one alert to each approved number and rejects same-id retries', async () => {
    const recipients: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => {
      const params = new URLSearchParams(String(options.body));
      recipients.push(params.get('To') || '');
      expect(params.get('Body')).toContain('Customer callback phone: +14045550199');
      return { status: 201, json: async () => ({ sid }) };
    }));
    expect(orderMessagingConfigured()).toBe(true);
    const first = await sendOrderToOwners(valid, '198.51.100.1');
    expect(first).toMatchObject({ status: 'accepted', acceptedCount: 2, recipientCount: 2 });
    expect(recipients).toEqual(['+14047899960', '+14706633225']);
    const retry = await sendOrderToOwners(valid, '198.51.100.1');
    expect(retry.status).toBe('duplicate');
    expect(recipients).toHaveLength(2);
  });

  it('does not claim dual delivery when only one provider call succeeds', async () => {
    let index = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      index++;
      return index === 1
        ? { status: 201, json: async () => ({ sid }) }
        : { status: 503, json: async () => ({ error: 'Unavailable' }) };
    }));
    const result = await sendOrderToOwners(valid, '203.0.113.13');
    expect(result).toMatchObject({ status: 'partial', acceptedCount: 1, recipientCount: 2 });
  });
});
