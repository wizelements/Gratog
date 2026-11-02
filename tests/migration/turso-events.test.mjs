import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {claimTursoSquareWebhook,completeTursoSquareWebhook,claimTursoNotification,
 markTursoNotificationSent,markTursoNotificationUncertain} from '../../lib/checkout/turso-events.mjs';
function fixture(){
 const raw=new DatabaseSync(':memory:');raw.exec('PRAGMA foreign_keys=ON');
 for(const name of readdirSync('db/migrations').filter(n=>n.endsWith('.sql')).sort())
  raw.exec(readFileSync('db/migrations/'+name,'utf8'));
 raw.prepare("INSERT INTO orders(id,source_collection,status,total_cents,created_at,updated_at) VALUES ('o1','orders','pending',1199,'2026-10-17','2026-10-17')").run();
 const tx={get:async(sql,...args)=>raw.prepare(sql).get(...args),
          run:async(sql,...args)=>raw.prepare(sql).run(...args)};
 const db={transactionAsync:(fn)=>({immediate:async()=>{
  raw.exec('BEGIN IMMEDIATE');try{const v=await fn(tx);raw.exec('COMMIT');return v}catch(e){raw.exec('ROLLBACK');throw e}
 }})};
 return {raw,db};
}
test('signed Square webhook identity is claimed only once and completion is idempotent',async()=>{
 const f=fixture(),e={eventId:'s1',eventType:'payment.updated'};
 try{
  assert.deepEqual(await claimTursoSquareWebhook(f.db,e),{process:true,alreadyProcessed:false,needsReconciliation:false});
  assert.deepEqual(await claimTursoSquareWebhook(f.db,e),{process:false,alreadyProcessed:false,needsReconciliation:true});
  assert.equal(await completeTursoSquareWebhook(f.db,{...e,result:{verified:true}}),true);
  assert.deepEqual(await claimTursoSquareWebhook(f.db,e),{process:false,alreadyProcessed:true,needsReconciliation:false});
  assert.equal(await completeTursoSquareWebhook(f.db,e),false);
  const row=f.raw.prepare('SELECT attempt_count FROM webhook_events WHERE event_id=?').get('s1');
  assert.equal(row.attempt_count,1);
 }finally{f.raw.close()}
});
test('a replay cannot repurpose an event ID or mark an unknown event processed',async()=>{
 const f=fixture();
 try{
  await claimTursoSquareWebhook(f.db,{eventId:'s1',eventType:'payment.updated'});
  await assert.rejects(claimTursoSquareWebhook(f.db,{eventId:'s1',eventType:'refund.updated'}),/ID_REUSED/);
  await assert.rejects(completeTursoSquareWebhook(f.db,{eventId:'not-created',eventType:'payment.updated'}),/CLAIM_MISSING/);
  await assert.rejects(claimTursoSquareWebhook(f.db,{eventId:'unknown',eventType:'payment.updated'}),/IDENTITY_REQUIRED/);
 }finally{f.raw.close()}
});
test('one customer confirmation outbox claim, exact provider message ID and no resending',async()=>{
 const f=fixture(),p={orderId:'o1',kind:'customer_confirmation'};
 try{
  assert.deepEqual(await claimTursoNotification(f.db,p),{send:true,alreadySent:false,needsReconciliation:false});
  assert.deepEqual(await claimTursoNotification(f.db,p),{send:false,alreadySent:false,needsReconciliation:true});
  assert.equal(await markTursoNotificationSent(f.db,{...p,providerMessageId:'provider-1'}),true);
  assert.equal(await markTursoNotificationSent(f.db,{...p,providerMessageId:'provider-1'}),false);
  await assert.rejects(markTursoNotificationSent(f.db,{...p,providerMessageId:'provider-2'}),/PROVIDER_ID_CONFLICT/);
  assert.deepEqual(await claimTursoNotification(f.db,p),{send:false,alreadySent:true,needsReconciliation:false});
  const row=f.raw.prepare('SELECT attempt_count,provider_message_id FROM checkout_notification_outbox WHERE order_id=? AND kind=?').get('o1',p.kind);
  assert.equal(row.attempt_count,1);assert.equal(row.provider_message_id,'provider-1');
 }finally{f.raw.close()}
});
test('uncertain staff notification is held for reconciliation rather than sent again',async()=>{
 const f=fixture(),p={orderId:'o1',kind:'staff_notification'};
 try{
  await claimTursoNotification(f.db,p);
  assert.equal(await markTursoNotificationUncertain(f.db,p),true);
  assert.equal(await markTursoNotificationUncertain(f.db,p),false);
  assert.deepEqual(await claimTursoNotification(f.db,p),{send:false,alreadySent:false,needsReconciliation:true});
  await assert.rejects(markTursoNotificationSent(f.db,{...p,providerMessageId:'sender-1'}),/REQUIRES_RECONCILIATION/);
 }finally{f.raw.close()}
});
test('notification claims reject nonexistent orders, invalid types and fake delivery evidence',async()=>{
 const f=fixture();
 try{
  await assert.rejects(claimTursoNotification(f.db,{orderId:'not-an-order',kind:'staff_notification'}),/ORDER_NOT_FOUND/);
  await assert.rejects(claimTursoNotification(f.db,{orderId:'o1',kind:'sms_fake'}),/IDENTITY_REQUIRED/);
  await assert.rejects(markTursoNotificationSent(f.db,{orderId:'o1',kind:'customer_confirmation',providerMessageId:'none'}),/CLAIM_MISSING/);
  await assert.rejects(claimTursoSquareWebhook(f.db,{eventId:'',eventType:'payment.updated'}),/IDENTITY_REQUIRED/);
 }finally{f.raw.close()}
});
