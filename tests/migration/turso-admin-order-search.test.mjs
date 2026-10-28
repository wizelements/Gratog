import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {searchTursoMarketOrders} from '../../lib/checkout/turso-admin-order-search.mjs';
function fixture(){
 const raw=new DatabaseSync(':memory:');raw.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync('db/migrations').filter(n=>n.endsWith('.sql')).sort())raw.exec(readFileSync('db/migrations/'+file,'utf8'));
 for(const id of ['market1','market2'])raw.prepare('INSERT INTO markets(id,name) VALUES(?,?)').run(id,id);
 const add=({id,market='market1',source='marketorders',name='Jasmine Flower',phone='(404) 555-0102',number='MKT-101',cents=1199,date='2026-10-19T10:00:00Z'})=>{
  raw.prepare('INSERT INTO orders(id,source_collection,order_number,market_id,customer_snapshot_json,status,total_cents,currency,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,source,number,market,JSON.stringify({name,email:'buyer@example.invalid',phone}),'pending',cents,'USD',date,date);
  raw.prepare('INSERT INTO order_items(id,order_id,name_snapshot,quantity,position) VALUES(?,?,?,?,?)').run('item-'+id,id,'Strawberry Bliss',1,0);
 };
 add({id:'m1'});add({id:'m2',market:'market2',name:'Jasmine Flower',number:'MKT-102'});
 add({id:'o1',source:'orders',name:'Jasmine Flower',number:'MKT-103'});
 const db={all:async(sql,...values)=>raw.prepare(sql).all(...values)};
 return{raw,db,add};
}
test('authenticated caller can query exact market, name, number and formatted phone without Mongo',async()=>{
 const f=fixture();try{
  const find=q=>searchTursoMarketOrders(f.db,{query:q,marketId:'market1'});
  assert.deepEqual((await find('jAsMiNe')).map(o=>o.id),['m1']);
  assert.deepEqual((await find('mKt-101')).map(o=>o.id),['m1']);
  assert.deepEqual((await find('5550102')).map(o=>o.id),['m1']);
  assert.deepEqual(await find('not found'),[]);
  const [order]=await find('Jasmine');
  assert.equal(order.total,11.99);assert.equal(order.customerName,'Jasmine Flower');
  assert.deepEqual(order.items,[{name:'Strawberry Bliss',quantity:1}]);
 }finally{f.raw.close()}
});
test('wildcards are literal and every query remains market-scoped',async()=>{
 const f=fixture();try{
  for(const q of ['%','_','% OR 1=1--','4045550102']) {
   if(q.length<3)continue;
   const rows=await searchTursoMarketOrders(f.db,{query:q,marketId:'market2'});
   assert.ok(rows.every(r=>r.id==='m2'));
  }
  assert.deepEqual(await searchTursoMarketOrders(f.db,{query:'% OR 1=1--',marketId:'market1'}),[]);
  assert.deepEqual(await searchTursoMarketOrders(f.db,{query:'mKt-102',marketId:'market1'}),[]);
 }finally{f.raw.close()}
});
test('missing market, malformed query and database outage fail closed',async()=>{
 const f=fixture();try{
  for(const args of [{query:'Jasmine',marketId:''},{query:'ab',marketId:'market1'},{query:'Jasmine',marketId:'market1 OR 1=1'}])
   await assert.rejects(searchTursoMarketOrders(f.db,args),/TURSO_ORDER_SEARCH_INVALID/);
 }finally{f.raw.close()}
 await assert.rejects(searchTursoMarketOrders({all:async()=>{throw Error('db-down')}},{query:'Jasmine',marketId:'market1'}),/db-down/);
});
test('broken money or missing order items block read rather than fabricate totals',async()=>{
 for(const mutate of [
  raw=>raw.prepare("UPDATE orders SET total_cents=-1 WHERE id='m1'").run(),
  raw=>raw.prepare("UPDATE orders SET currency='EUR' WHERE id='m1'").run(),
  raw=>raw.prepare("DELETE FROM order_items WHERE order_id='m1'").run(),
 ]){
  const f=fixture();try{
   mutate(f.raw);await assert.rejects(searchTursoMarketOrders(f.db,{query:'Jasmine',marketId:'market1'}),/RECONCILIATION_REQUIRED/);
  }finally{f.raw.close()}
 }
});
test('Turso route requires admin verification before opening staging DB or search',()=>{
 const route=readFileSync('app/api/orders/search/route.ts','utf8');
 assert.ok(route.indexOf('await requireAdminSession(request)')<route.indexOf('if (tursoPreviewSelected())'));
 assert.ok(route.includes('searchTursoMarketOrders(await openTursoPreview()'));
 assert.ok(route.includes('await connectToDatabase()'));
});
