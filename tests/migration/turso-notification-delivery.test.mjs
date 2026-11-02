import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {
  recordVerifiedTursoResendEvent,
  reconcileTursoNotificationDelivery,
} from '../../lib/checkout/turso-notification-delivery.mjs';

const sentAt = '2026-10-18T04:00:00.000Z';
const eventAt = '2026-10-18T04:00:01.000Z';
function fixture({beforeDeliveryMigration = false} = {}) {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys=ON');
  for (const name of readdirSync('db/migrations').filter(name => name.endsWith('.sql')).sort()) {
    if (beforeDeliveryMigration && name === '0013_notification_delivery.sql') continue;
    raw.exec(readFileSync('db/migrations/' + name,'utf8'));
  }
  for (const id of ['o1','o2']) raw.prepare(
    'INSERT INTO orders(id,source_collection,status,payment_status,total_cents,created_at,updated_at) VALUES (?,?,?,?,?,?,?)'
  ).run(id,'orders','paid','paid',1199,sentAt,sentAt);
  let injectFailure = false;
  const tx = {
    get:async (sql,...args) => raw.prepare(sql).get(...args),
    all:async (sql,...args) => raw.prepare(sql).all(...args),
    run:async (sql,...args) => {
      if (injectFailure && sql.startsWith('INSERT INTO checkout_notification_deliveries('))
        throw Error('INJECTED_DELIVERY_WRITE_FAILURE');
      return raw.prepare(sql).run(...args);
    },
  };
  const db = {...tx,transactionAsync:fn => ({immediate:async () => {
    raw.exec('BEGIN IMMEDIATE');
    try { const result = await fn(tx); raw.exec('COMMIT'); return result; }
    catch (error) { raw.exec('ROLLBACK'); throw error; }
  }})};
  const bind = ({orderId='o1',kind='customer_confirmation',messageId='msg-1',status='sent'}={}) =>
    raw.prepare('INSERT INTO checkout_notification_outbox(order_id,kind,status,provider_message_id,attempt_count,sent_at,updated_at) VALUES (?,?,?,?,?,?,?)')
      .run(orderId,kind,status,messageId,1,sentAt,sentAt);
  const rows = table => raw.prepare('SELECT * FROM ' + table).all();
  return {raw,db,bind,rows,fail:value => { injectFailure = value; }};
}
const event = ({type='email.delivered',messageId='msg-1',recipient='buyer@example.invalid',at=eventAt,extra={}}={}) => ({
  type,created_at:at,data:{email_id:messageId,to:[recipient],...extra},
});
const record = (f,value=event(),eventId='evt-1') =>
  recordVerifiedTursoResendEvent(f.db,{eventId,event:value,signatureVerified:true});
const eventsTable = 'checkout_notification_delivery_events';
const deliveriesTable = 'checkout_notification_deliveries';

test('accepted outbox does not fabricate delivery before signed evidence exists',async () => {
  const f=fixture();
  try {
    f.bind();
    assert.deepEqual(await reconcileTursoNotificationDelivery(f.db,{providerMessageId:'msg-1'}),{
      matched:true,applied:0,orderId:'o1',kind:'customer_confirmation',recipients:[],needsReconciliation:false,
    });
    assert.equal(f.rows(deliveriesTable).length,0);
    assert.equal(f.rows('checkout_notification_outbox')[0].status,'sent');
  } finally {f.raw.close();}
});

test('adapter refuses unverified event metadata and invalid provider identity without writes',async () => {
  const f=fixture();
  try {
    f.bind();
    for (const signatureVerified of [undefined,false,'true']) await assert.rejects(
      recordVerifiedTursoResendEvent(f.db,{eventId:'evt-1',event:event(),signatureVerified}),/SIGNATURE_VERIFICATION_REQUIRED/);
    await assert.rejects(record(f,event({messageId:''})),/IDENTITY_REQUIRED/);
    await assert.rejects(record(f,event({at:'not-a-timestamp'})),/TIMESTAMP_REQUIRED/);
    assert.equal(f.rows(eventsTable).length,0);
  } finally {f.raw.close();}
});

test('email.sent means acceptance and never means delivered',async () => {
  const f=fixture();
  try {
    f.bind();
    const result=await record(f,event({type:'email.sent'}));
    assert.equal(result.recipients[0].status,'accepted');
    const row=f.rows(deliveriesTable)[0];
    assert.equal(row.accepted_at,sentAt);
    assert.equal(row.delivered_at,null);
    assert.equal(row.recipient_role,'customer');
  } finally {f.raw.close();}
});

