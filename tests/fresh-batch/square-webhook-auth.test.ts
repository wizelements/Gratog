import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifySquareWebhookSignature } from '@/lib/batches/square-webhook-auth';

describe('Square webhook signature verification', () => {
  const url = 'https://tasteofgratitude.shop/api/webhooks/square/payment';
  const body = '{"id":"event-1","type":"payment.updated"}';
  const key = 'unit-test-only-signature-key';
  const signature = createHmac('sha256', key).update(url + body).digest('base64');

  it('accepts a valid Square-style HMAC over URL and raw body', () => {
    expect(verifySquareWebhookSignature(signature, body, url, key)).toBe(true);
  });
  it('rejects tampering, wrong URL, wrong key, and unconfigured secrets', () => {
    expect(verifySquareWebhookSignature(signature, body + ' ', url, key)).toBe(false);
    expect(verifySquareWebhookSignature(signature, body, url + '/', key)).toBe(false);
    expect(verifySquareWebhookSignature(signature, body, url, 'wrong')).toBe(false);
    expect(verifySquareWebhookSignature(signature, body, url, undefined)).toBe(false);
  });
  it('rejects missing/forged headers and cannot bypass validation', () => {
    expect(verifySquareWebhookSignature(null, body, url, key)).toBe(false);
    expect(verifySquareWebhookSignature('fake', body, url, key)).toBe(false);
  });
});
