import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {assertCloneAddress,validateCloneBundle,recoveryDigest,buildRecoveredCloneOrder} from '../../lib/checkout/mongo-clone-reverse-delta.mjs';
import {recoveryFixture} from './mongo-clone-reverse-delta-fixtures.mjs';

test('clone executor rejects production, remote, credentials and mismatched namespace',()=>{
  const name='tog_recovery_clone_fixture';
  assertCloneAddress(`mongodb://127.0.0.1:27027/${name}?directConnection=true`,name);
  for(const uri of [
    `mongodb+srv://cluster.example/${name}?directConnection=true`,
    `mongodb://production.example/${name}?directConnection=true`,
    `mongodb://user:password@127.0.0.1/${name}?directConnection=true`,
    'mongodb://127.0.0.1/taste_of_gratitude?directConnection=true',
    `mongodb://127.0.0.1/${name}`,
  ]) assert.throws(()=>assertCloneAddress(uri,name));
});
test('full and partial refund fixture has one deterministic inventory chain',()=>{
  const b=recoveryFixture();
  const result=validateCloneBundle(b);
  assert.equal(result.digest,recoveryDigest(structuredClone(b)));
  assert.equal(result.stockFinal.get('fixture-product-a'),9);
  assert.equal(result.stockFinal.get('fixture-product-b'),3);
});
test('inventory mismatch, duplicate debit, or unsupported restock blocks before replay',()=>{
  for(const mutate of [
    b=>{b.records[1].inventoryEvents[0].before=8;},
    b=>{b.records[0].inventoryEvents.push({...b.records[0].inventoryEvents[0]});},
    b=>{delete b.records[1].inventoryEvents[1].returnDecisionId;},
    b=>{b.records[0].inventoryEvents=[];},
  ]) {const b=recoveryFixture();mutate(b);assert.throws(()=>validateCloneBundle(b));}
});
test('ambiguous dates, duplicate payment, and refund identity corruption block replay',()=>{
  for(const mutate of [
    b=>{b.records[0].order.updatedAt='not-a-date';},
    b=>{b.records[0].order.updatedAt='2027-01-01T00:00:00Z';},
    b=>{b.records[0].order.updatedAt=b.freezeWatermark;},
    b=>{b.records[1].payment.squarePaymentId=b.records[0].payment.squarePaymentId;},
    b=>{b.records[0].refunds[0].paymentId='other-payment';},
    b=>{b.records[0].order.refundedAmountCents=0;},
  ]) {const b=recoveryFixture();mutate(b);assert.throws(()=>validateCloneBundle(b));}
});
test('notification evidence cannot be erased or labelled delivered without identity',()=>{
  for(const mutate of [
    b=>{b.records[0].notifications.pop();},
    b=>{delete b.records[0].notifications[0].providerMessageId;},
    b=>{b.records[0].notifications[1].kind='customer_confirmation';},
  ]) {const b=recoveryFixture();mutate(b);assert.throws(()=>validateCloneBundle(b));}
});
test('webhook carryover requires processed provider-object binding and unique event IDs',()=>{
  for(const mutate of [
    b=>{b.records[0].webhookEvents[0].providerObjectId='unrelated-payment';},
    b=>{b.records[0].webhookEvents[0].status='failed';},
    b=>{b.records[1].webhookEvents[0].eventId=b.records[0].webhookEvents[0].eventId;},
  ]) {const b=recoveryFixture();mutate(b);assert.throws(()=>validateCloneBundle(b));}
});
test('recovery holds never fabricate a send time for pending or ambiguous notifications',()=>{
  const b=recoveryFixture(), record=b.records[0];
  record.notifications=record.notifications.map(n=>({kind:n.kind,sourceStatus:'pending',attemptCount:0}));
  // Even a conflicting legacy field in the input cannot be mistaken for proof.
  record.order.emailSentAt=b.throughWatermark;
  record.order.staffNotifiedAt=b.throughWatermark;
  validateCloneBundle(b);
  const recovered=buildRecoveredCloneOrder(record);
  assert.equal(recovered.emailSentAt,undefined);
  assert.equal(recovered.staffNotifiedAt,undefined);
  assert.equal(recovered.emailClaimedAt,undefined);
  assert.equal(recovered.staffNotificationClaimedAt,undefined);
  assert.equal(recovered.customerNotificationRecoveryHold,true);
  assert.equal(recovered.staffNotificationRecoveryHold,true);
  assert.equal(recovered.customerNotificationSourceStatus,'pending');
});
test('actual source submission time is preserved without becoming a delivery claim',()=>{
  const record=recoveryFixture().records[0], recovered=buildRecoveredCloneOrder(record);
  assert.equal(recovered.emailSentAt,record.notifications[0].sourceAcceptedAt);
  assert.equal(recovered.staffNotifiedAt,record.notifications[1].sourceAcceptedAt);
  assert.equal(recovered.staffNotificationSourceStatus,'accepted');
  assert.equal(recovered.staffNotificationClaimedAt,undefined);
});
