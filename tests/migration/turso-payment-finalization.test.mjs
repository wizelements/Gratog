import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {reserveTursoCheckoutInventory} from '../../lib/checkout/turso-commerce.mjs';
import {finalizeVerifiedTursoSquarePayment,finalizeVerifiedTursoSquareRefund} from '../../lib/checkout/turso-payment-finalization.mjs';

const square=(id='sqp1')=>({id,status:'COMPLETED',currency:'USD',amountCents:1199,idempotencyKey:'square-checkout-1'});
function fixture(){
 const raw=new DatabaseSync(':memory:');raw.exec('PRAGMA foreign_keys=ON');
 for(const name of readdirSync('db/migrations').filter(n=>n.endsWith('.sql')).sort())
  raw.exec(readFileSync('db/migrations/'+name,'utf8'));
 const now=new Date().toISOString();
 raw.prepare('INSERT INTO products(id,name) VALUES (?,?)').run('sku','Test product');
 raw.prepare('INSERT INTO inventory(product_id,current_stock,source,updated_at) VALUES (?,?,?,?)')
  .run('sku',2,'staging',now);
 for(const id of ['o1','o2']) raw.prepare(
  'INSERT INTO orders(id,source_collection,status,payment_status,total_cents,currency,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)'
 ).run(id,'orders','pending','pending',1199,'USD',now,now);
 const tx={get:async(sql,...args)=>raw.prepare(sql).get(...args),
           all:async(sql,...args)=>raw.prepare(sql).all(...args),
           run:async(sql,...args)=>raw.prepare(sql).run(...args)};
 const db={...tx,transactionAsync:(fn)=>({immediate:async()=>{
  raw.exec('BEGIN IMMEDIATE');
  try{const answer=await fn(tx);raw.exec('COMMIT');return answer}
  catch(error){raw.exec('ROLLBACK');throw error}
 }})};
 const count=table=>raw.prepare('SELECT count(*) n FROM '+table).get().n;
 const order=id=>raw.prepare('SELECT * FROM orders WHERE id=?').get(id);
 const stock=()=>raw.prepare('SELECT current_stock FROM inventory WHERE product_id=?').get('sku').current_stock;
 return {raw,db,count,order,stock};
}
async function hold(f,id='o1'){
 const answer=await reserveTursoCheckoutInventory(f.db,{orderId:id,items:[{productId:'sku',quantity:1}]});
 assert.equal(answer.valid,true);
}
test('provider verification, amount and currency are mandatory; no side effects otherwise',async()=>{
 const f=fixture();
 try{
  await hold(f);
  await assert.rejects(finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:square()}),/NOT_INDEPENDENTLY_VERIFIED/);
  await assert.rejects(finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:{...square(),amountCents:1198},providerVerified:true}),/AMOUNT_OR_ORDER_MISMATCH/);
  await assert.rejects(finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:{...square(),status:'APPROVED'},providerVerified:true}),/NOT_INDEPENDENTLY_VERIFIED/);
  await assert.rejects(finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:{...square(),currency:'CAD'},providerVerified:true}),/NOT_INDEPENDENTLY_VERIFIED/);
  assert.equal(f.count('payments'),0);assert.equal(f.count('checkout_notification_outbox'),0);
  assert.equal(f.order('o1').payment_status,'pending');
 }finally{f.raw.close()}
});
test('no captured payment finalization without an actual stock claim',async()=>{
 const f=fixture();
 try{
  await assert.rejects(finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:square(),providerVerified:true}),/WITHOUT_RESERVED_STOCK/);
  assert.equal(f.count('payments'),0);assert.equal(f.order('o1').status,'pending');
 }finally{f.raw.close()}
});
test('atomic capture updates order, claim, debit ledger, payment record and two outbox entries',async()=>{
 const f=fixture();
 try{
  await hold(f);
  assert.deepEqual(await finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:square(),providerVerified:true}),
   {recorded:true,alreadyFinalized:false,amountCents:1199,notificationQueued:true});
  assert.equal(f.count('payments'),1);assert.equal(f.count('inventory_events'),1);
  assert.equal(f.count('checkout_notification_outbox'),2);
  assert.equal(f.order('o1').payment_status,'paid');assert.equal(f.order('o1').amount_paid_cents,1199);
  assert.equal(f.raw.prepare("SELECT status FROM checkout_stock_claims WHERE order_id='o1'").get().status,'committed');
  assert.equal(f.stock(),1);
  assert.deepEqual(await finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:square(),providerVerified:true}),
   {recorded:false,alreadyFinalized:true,amountCents:1199,notificationQueued:false});
  assert.equal(f.count('payments'),1);assert.equal(f.count('inventory_events'),1);assert.equal(f.count('checkout_notification_outbox'),2);
 }finally{f.raw.close()}
});
test('different Square payment ID cannot become a second charge on the same paid order',async()=>{
 const f=fixture();
 try{
  await hold(f);
  await finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:square(),providerVerified:true});
  await assert.rejects(finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:square('sqp2'),providerVerified:true}),
   /SECOND_CAPTURE_REQUIRES_RECONCILIATION/);
  assert.equal(f.count('payments'),1);assert.equal(f.stock(),1);
 }finally{f.raw.close()}
});
test('Square payment ID cannot be reused across distinct orders',async()=>{
 const f=fixture();
 try{
  await hold(f);
  await hold(f,'o2');
  await finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:square(),providerVerified:true});
  await assert.rejects(finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o2',squarePayment:square(),providerVerified:true}),/IDENTITY_REUSED/);
  assert.equal(f.count('payments'),1);assert.equal(f.order('o2').status,'pending');
 }finally{f.raw.close()}
});
test('database failure after adding payment rolls back all financial and notification writes',async()=>{
 const f=fixture();
 try{
  await hold(f);
  f.raw.prepare("INSERT INTO checkout_notification_outbox(order_id,kind,status,updated_at) VALUES ('o1','customer_confirmation','pending','2026-10-17')").run();
  await assert.rejects(finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:square(),providerVerified:true}),/UNIQUE constraint/);
  assert.equal(f.count('payments'),0);
  assert.equal(f.count('inventory_events'),0);
  assert.equal(f.order('o1').status,'pending');
  assert.equal(f.raw.prepare("SELECT status FROM checkout_stock_claims WHERE order_id='o1'").get().status,'reserved');
 }finally{f.raw.close()}
});
test('market preorder and regular checkout use the same atomic capture ledger',async()=>{
 const f=fixture();
 try{
  f.raw.prepare("UPDATE orders SET source_collection='marketorders',status='PREORDER_PENDING_PAYMENT',payment_status='PREORDER_PENDING_PAYMENT' WHERE id='o1'").run();
  await hold(f);
  const saved=await finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:square(),providerVerified:true});
  assert.equal(saved.recorded,true);
  assert.equal(f.order('o1').status,'paid');
  assert.equal(f.raw.prepare("SELECT source_collection FROM orders WHERE id='o1'").get().source_collection,'marketorders');
  assert.equal(f.count('checkout_notification_outbox'),2);
 }finally{f.raw.close()}
});
test('cancelled status with stale pending payment state does not resurrect order',async()=>{
 const f=fixture();
 try{
  await hold(f);
  f.raw.prepare("UPDATE orders SET status='cancelled' WHERE id='o1'").run();
  await assert.rejects(finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:square(),providerVerified:true}),/NOT_PAYABLE/);
  assert.equal(f.count('payments'),0);
 }finally{f.raw.close()}
});
test('captured payment on canceled order refuses status resurrection',async()=>{
 const f=fixture();
 try{
  await hold(f);
  f.raw.prepare("UPDATE orders SET payment_status='cancelled',status='cancelled' WHERE id='o1'").run();
  await assert.rejects(finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:square(),providerVerified:true}),/NOT_PAYABLE/);
  assert.equal(f.count('payments'),0);
 }finally{f.raw.close()}
});

