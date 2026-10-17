import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { connection } = vi.hoisted(() => ({ connection: vi.fn() }));
vi.mock('@/lib/db-optimized', () => ({ connectToDatabase: connection }));
vi.mock('@/lib/batches/audit-log', () => ({
  logPaymentReceived: vi.fn().mockResolvedValue(undefined),
  logReservationStatusChange: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/logger', () => ({ logger: {
  info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()
} }));

import { POST } from '@/app/api/webhooks/square/payment/route';

const url = 'https://tasteofgratitude.shop/api/webhooks/square/payment';
const body = JSON.stringify({
  type: 'payment.updated',
  data: { object: { payment: {
    id: 'test-payment', order_id: 'test-order', status: 'COMPLETED',
    amount_money: { amount: 1199, currency: 'USD' }
  } } }
});
const key = 'test-only-square-key';
const sign = (content: string, callbackUrl = url) =>
  createHmac('sha256', key).update(callbackUrl + content).digest('base64');
const makeRequest = (content: string, signature?: string, callbackUrl = url) => new NextRequest(
  callbackUrl, { method: 'POST', headers: {
    'content-type': 'application/json',
    ...(signature ? { 'x-square-hmacsha256-signature': signature } : {}),
  }, body: content }
);

describe('Fresh-batch signed Square webhook route', () => {
  beforeEach(() => {
    vi.stubEnv('SQUARE_WEBHOOK_SIGNATURE_KEY', key);
    connection.mockReset();
    connection.mockResolvedValue({ db: { collection: vi.fn().mockReturnValue({
      findOne: vi.fn().mockResolvedValue(null)
    }) } });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects unsigned requests before touching the database', async () => {
    const result = await POST(makeRequest(body));
    expect(result.status).toBe(401);
    expect(connection).not.toHaveBeenCalled();
  });

  it('rejects forged, tampered and wrong-callback signatures before the database', async () => {
    for (const [payload, signature] of [
      [body, 'not-a-square-signature'],
      [body + ' ', sign(body)],
      [body, sign(body, url + '/wrong')],
    ] as const) {
      expect((await POST(makeRequest(payload, signature))).status).toBe(401);
    }
    expect(connection).not.toHaveBeenCalled();
  });

  it('refuses signed requests with an unconfigured production key', async () => {
    vi.stubEnv('SQUARE_WEBHOOK_SIGNATURE_KEY', '');
    expect((await POST(makeRequest(body, sign(body)))).status).toBe(503);
    expect(connection).not.toHaveBeenCalled();
  });

  it('accepts a properly signed synthetic event and safely ignores unknown orders', async () => {
    const result = await POST(makeRequest(body, sign(body)));
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ success: true, ignored: true });
    expect(connection).toHaveBeenCalledOnce();
  });

  it('rejects malformed JSON only after verifying the real raw-body signature', async () => {
    const badJson = '{bad json';
    expect((await POST(makeRequest(badJson, sign(badJson)))).status).toBe(400);
    expect(connection).not.toHaveBeenCalled();
  });
});
