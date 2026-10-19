import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {listTursoAdminOrders} from '../../lib/checkout/turso-admin-order-list.mjs';
function fixture(){
 const raw=new DatabaseSync(':memory:');raw.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync('db/migrations').filter(n=>n.endsWith('.sql')).sort())raw.exec(readFileSync('db/migrations/'+file,'utf8'));
 const add=({id,source='orders',created='2026-10-19T14:00:00Z',name='Mango Buyer',cents=1199,status='pending',orderNumber='TOG-101'})=>{
  raw.prepare('INSERT INTO orders(id,source_collection,order_number,customer_snapshot_json,fulfillment_json,legacy_snapshot_json,status,payment_status,total_cents,currency,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,source,orderNumber,JSON.stringify({name,email:'buyer@example.invalid',phone:'4045550199'}),JSON.stringify({type:'pickup'}),JSON.stringify({pickupDate:'2026-10-24',emailSentAt:null}),status,status==='pending'?'pending':'paid',cents,'USD',created,created);
  raw.prepare('INSERT INTO order_items(id,order_id,name_snapshot,quantity,position) VALUES(?,?,?,?,?)').run(id+':item',id,'Pineapple Mango',1,0);
 };
 add({id:'o1'});add({id:'o2',created:'2026-10-18T14:00:00Z',status:'paid',cents:2000,orderNumber:'TOG-102'});
 add({id:'marketOnly',source:'marketorders',orderNumber:'TOG-103'});
 raw.prepare("INSERT INTO payments(id,order_id,square_payment_id,status,amount_cents,currency,created_at) VALUES('p2','o2','sp2','COMPLETED',2000,'USD','2026-10-19')").run();
 raw.prepare("INSERT INTO square_refund_entries(refund_id,order_id,payment_id,amount_cents,currency,confirmed_at) VALUES('r2','o2','sp2',500,'USD','2026-10-19')").run();
 const db={get:async(sql,...args)=>raw.prepare(sql).get(...args),all:async(sql,...args)=>raw.prepare(sql).all(...args)};
 return{raw,db};
}
test('native list preserves canonical orders, pagination and captured-minus-refunded ledger totals',async()=>{
 const f=fixture();try{
  const page1=await listTursoAdminOrders(f.db,{page:1,limit:1});
  assert.equal(page1.orders.length,1);assert.equal(page1.orders[0].id,'o1');
  assert.equal(page1.orders[0].total,11.99);assert.equal(page1.orders[0].customerName,'Mango Buyer');
  assert.equal(page1.pagination.total,2);assert.equal(page1.pagination.pages,2);
  assert.equal(page1.stats.totalRevenue,15);
  assert.equal(page1.stats.totalOrders,2);assert.equal(page1.stats.pendingOrders,1);
  assert.equal(page1.stats.providerReconciliationCertified,false);
  const page2=await listTursoAdminOrders(f.db,{page:2,limit:1});
  assert.equal(page2.orders[0].id,'o2');assert.equal(page2.orders[0].total,20);
  assert.equal(page2.orders[0].items[0].name,'Pineapple Mango');
 }finally{f.raw.close()}
});
test('query filters are parameterized; market-only records do not leak into admin orders',async()=>{
 const f=fixture();try{
  const query=params=>listTursoAdminOrders(f.db,params).then(x=>x.orders.map(o=>o.id));
  assert.deepEqual(await query({search:'BUYER@example.invalid'}),['o1','o2']);
  assert.deepEqual(await query({status:'paid'}),['o2']);
  assert.deepEqual(await query({fulfillmentType:'pickup'}),['o1','o2']);
  assert.deepEqual(await query({search:'% OR 1=1 --'}),[]);
  assert.deepEqual(await query({startDate:'2026-10-19T00:00:00Z'}),['o1']);
  assert.deepEqual(await query({endDate:'2026-10-18T23:00:00Z'}),['o2']);
 }finally{f.raw.close()}
});
test('corrupted canonical totals and missing order items block response',async()=>{
 for(const mutate of [
  raw=>raw.prepare("UPDATE orders SET total_cents=-1 WHERE id='o1'").run(),
  raw=>raw.prepare("UPDATE orders SET currency='EUR' WHERE id='o1'").run(),
  raw=>raw.prepare("DELETE FROM order_items WHERE order_id='o1'").run(),
  raw=>raw.prepare("UPDATE square_refund_entries SET amount_cents=2500 WHERE refund_id='r2'").run(),
 ]){
  const f=fixture();try{mutate(f.raw);await assert.rejects(listTursoAdminOrders(f.db),/RECONCILIATION_REQUIRED/)}
  finally{f.raw.close()}
 }
});
test('invalid page and outages fail closed',async()=>{
 const f=fixture();try{
  for(const params of [{page:0},{page:100001},{limit:101},{search:'a'.repeat(81)}])
   await assert.rejects(listTursoAdminOrders(f.db,params),/INVALID_FILTER/);
 }finally{f.raw.close()}
 await assert.rejects(listTursoAdminOrders({get:async()=>{throw Error('unavailable')}},{page:1}),/unavailable/);
});
test('admin route audits through existing middleware and blocks cross-provider bulk writes',()=>{
 const source=readFileSync('app/api/admin/orders/route.ts','utf8');
 assert.ok(source.includes('listTursoAdminOrders(await openTursoPreview()'));
 assert.ok(source.includes("if(tursoPreviewSelected())return NextResponse.json({success:false,code:'TURSO_BULK_ORDER_MUTATION_UNCERTIFIED'}"));
 assert.ok(source.includes('permission: PERMISSIONS.ORDERS_VIEW'));
 assert.ok(source.includes('permission: PERMISSIONS.ORDERS_UPDATE_STATUS'));
 const middleware=readFileSync('lib/middleware/admin.ts','utf8');
 assert.ok(middleware.includes('success: response.ok')); // refused mutation must not be audited as successful
});