test('actual-provider-confirmed partial/full refunds atomically update canonical order state',async()=>{
 const f=fixture();
 try{
  await hold(f);
  await finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:square(),providerVerified:true});
  const refund=id=>({id,paymentId:'sqp1',status:'COMPLETED',currency:'USD',amountCents:500});
  await assert.rejects(finalizeVerifiedTursoSquareRefund(f.db,{orderId:'o1',squareRefund:refund('r1')}),/NOT_INDEPENDENTLY_VERIFIED/);
  const first=await finalizeVerifiedTursoSquareRefund(f.db,{orderId:'o1',squareRefund:refund('r1'),providerVerified:true});
  assert.deepEqual(first,{alreadyRecorded:false,refundedCents:500,paymentStatus:'partially_refunded'});
  assert.equal(f.order('o1').payment_status,'partially_refunded');
  assert.deepEqual(await finalizeVerifiedTursoSquareRefund(f.db,{orderId:'o1',squareRefund:refund('r1'),providerVerified:true}),
   {alreadyRecorded:true,refundedCents:500,paymentStatus:'partially_refunded'});
  await assert.rejects(finalizeVerifiedTursoSquareRefund(f.db,{orderId:'o1',squareRefund:{...refund('r2'),amountCents:700},providerVerified:true}),/EXCEEDS_CAPTURE/);
  const full=await finalizeVerifiedTursoSquareRefund(f.db,{orderId:'o1',squareRefund:{...refund('r2'),amountCents:699},providerVerified:true});
  assert.equal(full.paymentStatus,'refunded');assert.equal(full.refundedCents,1199);
  assert.equal(f.order('o1').payment_status,'refunded');assert.equal(f.order('o1').status,'refunded');
  assert.equal(f.count('square_refund_entries'),2);
 }finally{f.raw.close()}
});
test('reused Square refund ID with changed amount or payment identity never alters totals',async()=>{
 const f=fixture();
 try{
  await hold(f);await finalizeVerifiedTursoSquarePayment(f.db,{orderId:'o1',squarePayment:square(),providerVerified:true});
  const refund={id:'r1',paymentId:'sqp1',status:'COMPLETED',currency:'USD',amountCents:200};
  await finalizeVerifiedTursoSquareRefund(f.db,{orderId:'o1',squareRefund:refund,providerVerified:true});
  await assert.rejects(finalizeVerifiedTursoSquareRefund(f.db,{orderId:'o1',squareRefund:{...refund,amountCents:100},providerVerified:true}),/ID_CONFLICT/);
  await assert.rejects(finalizeVerifiedTursoSquareRefund(f.db,{orderId:'o1',squareRefund:{...refund,paymentId:'another_payment'},providerVerified:true}),/CAPTURE_NOT_FOUND/);
  assert.equal(f.count('square_refund_entries'),1);
  assert.equal(f.order('o1').payment_status,'partially_refunded');
 }finally{f.raw.close()}
});
