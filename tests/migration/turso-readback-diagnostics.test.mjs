import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenTiming, safeTursoFailure } from '../../lib/database/turso-readback-diagnostics.mjs';

test('JWT timing detects an expired credential without returning any claims or token', () => {
  const claims = { exp: 100, privateValue: 'must-never-appear' };
  const token = 'header.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.secret-signature';
  assert.deepEqual(tokenTiming(token, 101), { jwt: true, expiryPresent: true, expired: true });
  assert.equal(tokenTiming(token, 99).expired, false);
  assert.equal(JSON.stringify(tokenTiming(token)).includes('must-never-appear'), false);
  assert.deepEqual(tokenTiming('not-a-jwt'), { jwt: false, expiryPresent: false, expired: null });
});

test('credential and provider errors become fixed categories with no raw secret-bearing detail', () => {
  const secret = 'private-token-https://credential@database.example';
  const errors = [
    [{ name: 'TypeError', message: 'TURSO_SDK_API_MISMATCH ' + secret }, 'SDK_API_MISMATCH'],
    [{ status: 401, message: secret }, 'AUTHENTICATION'],
    [{ status: 403, message: secret }, 'AUTHORIZATION'],
    [{ status: 404, message: secret }, 'DATABASE_OR_ENDPOINT_NOT_FOUND'],
    [{ cause: { message: 'ENOTFOUND ' + secret } }, 'NETWORK'],
    [{ message: 'no such table ' + secret }, 'SCHEMA'],
    [{ message: secret, name: secret, status: secret }, 'UNCLASSIFIED'],
  ];
  for (const [error, category] of errors) {
    const safe = safeTursoFailure(error);
    assert.equal(safe.category, category);
    assert.equal(JSON.stringify(safe).includes(secret), false);
  }
});
