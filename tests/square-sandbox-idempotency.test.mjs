import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sandboxIdempotencyKey,
  isExpectedSandboxCardDecline,
  isExpectedSandboxIdempotencyConflict,
} from '../scripts/square-sandbox-idempotency.mjs';

test('Square payment keys are unique, labeled and always within 45 characters', () => {
  const seen = new Set();
  for (const label of ['decline', 'capture', 'authorize', 'refund', 'create-order']) {
    for (let i = 0; i < 100; i++) {
      const key = sandboxIdempotencyKey(label);
      assert.ok(key.length <= 45, key);
      assert.match(key, /^[a-z0-9]{1,6}-[a-f0-9-]{36}$/);
      assert.equal(seen.has(key), false, 'duplicate Square payment key');
      seen.add(key);
    }
  }
  assert.throws(() => sandboxIdempotencyKey(''), /required/);
});

test('bad Square payload errors never masquerade as a declined card', () => {
  const invalid = { ok: false, status: 400, data: { errors: [{
    code: 'VALUE_TOO_LONG', category: 'INVALID_REQUEST_ERROR',
  }] } };
  const genuineDecline = { ok: false, status: 400, data: { errors: [{
    code: 'GENERIC_DECLINE', category: 'PAYMENT_METHOD_ERROR',
  }] } };
  assert.equal(isExpectedSandboxCardDecline(invalid), false);
  assert.equal(isExpectedSandboxCardDecline(genuineDecline), true);
  assert.equal(isExpectedSandboxCardDecline({ ok: true, data: {} }), false);
  assert.equal(isExpectedSandboxCardDecline({ ok: false, data: {} }), false);
});

test('tampered replay is certified only by Square idempotency rejection', () => {
  const badRequest = { ok: false, status: 400, data: { errors: [{
    code: 'VALUE_TOO_LONG', category: 'INVALID_REQUEST_ERROR',
  }] } };
  const reused = { ok: false, status: 400, data: { errors: [{
    code: 'IDEMPOTENCY_KEY_REUSED', category: 'INVALID_REQUEST_ERROR',
  }] } };
  assert.equal(isExpectedSandboxIdempotencyConflict(badRequest), false);
  assert.equal(isExpectedSandboxIdempotencyConflict(reused), true);
  assert.equal(isExpectedSandboxIdempotencyConflict({ ok: true, data: {} }), false);
});
