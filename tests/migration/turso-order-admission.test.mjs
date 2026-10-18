import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {createOrReuseTursoPricedOrder,TursoCheckoutConflict} from '../../lib/checkout/turso-order-admission.mjs';
const priced=(attemptKey='checkout-attempt-1')=>({
 attemptKey,fingerprint:'a'.repeat(64),customer:{email:'staging-fixture@example.invalid'},
 fulfillment:{type:'pickup'},currency:'USD',
 subtotalCents:1199,taxCents:0,totalCents:1199,
 items:[{productId:'sku1',name:'Fixture',quantity:1,unitPriceCents:1199,lineTotalCents:1199}]
});
function fixture(){
 const raw=new DatabaseSync(':memory:');raw.exec('PRAGMA foreign_keys=ON');
 for(const name of readdirSync('db/migrations').filter(n=>n.endsWith('.sql')).sort())raw.exec(readFileSync('db/migrations/'+name,'utf8'));
 raw.prepare('INSERT INTO products(id,name) VALUES (?,?)').run('sku1','Fixture');
 const tx={
  get:async(sql,...values)=>raw.prepare(sql).get(...values),
  all:async(sql,...values)=>raw.prepare(sql).all(...values),
  run:async(sql,...values)=>raw.prepare(sql).run(...values),
 };
 const conn={...tx,transactionAsync:(fn)=>({immediate:async()=>{
  raw.exec('BEGIN IMMEDIATE');
  try{const x=await fn(tx);raw.exec('COMMIT');return x}
  catch(e){raw.exec('ROLLBACK');throw e}
 }})};
 const count=(table)=>raw.prepare('SELECT count(*) n FROM '+table).get().n;
 return {raw,conn,count};
}
test('one order and item for the same checkout key replay',async()=>{
 const f=fixture();
 try{
  const a=await createOrReuseTursoPricedOrder(f.conn,priced());
  const b=await createOrReuseTursoPricedOrder(f.conn,priced());
  assert.equal(a.reused,false);assert.equal(b.reused,true);assert.equal(a.orderId,b.orderId);
  assert.equal(f.count('orders'),1);assert.equal(f.count('order_items'),1);assert.equal(f.count('idempotency_keys'),1);
 }finally{f.raw.close()}
});
test('key reuse with different request fingerprint or total never returns payable order',async()=>{
 const f=fixture();
 try{
  await createOrReuseTursoPricedOrder(f.conn,priced());
  await assert.rejects(createOrReuseTursoPricedOrder(f.conn,{...priced(),fingerprint:'b'.repeat(64)}),TursoCheckoutConflict);
  await assert.rejects(createOrReuseTursoPricedOrder(f.conn,{...priced(),totalCents:1200}),TursoCheckoutConflict);
  assert.equal(f.count('orders'),1);
 }finally{f.raw.close()}
});
test('foreign key failure rolls back order and idempotency key together',async()=>{
 const f=fixture();
 try{
  await assert.rejects(createOrReuseTursoPricedOrder(f.conn,{
   ...priced(),items:[{productId:'absent-sku',name:'Ghost',quantity:1,unitPriceCents:1199,lineTotalCents:1199}]
  }),/FOREIGN KEY/);
  assert.equal(f.count('orders'),0);assert.equal(f.count('idempotency_keys'),0);
 }finally{f.raw.close()}
});
test('invalid prices, quantities and request fingerprints are rejected before writes',async()=>{
 const f=fixture();
 try{
  await assert.rejects(createOrReuseTursoPricedOrder(f.conn,{...priced(),items:[{productId:'sku1',name:'Fixture',quantity:2,unitPriceCents:1199,lineTotalCents:1199}]}),/INVALID_SERVER_PRICED_LINE/);
  await assert.rejects(createOrReuseTursoPricedOrder(f.conn,{...priced(),totalCents:1.5}),/INVALID_SERVER_PRICED_ORDER/);
  await assert.rejects(createOrReuseTursoPricedOrder(f.conn,{...priced(),fingerprint:'not-a-hash'}),/INVALID_SERVER_PRICED_ORDER/);
  assert.equal(f.count('orders'),0);
 }finally{f.raw.close()}
});
test('existing order with orphaned idempotency ledger must block retry',async()=>{
 const f=fixture();
 try{
  await createOrReuseTursoPricedOrder(f.conn,priced());
  f.raw.prepare("DELETE FROM idempotency_keys WHERE namespace='checkout_attempt'").run();
  await assert.rejects(createOrReuseTursoPricedOrder(f.conn,priced()),{name:'TursoCheckoutConflict',code:'CHECKOUT_LEDGER_MISSING'});
 }finally{f.raw.close()}
});
test('persisted paid-order lines retain the verified variation identity',async()=>{
 const f=fixture();
 try{
  f.raw.prepare('INSERT INTO product_variations(id,product_id,name,price_cents,currency) VALUES (?,?,?,?,?)').run('variation1','sku1','Regular',1199,'USD');
  const input=priced();input.items[0].variationId='variation1';input.items[0].catalogObjectId='variation1';
  const result=await createOrReuseTursoPricedOrder(f.conn,input);
  const row=f.raw.prepare('SELECT variation_id,external_catalog_id FROM order_items WHERE order_id=?').get(result.orderId);
  assert.equal(row.variation_id,'variation1');assert.equal(row.external_catalog_id,'variation1');
 }finally{f.raw.close()}
});
test('a variation owned by another product cannot create any order or attempt ledger',async()=>{
 const f=fixture();
 try{
  f.raw.exec("INSERT INTO products(id,name) VALUES ('other','Other'); INSERT INTO product_variations(id,product_id) VALUES ('foreign','other')");
  const input=priced();input.items[0].variationId='foreign';
  await assert.rejects(createOrReuseTursoPricedOrder(f.conn,input),/VARIATION_IDENTITY_MISMATCH/);
  assert.equal(f.count('orders'),0);assert.equal(f.count('idempotency_keys'),0);
 }finally{f.raw.close()}
});
