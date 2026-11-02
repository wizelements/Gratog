import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {transformDocument} from '../../scripts/migrate/transformers.mjs';
import {insertStatement} from '../../scripts/migrate/upsert-policy.mjs';
import {bindOrderReferences,bindCustomerReferences} from '../../scripts/migrate/reference-context.mjs';
const order={_id:'mongo-order-1',id:'buyer-visible-1',orderNumber:'TOG-1',total:11.99,subtotal:11.99,tax:0,status:'pending',paymentStatus:'pending',customer:{name:'Legacy test',email:'legacy@example.invalid'},fulfillment:{type:'pickup_market',pickup:{locationId:'serenbe'}},items:[{name:'Strawberry Bliss',quantity:1,price:11.99}],createdAt:'2026-10-18T04:00:00Z'};
test('business order and customer IDs remain exact aliases to their canonical source IDs',()=>{
 const context={orderByReference:new Map(),customerById:new Map()};
 bindOrderReferences(context.orderByReference,order);
 bindCustomerReferences(context.customerById,{_id:'mongo-customer',id:'customer-business'});
 assert.equal(context.orderByReference.get('buyer-visible-1'),'mongo-order-1');
 assert.equal(context.customerById.get('customer-business'),'mongo-customer');
 assert.throws(()=>bindOrderReferences(context.orderByReference,{_id:'another-order',id:'buyer-visible-1'}),/AMBIGUOUS/);
});
test('normalization preserves nested buyer fulfillment and the entire legacy source snapshot',()=>{
 const statements=transformDocument('orders',order).statements;
 const row=statements.find(x=>x.table==='orders').row;
 assert.equal(JSON.parse(row.customer_snapshot_json).email,'legacy@example.invalid');
 assert.deepEqual(JSON.parse(row.fulfillment_json),order.fulfillment);
 assert.deepEqual(JSON.parse(row.legacy_snapshot_json),order);
 assert.ok(statements.some(x=>x.table==='order_references'&&x.row.reference==='buyer-visible-1'&&x.row.order_id==='mongo-order-1'));
});
test('historical payments bind via business ID and unresolved references cannot be silently dropped',()=>{
 const context={orderByReference:new Map()};bindOrderReferences(context.orderByReference,order);
 const payment={_id:'mongo-payment',squarePaymentId:'provider-1',amountCents:1199,status:'COMPLETED',metadata:{orderId:'buyer-visible-1'}};
 const transformed=transformDocument('payment_records',payment,context);
 assert.equal(transformed.statements[0].row.order_id,'mongo-order-1');
 assert.throws(()=>transformDocument('payment_records',payment),/RELATIONSHIP_UNRESOLVED/);
});
test('SQL references cannot rebind a customer-facing order link to another order',()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 try{
  for(const file of readdirSync('db/migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('db/migrations/'+file,'utf8'));
  for(const source of [order,{...order,_id:'mongo-order-2',id:'buyer-visible-2'}])for(const statement of transformDocument('orders',source).statements){const q=insertStatement(statement.table,statement.row);db.prepare(q.sql).run(...q.args)}
  const q=insertStatement('order_references',{reference:'buyer-visible-1',order_id:'mongo-order-2',reference_kind:'business_id',source_collection:'orders'});
  assert.throws(()=>db.prepare(q.sql).run(...q.args),/ORDER_REFERENCE_COLLISION/);
  assert.equal(db.prepare('SELECT order_id FROM order_references WHERE reference=?').get('buyer-visible-1').order_id,'mongo-order-1');
 }finally{db.close()}
});
