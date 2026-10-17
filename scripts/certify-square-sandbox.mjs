#!/usr/bin/env node
/**
 * REAL Square sandbox certification: executes actual Sandbox Orders,
 * Payments, declines, delayed authorizations, idempotency and Refunds APIs.
 * No mocks. Never connects to the production Square hostname.
 *
 * Requires the explicit SQUARE_SANDBOX_ACCESS_TOKEN from a protected environment.
 * Never uses the generic/live SQUARE_ACCESS_TOKEN as a fallback.
 *
 * This script proves provider behavior. App/DB integration is a distinct gate.
 */
import {
  sandboxIdempotencyKey,
  isExpectedSandboxCardDecline,
  isExpectedSandboxIdempotencyConflict,
} from './square-sandbox-idempotency.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const ORIGIN = 'https://connect.squareupsandbox.com';
const API_VERSION = '2026-09-16';
const accessToken = process.env.SQUARE_SANDBOX_ACCESS_TOKEN || '';
const certification = {
  protocol: 'square-real-sandbox',
  startedAt: new Date().toISOString(),
  environment: ORIGIN,
  tests: [],
  pass: false,
};
const note = (name, passed, data = {}) => {
  const row = { name, passed: Boolean(passed), ...data };
  certification.tests.push(row);
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(data)}`);
  if (!passed) throw new Error(`Sandbox gate failed: ${name}`);
};
async function square(path, { method = 'GET', body } = {}) {
  if (!path.startsWith('/v2/') || path.includes('://')) throw new Error('Forbidden Square path');
  const url = new URL(path, ORIGIN);
  if (url.hostname !== 'connect.squareupsandbox.com' || url.protocol !== 'https:') {
    throw new Error('Production host blocked');
  }
  if (path === '/v2/payments' && method === 'POST' &&
      (typeof body?.idempotency_key !== 'string' || body.idempotency_key.length > 45)) {
    throw new Error('Square payment idempotency key must be at most 45 characters');
  }
  const response = await fetch(url, {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Square-Version': API_VERSION,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, data };
}
const key = sandboxIdempotencyKey;
const failure = (response) => ({
  status: response.status,
  code: response.data.errors?.[0]?.code || null,
  category: response.data.errors?.[0]?.category || null,
});
let createdPaymentId = null;
let authPaymentId = null;
let refundSubmitted = false;
async function run() {
  if (!accessToken) {
    certification.blocker = 'No sandbox-capable Square credential supplied to the isolated certification runner.';
    return;
  }

  // READ-ONLY authentication check first; production tokens cannot authorize
  // sandbox resources at this hostname.
  const locations = await square('/v2/locations');
  note('Square sandbox credential authenticated', locations.ok && Array.isArray(locations.data.locations), { status: locations.status });
  const location = locations.data.locations.find(loc => loc.status === 'ACTIVE') || locations.data.locations[0];
  note('Sandbox location present', Boolean(location?.id));

  const decline = await square('/v2/payments', {
    method: 'POST',
    body: {
      source_id: 'cnon:card-nonce-declined',
      idempotency_key: key('decline'),
      amount_money: { amount: 100, currency: 'USD' },
      location_id: location.id,
      note: 'Taste of Gratitude automated sandbox certification only',
    },
  });
  note('Card decline rejected without payment',
    isExpectedSandboxCardDecline(decline),
    failure(decline));

  // Actual Square order, then charged/captured against that order.
  const idempotency = key('create-order');
  const createdOrder = await square('/v2/orders', {
    method: 'POST',
    body: {
      idempotency_key: idempotency,
      order: {
        location_id: location.id,
        line_items: [{
          name: 'SANDBOX ONLY · Strawberry Bliss 16oz',
          quantity: '1',
          base_price_money: { amount: 1199, currency: 'USD' },
        }],
      },
    },
  });
  note('Square sandbox order created', createdOrder.ok && Boolean(createdOrder.data.order?.id), { status: createdOrder.status });
  const orderId = createdOrder.data.order.id;
  const total = Number(createdOrder.data.order.total_money?.amount);
  note('Square sandbox server order total is $11.99', total === 1199, { totalCents: total });

  const paymentKey = key('capture');
  const paymentBody = {
    idempotency_key: paymentKey,
    source_id: 'cnon:card-nonce-ok',
    amount_money: { amount: 1199, currency: 'USD' },
    location_id: location.id,
    order_id: orderId,
    autocomplete: true,
    note: 'Taste of Gratitude sandbox certification; no real funds',
  };
  const captured = await square('/v2/payments', { method: 'POST', body: paymentBody });
  createdPaymentId = captured.data.payment?.id || null;
  note('Real Square sandbox capture COMPLETED at $11.99',
    captured.ok && captured.data.payment?.status === 'COMPLETED' &&
    Number(captured.data.payment?.amount_money?.amount) === 1199, failure(captured));
  
  const replay = await square('/v2/payments', { method: 'POST', body: paymentBody });
  note('Identical idempotency key prevents double charge',
    replay.ok && replay.data.payment?.id === createdPaymentId, { status: replay.status, sameId: replay.data.payment?.id === createdPaymentId });

  const tamper = await square('/v2/payments', {
    method: 'POST',
    body: { ...paymentBody, amount_money: { amount: 100, currency: 'USD' } },
  });
  note('Reused idempotency key cannot charge a different amount',
    isExpectedSandboxIdempotencyConflict(tamper),
    failure(tamper));

  const authorized = await square('/v2/payments', {
    method: 'POST',
    body: {
      idempotency_key: key('authorize'),
      source_id: 'cnon:card-nonce-ok',
      amount_money: { amount: 100, currency: 'USD' },
      location_id: location.id,
      autocomplete: false,
      note: 'Taste of Gratitude sandbox authorization to be canceled',
    },
  });
  authPaymentId = authorized.data.payment?.id || null;
  note('Delayed Square payment remains APPROVED and not captured',
    authorized.ok && authorized.data.payment?.status === 'APPROVED' && Boolean(authPaymentId),
    { ...failure(authorized), paymentStatus: authorized.data.payment?.status });

  const cancelled = await square(`/v2/payments/${encodeURIComponent(authPaymentId)}/cancel`, { method: 'POST' });
  note('Uncaptured authorization canceled', cancelled.ok && cancelled.data.payment?.status === 'CANCELED',
    { status: cancelled.status });

  const refund = await square('/v2/refunds', {
    method: 'POST',
    body: {
      idempotency_key: key('refund'),
      payment_id: createdPaymentId,
      amount_money: { amount: 1199, currency: 'USD' },
      reason: 'Automated Square sandbox full-refund certification',
    },
  });
  refundSubmitted = refund.ok;
  note('Full sandbox refund request accepted',
    refund.ok && Boolean(refund.data.refund?.id), { status: refund.status, refundStatus: refund.data.refund?.status });
  const refundId = refund.data.refund.id;
  let finalRefund = refund;
  for (let i = 0; i < 8 && finalRefund.data.refund?.status === 'PENDING'; i++) {
    await new Promise(resolve => setTimeout(resolve, 750));
    finalRefund = await square(`/v2/refunds/${encodeURIComponent(refundId)}`);
  }
  note('Square reports refund of $11.99 in completed or processing state',
    finalRefund.ok &&
    ['COMPLETED', 'PENDING'].includes(finalRefund.data.refund?.status) &&
    Number(finalRefund.data.refund?.amount_money?.amount) === 1199, {
      status: finalRefund.status,
      refundStatus: finalRefund.data.refund?.status,
    });

  const finalPayment = await square(`/v2/payments/${encodeURIComponent(createdPaymentId)}`);
  note('Square payment read-back matches captured payment ID',
    finalPayment.ok && finalPayment.data.payment?.id === createdPaymentId &&
    Number(finalPayment.data.payment?.amount_money?.amount) === 1199, { status: finalPayment.status });

  certification.pass = certification.tests.every(t => t.passed);
  certification.sandboxOrderId = orderId;
  certification.sandboxPaymentId = createdPaymentId;
  certification.sandboxRefundId = refundId;
  certification.refundFinalStatus = finalRefund.data.refund?.status;
}
try {
  await run();
} catch (e) {
  certification.error = String(e?.message || e).slice(0,250);
} finally {
  certification.finishedAt = new Date().toISOString();
  certification.refundSubmitted = refundSubmitted;
  certification.requiresManualSandboxCleanup = Boolean(createdPaymentId && !refundSubmitted);
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/square-sandbox-certification.json', JSON.stringify(certification, null, 2));
  console.log('SANDBOX_CERT_RESULT', JSON.stringify({
    passed: certification.pass,
    testsPassed: certification.tests.filter(t => t.passed).length,
    testsTotal: certification.tests.length,
    blocker: certification.blocker,
    error: certification.error,
    requiresManualSandboxCleanup: certification.requiresManualSandboxCleanup,
  }));
  if (!certification.pass) process.exitCode = 1;
}
