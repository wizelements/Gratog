import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const mocks = vi.hoisted(() => ({
  send: vi.fn().mockResolvedValue({ data: { id: 'resend-fixture' }, error: null }),
  insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));
vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({
    db: { collection: () => ({ insertOne: mocks.insertOne }) },
  }),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

let sendEmail: typeof import('@/lib/resend-email').sendEmail;

beforeAll(async () => {
  vi.stubEnv('RESEND_API_KEY', 'test-fixture-only');
  ({ sendEmail } = await import('@/lib/resend-email'));
});
beforeEach(() => {
  mocks.send.mockReset().mockResolvedValue({ data: { id: 'resend-fixture' }, error: null });
  mocks.insertOne.mockClear();
});

const sample = {
  to: 'owner@example.com',
  subject: 'Your Taste of Gratitude order is still waiting',
  html: '<p>Hello</p>',
  emailType: 'promotional',
  listUnsubscribeUrl: 'https://tasteofgratitude.shop/unsubscribe?token=safe-fixture',
};

describe('Resend production email header safety', () => {
  it('accepts canonical HTTPS one-click unsubscribe with no CR/LF', async () => {
    const result = await sendEmail(sample);
    expect(result.success).toBe(true);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send.mock.calls[0][0].headers).toEqual({
      'List-Unsubscribe': '<https://tasteofgratitude.shop/unsubscribe?token=safe-fixture>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });

  it.each([
    ['newline', 'https://tasteofgratitude.shop/unsubscribe?token=bad\nheader'],
    ['carriage-return', 'https://tasteofgratitude.shop/unsubscribe?token=bad\rheader'],
    ['null-byte', 'https://tasteofgratitude.shop/unsubscribe?token=bad\0header'],
    ['spoofing', 'https://tasteofgratitude.shop.bad.example/unsubscribe'],
    ['insecure', 'http://tasteofgratitude.shop/unsubscribe'],
  ])('fails closed for %s unsubscribe URL without sending email', async (_, url) => {
    const result = await sendEmail({ ...sample, listUnsubscribeUrl: url });
    expect(result.success).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('rejects CR/LF in user-controlled email headers before sending', async () => {
    const result = await sendEmail({ ...sample, to: 'owner@example.com\r\nBcc: injected@example.com' });
    expect(result.success).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('keeps cleanup links and RFC 8058 header domain canonical regardless of corrupted deployment origin', () => {
    const source = readFileSync('app/api/cron/cleanup-abandoned-orders/route.ts', 'utf8');
    const base = source.match(/function baseUrl\(\) \{([\s\S]*?)\n\}/)?.[1] || '';
    expect(base).toContain("return 'https://tasteofgratitude.shop'");
    expect(base).not.toContain('process.env');
  });
});