test('delivery binds only to accepted provider identity and preserves the paid order and outbox claim',async () => {
  const f=fixture();
  try {
    f.bind();
    const result=await record(f);
    assert.equal(result.matched,true);
    assert.equal(result.applied,1);
    assert.equal(result.orderId,'o1');
    assert.equal(result.recipients[0].status,'delivered');
    const row=f.rows(deliveriesTable)[0];
    assert.equal(row.delivered_at,eventAt);
    assert.equal(row.provider_message_id,'msg-1');
    assert.equal(row.order_id,'o1');
    assert.equal(f.rows('checkout_notification_outbox')[0].status,'sent');
    assert.equal(f.rows('checkout_notification_outbox')[0].attempt_count,1);
    assert.equal(f.rows('orders')[0].payment_status,'paid');
    assert.equal(JSON.stringify(f.rows(eventsTable)).includes('buyer@example.invalid'),false);
  } finally {f.raw.close();}
});

test('exact signed-event replay is durable and does not duplicate notification or delivery rows',async () => {
  const f=fixture();
  try {
    f.bind();
    await record(f);
    const replay=await record(f);
    assert.equal(replay.duplicate,true);
    assert.equal(replay.applied,0);
    assert.equal(f.rows(eventsTable).length,1);
    assert.equal(f.rows(eventsTable)[0].receipt_count,2);
    assert.equal(f.rows(deliveriesTable).length,1);
    assert.equal(f.rows('checkout_notification_outbox').length,1);
  } finally {f.raw.close();}
});

test('reusing an event ID with a changed message, recipient, type, time or payload is rejected',async () => {
  const f=fixture();
  try {
    f.bind();await record(f);
    for (const changed of [event({messageId:'msg-2'}),event({recipient:'other@example.invalid'}),
      event({type:'email.sent'}),event({at:sentAt}),event({extra:{subject:'changed'}})])
      await assert.rejects(record(f,changed),/EVENT_ID_REUSED/);
    assert.equal(f.rows(eventsTable)[0].receipt_count,1);
    assert.equal(f.rows(deliveriesTable)[0].delivery_status,'delivered');
  } finally {f.raw.close();}
});

test('event before send acknowledgement is retained and later reconciled by exact message ID',async () => {
  const f=fixture();
  try {
    const received=await record(f,event({extra:{orderId:'o2',kind:'staff_notification',tags:{order_id:'o2'}}}));
    assert.equal(received.matched,false);
    assert.equal(received.needsReconciliation,true);
    assert.equal(f.rows(eventsTable)[0].status,'unmatched');
    assert.equal(f.rows(deliveriesTable).length,0);
    f.bind();
    const repaired=await reconcileTursoNotificationDelivery(f.db,{providerMessageId:'msg-1'});
    assert.equal(repaired.orderId,'o1');
    assert.equal(repaired.kind,'customer_confirmation');
    assert.equal(repaired.applied,1);
    assert.equal(f.rows(eventsTable)[0].status,'applied');
    assert.equal((await reconcileTursoNotificationDelivery(f.db,{providerMessageId:'msg-1'})).applied,0);
  } finally {f.raw.close();}
});

test('provider retry after acceptance resolves earlier unmatched delivery without sending anything',async () => {
  const f=fixture();
  try {
    await record(f);f.bind();
    const retried=await record(f);
    assert.equal(retried.duplicate,true);
    assert.equal(retried.applied,1);
    assert.equal(f.rows(eventsTable)[0].receipt_count,2);
    assert.equal(f.rows('checkout_notification_outbox')[0].attempt_count,1);
  } finally {f.raw.close();}
});

test('an uncertain outbox is not promoted or resent by a delivery event',async () => {
  const f=fixture();
  try {
    f.bind({status:'needs_reconciliation'});
    const received=await record(f);
    assert.equal(received.matched,false);
    assert.equal(f.rows(deliveriesTable).length,0);
    assert.equal(f.rows('checkout_notification_outbox')[0].status,'needs_reconciliation');
    assert.equal(f.rows(eventsTable)[0].status,'unmatched');
  } finally {f.raw.close();}
});

test('out-of-order acceptance, delay and failure cannot downgrade recorded delivery',async () => {
  const f=fixture();
  try {
    f.bind();await record(f);
    for (const [i,type] of ['email.sent','email.delivery_delayed','email.failed'].entries()) {
      await record(f,event({type,at:'2026-10-18T03:59:59.000Z'}),'late-'+i);
      assert.equal(f.rows(deliveriesTable)[0].delivery_status,'delivered');
    }
    const row=f.rows(deliveriesTable)[0];
    assert.equal(row.last_event_at,eventAt);
    assert.equal(row.delivered_at,eventAt);
    assert.equal(row.failed_at,'2026-10-18T03:59:59.000Z');
    assert.equal(row.accepted_at,'2026-10-18T03:59:59.000Z');
  } finally {f.raw.close();}
});

