import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { verifiedSquareSmsNumber, verifiedSquareSmsHref } from '@/lib/square-messages-contact';
import { readFileSync } from 'node:fs';

const fakes = vi.hoisted(() => ({
  findOne: vi.fn(),
  updateOne: vi.fn(),
  rateLimit: vi.fn(),
  notify: vi.fn(),
}));
vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: vi.fn(async () => ({
    db: { collection: (name: string) => {
      if (name !== 'nonmarket_order_requests') throw new Error('UNEXPECTED_COLLECTION');
      return { findOne: fakes.findOne, updateOne: fakes.updateOne };
    } },
  })),
}));
vi.mock('@/lib/rate-limit', () => ({
  rateLimitByIp: fakes.rateLimit,
}));
vi.mock('@/lib/owner-alerts', () => ({
  sendOwnerAlert: fakes.notify,
}));
import { POST } from '../app/api/order-requests/message/route';

const orderId = 'nonmarket_order_request_' + 'a'.repeat(64);
const email = 'buyer@example.test';
const messageId = 'd98b8d0f-b3f0-4506-b84c-a02a5e2a33a5';
const valid = { requestId: orderId, messageId, email, message: 'Please confirm the delivery window.' };
const req = (body: unknown) => new NextRequest('http://localhost/api/order-requests/message', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});

describe('Custom-site customer message handoff: durable, no fake SMS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakes.rateLimit.mockResolvedValue({ ok: true });
    fakes.findOne.mockResolvedValue({
      _id: orderId, customer: { email, name: 'Test Customer' }, customerMessages: [],
    });
    fakes.updateOne.mockResolvedValue({ modifiedCount: 1 });
    fakes.notify.mockResolvedValue({ queued: true });
  });

  it('persists one message on the matched request and confirms website delivery only', async () => {
    const response = await POST(req(valid));
    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data).toMatchObject({
      success: true, delivery: 'merchant_inbox', squareSmsSent: false, messageId,
    });
    expect(fakes.updateOne).toHaveBeenCalledTimes(1);
    const [filter, update] = fakes.updateOne.mock.calls[0];
    expect(filter).toMatchObject({ _id: orderId, 'customer.email': email });
    expect(update.$push.customerMessages).toMatchObject({ messageId, message: valid.message,
      source: 'website_form', squareSmsSent: false });
    expect(fakes.notify).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(data)).not.toContain('paid');
  });

  it('rejects forged references, empty messages and bad email before database access', async () => {
    for (const invalid of [
      { ...valid, requestId: 'customer_1' },
      { ...valid, email: 'not-an-email' },
      { ...valid, message: 'No' },
      { ...valid, messageId: 'bad' },
    ]) {
      const response = await POST(req(invalid));
      expect(response.status).toBe(422);
    }
    expect(fakes.findOne).not.toHaveBeenCalled();
  });

  it('does not expose the order or append a message when email does not match', async () => {
    fakes.findOne.mockResolvedValueOnce(null);
    const response = await POST(req(valid));
    expect(response.status).toBe(404);
    expect(fakes.updateOne).not.toHaveBeenCalled();
  });

  it('returns success for an idempotent retry without appending or re-alerting', async () => {
    fakes.findOne.mockResolvedValueOnce({
      customer: { name: 'Test Customer' },
      customerMessages: [{ messageId, message: valid.message }],
    });
    const response = await POST(req(valid));
    expect(response.status).toBe(200);
    expect((await response.json()).duplicate).toBe(true);
    expect(fakes.updateOne).not.toHaveBeenCalled();
    expect(fakes.notify).not.toHaveBeenCalled();
  });

  it('rejects unbounded message history and rate-limited clients', async () => {
    fakes.findOne.mockResolvedValueOnce({
      customer: { name: 'Test Customer' },
      customerMessages: Array.from({ length: 12 }, (_, i) => ({ messageId: 'other-' + i })),
    });
    expect((await POST(req(valid))).status).toBe(409);
    fakes.rateLimit.mockResolvedValueOnce({ ok: false });
    expect((await POST(req(valid))).status).toBe(429);
  });

  it('keeps the customer request record even if an owner alert fails', async () => {
    fakes.notify.mockRejectedValueOnce(new Error('provider unavailable'));
    const response = await POST(req(valid));
    expect(response.status).toBe(201);
    expect(fakes.updateOne).toHaveBeenCalledTimes(1);
  });

  it('never exposes a Text Us action without verified Square toll-free identity', () => {
    const number = '+1 (800) 234-5678';
    expect(verifiedSquareSmsNumber(number, undefined)).toBeNull();
    expect(verifiedSquareSmsHref(number, 'false')).toBeNull();
    expect(verifiedSquareSmsHref('+1 404 234 5678', 'true')).toBeNull();
    expect(verifiedSquareSmsHref('sms:+18002345678', 'true')).toBeNull();
    expect(verifiedSquareSmsHref(number, 'true', 'abcdef123456'))
      .toBe('sms:+18002345678?body=Taste%20of%20Gratitude%20order%20request%20abcdef123456');
    expect(verifiedSquareSmsHref(number, 'true', '../../inject'))
      .toBe('sms:+18002345678');
  });

  it('website button and merchant inbox never claim a Square SMS was sent', () => {
    const button = readFileSync('components/WebsiteMessageButton.tsx', 'utf8');
    const receipt = readFileSync('components/checkout/OrderRequestMessage.tsx', 'utf8');
    const admin = readFileSync('app/admin/nonmarket-orders/page.tsx', 'utf8');
    expect(button).toContain('href="/text-us"');
    expect(button).toContain('Message us');
    expect(receipt).toContain("fetch('/api/order-requests/message'");
    expect(receipt).toContain('not a Square text message');
    expect(admin).toContain('customerMessages.map');
    expect(admin).toContain('Reply by email');
  });
});
