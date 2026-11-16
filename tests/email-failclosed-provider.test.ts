import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildListUnsubscribeHeaders } from '@/lib/email/list-unsubscribe-headers';

const mocks = vi.hoisted(() => ({
  send: vi.fn(), insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
}));
vi.mock('resend', () => ({ Resend: class { emails = { send: mocks.send }; } }));
vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({
    db: { collection: () => ({ insertOne: mocks.insertOne }) },
  }),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('transactional mail contract and shared provider-safe headers', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.send.mockReset();
    mocks.insertOne.mockClear();
  });

  it('never reports a successful send when the email provider is unconfigured', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const { sendEmail } = await import('@/lib/resend-email');
    const result = await sendEmail({
      to: 'staff@example.com', subject: 'Order receipt', html: '<p>test</p>',
      emailType: 'order_confirmation',
    });
    expect(result.success).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.error).toBe('EMAIL_PROVIDER_UNAVAILABLE');
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', provider: 'resend' })
    );
  });

  it('rejects untrusted hostnames, missing tokens, CRLF, and non-HTTPS', () => {
    for (const url of [
      'https://tasteofgratitude.shop.evil.example/unsubscribe?token=a',
      'https://tasteofgratitude.shop/unsubscribe',
      'https://tasteofgratitude.shop/unsubscribe?token=a\r\nBcc:x',
      'http://tasteofgratitude.shop/unsubscribe?token=a',
    ]) expect(() => buildListUnsubscribeHeaders(url)).toThrow();
    expect(buildListUnsubscribeHeaders(
      'https://tasteofgratitude.shop/unsubscribe?token=ok'
    )).toEqual({
      'List-Unsubscribe': '<https://tasteofgratitude.shop/unsubscribe?token=ok>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });
});