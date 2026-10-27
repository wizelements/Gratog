import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { generateOrderAccessToken, verifyOrderAccessToken } from '../../lib/order-access-token.js';

function inEnvironment(env, fn) {
  const keys = ['NODE_ENV', 'VERCEL_ENV', 'VERCEL_URL', 'VERCEL_PROJECT_ID', 'VERCEL_GIT_COMMIT_REF', 'ORDER_ACCESS_TOKEN_SECRET'];
  const previous = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  try {
    for (const key of keys) delete process.env[key];
    Object.assign(process.env, { NODE_ENV: 'production', ORDER_ACCESS_TOKEN_SECRET: 'isolated-unit-secret-only-0123456789', ...env });
    return fn();
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}
const customer = { orderId: 'canonical-order-id', customerEmail: 'buyer@example.invalid' };
test('valid scoped token authorizes only its canonical order and customer', () => {
  inEnvironment({ VERCEL_ENV: 'production' }, () => {
    const token = generateOrderAccessToken(customer);
    assert.equal(verifyOrderAccessToken(token, { expectedOrderId: customer.orderId, expectedEmail: customer.customerEmail })?.orderId, customer.orderId);
    assert.equal(verifyOrderAccessToken(token, { expectedOrderId: 'another-order' }), null);
    assert.equal(verifyOrderAccessToken(token, { expectedEmail: 'other@example.invalid' }), null);
    assert.equal(verifyOrderAccessToken(token + '.extra'), null);
  });
});
test('identical secret cannot authenticate Preview token in Production or another Preview', () => {
  const token = inEnvironment({ VERCEL_ENV: 'preview', VERCEL_URL: 'preview-a.vercel.app' }, () => generateOrderAccessToken(customer));
  assert.ok(inEnvironment({ VERCEL_ENV: 'preview', VERCEL_URL: 'preview-a.vercel.app' }, () => verifyOrderAccessToken(token)));
  assert.equal(inEnvironment({ VERCEL_ENV: 'production' }, () => verifyOrderAccessToken(token)), null);
  assert.equal(inEnvironment({ VERCEL_ENV: 'preview', VERCEL_URL: 'preview-b.vercel.app' }, () => verifyOrderAccessToken(token)), null);
});
test('Production token does not authorize development or another project', () => {
  const token = inEnvironment({ VERCEL_ENV: 'production', VERCEL_PROJECT_ID: 'project-a' }, () => generateOrderAccessToken(customer));
  assert.equal(inEnvironment({ VERCEL_ENV: 'development', VERCEL_PROJECT_ID: 'project-a' }, () => verifyOrderAccessToken(token)), null);
  assert.equal(inEnvironment({ VERCEL_ENV: 'production', VERCEL_PROJECT_ID: 'project-b' }, () => verifyOrderAccessToken(token)), null);
});
test('legacy unscoped signature, invalid TTL and unknown environment are rejected', () => {
  inEnvironment({ VERCEL_ENV: 'production' }, () => {
    const payload = Buffer.from(JSON.stringify({ o: customer.orderId, e: customer.customerEmail, exp: Date.now() + 60000 })).toString('base64url');
    const signature = crypto.createHmac('sha256', process.env.ORDER_ACCESS_TOKEN_SECRET).update(payload).digest('base64url');
    assert.equal(verifyOrderAccessToken(payload + '.' + signature), null);
    assert.equal(generateOrderAccessToken({ ...customer, ttlMs: NaN }), null);
    assert.equal(generateOrderAccessToken({ ...customer, ttlMs: Infinity }), null);
  });
  assert.equal(inEnvironment({ VERCEL_ENV: 'unexpected' }, () => generateOrderAccessToken(customer)), null);
});
