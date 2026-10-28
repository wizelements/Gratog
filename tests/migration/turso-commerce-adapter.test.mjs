import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {
  reserveTursoCheckoutInventory,releaseTursoCheckoutInventory,commitTursoCheckoutInventory,
  reconcileTursoVerifiedRefund,
} from '../../lib/checkout/turso-commerce.mjs';

function fixture(){
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  for(const name of readdirSync('db/migrations').filter(n=>n.endsWith('.sql')).sort()){
    raw.exec(readFileSync('db/migrations/'+name,'utf8'));
  }
  const timestamp=new Date().toISOString();
  for(const sku of ['sku1','sku2','sku3']){
    raw.prepare('INSERT INTO products(id,name) VALUES (?,?)').run(sku,sku);
    raw.prepare('INSERT INTO inventory(product_id,current_stock,source,updated_at) VALUES (?,?,?,?)')
       .run(sku,sku==='sku3'?0:2,'test',timestamp);
  }
  for(const id of ['o1','o2','o3','o4']){
    raw.prepare('INSERT INTO orders(id,source_collection,status,total_cents,created_at,updated_at) VALUES (?,?,?,?,?,?)')
      .run(id,'orders','pending',1199,timestamp,timestamp);
  }
  const tx = {
    get:async(sql,...args)=>raw.prepare(sql).get(...args),
    all:async(sql,...args)=>raw.prepare(sql).all(...args),
    run:async(sql,...args)=>raw.prepare(sql).run(...args),
  };
  const db={...tx,transactionAsync:(fn)=>({immediate:async()=>{
    raw.exec('BEGIN IMMEDIATE');
    try { const v=await fn(tx); raw.exec('COMMIT'); return v; }
    catch(e){raw.exec('ROLLBACK');throw e}
  }})};
  return {raw,db,stock:(sku)=>raw.prepare('SELECT current_stock FROM inventory WHERE product_id=?').get(sku).current_stock,
    claims:()=>raw.prepare('SELECT count(*) count FROM checkout_stock_claims').get().count,
    ledger:()=>raw.prepare('SELECT count(*) count FROM square_refund_entries').get().count};
}
test('reserve is single-write, idempotent, and rejects different payload on replay',async()=>{
 const x=fixture();
 try{
   assert.deepEqual(await reserveTursoCheckoutInventory(x.db,{orderId:'o1',items:[{productId:'sku1',quantity:1}]}),{valid:true,alreadyReserved:false});
   assert.equal(x.stock('sku1'),1);
   assert.deepEqual(await reserveTursoCheckoutInventory(x.db,{orderId:'o1',items:[{productId:'sku1',quantity:1}]}),{valid:true,alreadyReserved:true});
   assert.deepEqual(await reserveTursoCheckoutInventory(x.db,{orderId:'o1',items:[{productId:'sku1',quantity:2}]}),{valid:false,code:'CHECKOUT_STOCK_CLAIM_CONFLICT'});
   assert.equal(x.stock('sku1'),1);assert.equal(x.claims(),1);
 }finally{x.raw.close()}
});
test('multi-item out-of-stock error rolls back previous item debit and claim',async()=>{
 const x=fixture();
 try{
   assert.deepEqual(await reserveTursoCheckoutInventory(x.db,{orderId:'o1',items:[{productId:'sku1',quantity:1},{productId:'sku3',quantity:1}]}),
    {valid:false,code:'INVENTORY_UNAVAILABLE'});
   assert.equal(x.stock('sku1'),2);assert.equal(x.claims(),0);
 }finally{x.raw.close()}
});
test('decline release restores once; permitted retry re-reserves exactly once',async()=>{
 const x=fixture();
 try{
  await reserveTursoCheckoutInventory(x.db,{orderId:'o1',items:[{productId:'sku1',quantity:1}]});
  assert.equal(await releaseTursoCheckoutInventory(x.db,'o1'),true);
  assert.equal(await releaseTursoCheckoutInventory(x.db,'o1'),false);
  assert.equal(x.stock('sku1'),2);
  assert.deepEqual(await reserveTursoCheckoutInventory(x.db,{orderId:'o1',items:[{productId:'sku1',quantity:1}]}),{valid:true,alreadyReserved:false});
  assert.equal(x.stock('sku1'),1);assert.equal(x.claims(),1);
 }finally{x.raw.close()}
});
test('captured order commits without double debit or duplicate inventory event',async()=>{
 const x=fixture();
 try{
  assert.deepEqual(await commitTursoCheckoutInventory(x.db,'o1'),{managed:false,skipped:false,debited:0});
  await reserveTursoCheckoutInventory(x.db,{orderId:'o1',items:[{productId:'sku1',quantity:1}]});
  assert.deepEqual(await commitTursoCheckoutInventory(x.db,'o1'),{managed:true,skipped:false,debited:1});
  assert.deepEqual(await commitTursoCheckoutInventory(x.db,'o1'),{managed:true,skipped:true,debited:0});
  assert.equal(x.stock('sku1'),1);
  assert.equal(x.raw.prepare('SELECT COUNT(*) n FROM inventory_events WHERE order_id=?').get('o1').n,1);
  assert.equal(await releaseTursoCheckoutInventory(x.db,'o1'),false);
 }finally{x.raw.close()}
});
test('refund ledger supports partial/full, replays exact ID, blocks tampered and over-refund',async()=>{
 const x=fixture(),base={orderId:'o1',paymentId:'p1',paidCents:1199,currency:'USD'};
 try{
  assert.deepEqual(await reconcileTursoVerifiedRefund(x.db,{...base,refundId:'r1',amountCents:500}),{
   fullyRefunded:false,paymentStatus:'partially_refunded',refundedCents:500,paidCents:1199,alreadyRecorded:false
  });
  assert.equal((await reconcileTursoVerifiedRefund(x.db,{...base,refundId:'r1',amountCents:500})).alreadyRecorded,true);
  await assert.rejects(reconcileTursoVerifiedRefund(x.db,{...base,refundId:'r1',amountCents:400}),/REUSED_WITH_CHANGED/);
  await assert.rejects(reconcileTursoVerifiedRefund(x.db,{...base,refundId:'r2',amountCents:700}),/EXCEEDS_CAPTURED/);
  const full=await reconcileTursoVerifiedRefund(x.db,{...base,refundId:'r2',amountCents:699});
  assert.equal(full.paymentStatus,'refunded');assert.equal(full.refundedCents,1199);assert.equal(x.ledger(),2);
 }finally{x.raw.close()}
});
test('invalid quantities, missing orders and lost write confirmation cannot authorize payments',async()=>{
 const x=fixture();
 try{
  assert.deepEqual(await reserveTursoCheckoutInventory(x.db,{orderId:'o1',items:[{productId:'sku1',quantity:1.5}]}),{valid:false,code:'INVALID_ORDER_ITEMS'});
  assert.deepEqual(await reserveTursoCheckoutInventory(x.db,{orderId:'o1',items:[{productId:'sku1',quantity:9007199254740991}]}),{valid:false,code:'INVALID_ORDER_ITEMS'});
  await assert.rejects(reserveTursoCheckoutInventory(x.db,{orderId:'does-not-exist',items:[{productId:'sku1',quantity:1}]}),/ORDER_NOT_FOUND/);
  const broken={...x.db,transactionAsync:(fn)=>({immediate:async()=>{
   x.raw.exec('BEGIN');
   const fake={...x.db,run:async (...args)=>{await x.db.run(...args);return {rowsAffected:1}}};
   try{const v=await fn(fake);x.raw.exec('COMMIT');return v}catch(e){x.raw.exec('ROLLBACK');throw e}
  }})};
  await assert.rejects(reserveTursoCheckoutInventory(broken,{orderId:'o1',items:[{productId:'sku1',quantity:1}]}),/WRITE_CONFIRMATION_UNAVAILABLE/);
  assert.equal(x.stock('sku1'),2);assert.equal(x.claims(),0);
 }finally{x.raw.close()}
});
