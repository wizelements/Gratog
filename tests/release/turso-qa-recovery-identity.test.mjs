import test from 'node:test';
import assert from 'node:assert/strict';
import {requireQaRecoveryIdentity} from '../../scripts/release/qa-recovery-identity.mjs';

const qa = {email: 'delivered@resend.dev', name: 'Preview Certification Buyer'};
const record = customer => ({customer_snapshot_json: JSON.stringify(customer)});
test('missing order is distinct from identity mismatch', () => {
  assert.throws(() => requireQaRecoveryIdentity(null), /QA_ORDER_NOT_FOUND/);
  assert.throws(() => requireQaRecoveryIdentity(undefined), /QA_ORDER_NOT_FOUND/);
});
test('malformed or missing snapshot is rejected without leaking content', () => {
  assert.throws(() => requireQaRecoveryIdentity({customer_snapshot_json:'{'}), /QA_ORDER_SNAPSHOT_INVALID/);
  assert.throws(() => requireQaRecoveryIdentity({customer_snapshot_json:null}), /QA_ORDER_SNAPSHOT_INVALID/);
  assert.throws(() => requireQaRecoveryIdentity(record(null)), /QA_ORDER_IDENTITY_REQUIRED/);
});
test('only exact synthetic QA identity is accepted', () => {
  assert.equal(requireQaRecoveryIdentity(record(qa)),true);
  assert.throws(() => requireQaRecoveryIdentity(record({...qa,name:'Another Buyer'})), /QA_ORDER_IDENTITY_REQUIRED/);
  assert.throws(() => requireQaRecoveryIdentity(record({...qa,email:'customer@example.com'})), /QA_ORDER_IDENTITY_REQUIRED/);
});