test('bounce and complaint facts remain durable even when delivery or older events arrive later',async () => {
  const f=fixture();
  try {
    f.bind();
    await record(f,event({type:'email.bounced'}),'bounce');
    await record(f,event(),'delivery');
    assert.equal(f.rows(deliveriesTable)[0].delivery_status,'bounced');
    await record(f,event({type:'email.complained'}),'complaint');
    await record(f,event({type:'email.sent'}),'sent');
    const row=f.rows(deliveriesTable)[0];
    assert.equal(row.delivery_status,'complained');
    assert.equal(row.bounced_at,eventAt);
    assert.equal(row.complained_at,eventAt);
    assert.equal(row.delivered_at,eventAt);
  } finally {f.raw.close();}
});

test('recipient outcomes remain separate for a staff message',async () => {
  const f=fixture();
  try {
    f.bind({kind:'staff_notification'});
    await record(f,event({recipient:'staff-one@example.invalid'}),'delivery');
    const result=await record(f,event({type:'email.bounced',recipient:'staff-two@example.invalid'}),'bounce');
    assert.deepEqual(result.recipients.map(row=>row.status).sort(),['bounced','delivered']);
    assert.equal(f.rows(deliveriesTable).length,2);
    assert.equal(f.rows(deliveriesTable).every(row=>row.recipient_role==='staff'),true);
  } finally {f.raw.close();}
});

test('engagement and unsupported event types never fabricate delivery or acceptance',async () => {
  const f=fixture();
  try {
    f.bind();
    for (const type of ['email.opened','email.clicked','email.scheduled','email.unknown']) {
      const result=await record(f,event({type}),type);
      assert.equal(result.ignored,true);
    }
    assert.equal(f.rows(eventsTable).length,4);
    assert.equal(f.rows(eventsTable).every(row=>row.status==='ignored'),true);
    assert.equal(f.rows(deliveriesTable).length,0);
  } finally {f.raw.close();}
});

test('ambiguous multi-recipient and malformed recipient payloads are refused',async () => {
  const f=fixture();
  try {
    for (const to of [[],['one@example.invalid','two@example.invalid'],['bad-address'],'buyer@example.invalid']) {
      const body=event();body.data.to=to;
      await assert.rejects(record(f,body),/SINGLE_RECIPIENT_REQUIRED/);
    }
    assert.equal(f.rows(eventsTable).length,0);
  } finally {f.raw.close();}
});

test('database constraints forbid one provider message belonging to multiple orders or later rebinding',async () => {
  const f=fixture();
  try {
    f.bind();
    assert.throws(()=>f.bind({orderId:'o2'}),/UNIQUE constraint/);
    assert.throws(()=>f.raw.prepare("UPDATE checkout_notification_outbox SET provider_message_id='msg-2' WHERE order_id='o1'").run(),/BINDING_IMMUTABLE/);
    assert.throws(()=>f.raw.prepare("UPDATE checkout_notification_outbox SET provider_message_id=NULL WHERE order_id='o1'").run(),/BINDING_IMMUTABLE/);
    await record(f);
    assert.throws(()=>f.raw.prepare("UPDATE checkout_notification_deliveries SET order_id='o2' WHERE provider_message_id='msg-1'").run(),/FOREIGN KEY/);
  } finally {f.raw.close();}
});

test('failure between event receipt and state update rolls back atomically; retry safely completes',async () => {
  const f=fixture();
  try {
    f.bind();f.fail(true);
    await assert.rejects(record(f),/INJECTED_DELIVERY_WRITE_FAILURE/);
    assert.equal(f.rows(eventsTable).length,0);
    assert.equal(f.rows(deliveriesTable).length,0);
    f.fail(false);
    assert.equal((await record(f)).applied,1);
    assert.equal(f.rows(eventsTable).length,1);
    assert.equal(f.rows(deliveriesTable)[0].delivery_status,'delivered');
  } finally {f.raw.close();}
});

test('canonical payload fingerprint tolerates object-key ordering but not changed content',async () => {
  const f=fixture();
  try {
    f.bind();await record(f);
    const reordered={data:{to:['buyer@example.invalid'],email_id:'msg-1'},created_at:eventAt,type:'email.delivered'};
    assert.equal((await record(f,reordered)).duplicate,true);
  } finally {f.raw.close();}
});

test('migration refuses duplicate historical provider bindings rather than silently relabeling them',() => {
  const f=fixture({beforeDeliveryMigration:true});
  try {
    f.bind();f.bind({orderId:'o2'});
    assert.throws(()=>f.raw.exec(readFileSync('db/migrations/0013_notification_delivery.sql','utf8')),/UNIQUE constraint/);
    assert.equal(f.rows('checkout_notification_outbox').length,2);
    assert.equal(f.rows('checkout_notification_outbox').every(row=>row.provider_message_id==='msg-1'),true);
  } finally {f.raw.close();}
});
