import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { verifySquareWebhookSignature } from '../lib/batches/square-webhook-auth';

describe('Gratitude Square webhook verification safety', () => {
  const url='https://tasteofgratitude.shop/api/gratitude/webhook';
  const body='{ "type": "payment.updated", "data": {"object":{"payment":{"id":"p","status":"COMPLETED"}}}}';
  const key='test-only-secret';
  const hmac=createHmac('sha256',key).update(url+body).digest('base64');
  it('accepts an exact Square HMAC over public URL and unmodified payload',()=>{
    expect(verifySquareWebhookSignature(hmac,body,url,key)).toBe(true);
    expect(verifySquareWebhookSignature(hmac,body,url,undefined)).toBe(false);
    expect(verifySquareWebhookSignature(null,body,url,key)).toBe(false);
    expect(verifySquareWebhookSignature(hmac,body+'\n',url,key)).toBe(false);
    expect(verifySquareWebhookSignature(hmac,body,url+'/',key)).toBe(false);
  });
  it('uses signed raw data and fails closed when missing configuration or processing errors',()=>{
    const s=readFileSync('app/api/gratitude/webhook/route.ts','utf8');
    expect(s).toContain("request.headers.get('x-square-hmacsha256-signature')");
    expect(s).toContain('verifySquareWebhookSignature(signature, rawBody, signingUrl, configuredKey)');
    expect(s).toContain('return NextResponse.json({ error: \'Invalid signature\' }, { status: 401 })');
    expect(s).toContain('return NextResponse.json({ error: \'Webhook reconciliation failed\' }, { status: 503 })');
    expect(s).not.toMatch(/get\('x-square-signature'\)/);
    expect(s).not.toMatch(/signatureKey not set — webhook signature not verified/);
    expect(s).not.toMatch(/JSON\.stringify\(body\).*digest\(/);
  });
});
