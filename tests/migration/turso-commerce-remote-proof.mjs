/**
 * Explicit opt-in, staging-only actual Turso transactional proof.
 * Requires TURSO_DATABASE_URL, TURSO_AUTH_TOKEN and TURSO_APPROVED_STAGING_NAME.
 * NEVER run on the existing tasteofgratitude database.
 */
import {connect} from '@tursodatabase/serverless';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {reserveTursoCheckoutInventory,releaseTursoCheckoutInventory,
  commitTursoCheckoutInventory,reconcileTursoVerifiedRefund} from '../../lib/checkout/turso-commerce.mjs';

const approved=process.env.TURSO_APPROVED_STAGING_NAME || '';
const url=process.env.TURSO_DATABASE_URL || '';
const token=process.env.TURSO_AUTH_TOKEN || '';
let hostname='';
try{hostname=new URL(url.replace(/^libsql:/,'https:')).hostname}catch{}
if(!/^gratog-migration-cert-[a-z0-9-]+$/.test(approved) || !hostname.startsWith(approved+'-') || !token)
  throw new Error('REFUSE_UNVERIFIED_TURSO_STAGING');
const root=connect({url,authToken:token,defaultQueryTimeout:30000});
const prefix='adapter_cert_'+randomUUID().replaceAll('-','').slice(0,12);
const skus=['a','b','c'].map(x=>prefix+'_'+x);
const ids=['o1','o2','o3'].map(x=>prefix+'_'+x);
const now=new Date().toISOString();
const stmt=(sql,args=[])=>({sql,args});
async function run(){
 await root.batch([
  ...skus.map(sku=>stmt('INSERT INTO products(id,name) VALUES (?,?)',[sku,'Staging test product'])),
  ...skus.map((sku,i)=>stmt('INSERT INTO inventory(product_id,current_stock,source,updated_at) VALUES (?,?,?,?)',[sku,i===2?0:2,'staging_cert',now])),
  ...ids.map(id=>stmt('INSERT INTO orders(id,source_collection,status,total_cents,created_at,updated_at) VALUES (?,?,?,?,?,?)',[id,'orders','pending',1199,now,now])),
 ],'immediate');
 const stock=async(sku)=>Number((await root.get('SELECT current_stock FROM inventory WHERE product_id=?',sku)).current_stock);
 // A multi-product basket must roll all changes back when one product is sold out.
 assert.deepEqual(await reserveTursoCheckoutInventory(root,{orderId:ids[1],items:[
  {productId:skus[0],quantity:1},{productId:skus[2],quantity:1}]}),{valid:false,code:'INVENTORY_UNAVAILABLE'});
 assert.equal(await stock(skus[0]),2);
 assert.equal(Number((await root.get('SELECT COUNT(*) n FROM checkout_stock_claims WHERE order_id=?',ids[1])).n),0);
 // Durable claim and browser retry replay cannot charge twice or debit twice.
 const items=[{productId:skus[0],quantity:1},{productId:skus[1],quantity:1}];
 assert.deepEqual(await reserveTursoCheckoutInventory(root,{orderId:ids[0],items}),{valid:true,alreadyReserved:false});
 assert.deepEqual(await reserveTursoCheckoutInventory(root,{orderId:ids[0],items:items.slice().reverse()}),{valid:true,alreadyReserved:true});
 assert.deepEqual(await reserveTursoCheckoutInventory(root,{orderId:ids[0],items:[{productId:skus[0],quantity:2}]}),
    {valid:false,code:'CHECKOUT_STOCK_CLAIM_CONFLICT'});
 assert.equal(await stock(skus[0]),1);assert.equal(await stock(skus[1]),1);
 assert.equal(await releaseTursoCheckoutInventory(root,ids[0]),true);
 assert.equal(await releaseTursoCheckoutInventory(root,ids[0]),false);
 assert.equal(await stock(skus[0]),2);
 assert.deepEqual(await reserveTursoCheckoutInventory(root,{orderId:ids[0],items}),{valid:true,alreadyReserved:false});
 assert.deepEqual(await commitTursoCheckoutInventory(root,ids[0]),{managed:true,skipped:false,debited:2});
 assert.deepEqual(await commitTursoCheckoutInventory(root,ids[0]),{managed:true,skipped:true,debited:0});
 assert.equal(await releaseTursoCheckoutInventory(root,ids[0]),false);
 assert.equal(await stock(skus[0]),1);assert.equal(await stock(skus[1]),1);
 assert.equal(Number((await root.get("SELECT count(*) n FROM inventory_events WHERE order_id=? AND event_type='order_debit'",ids[0])).n),1);
 const refund={orderId:ids[0],paymentId:prefix+'_payment',paidCents:1199,currency:'USD'};
 const first=await reconcileTursoVerifiedRefund(root,{...refund,refundId:prefix+'_refund1',amountCents:500});
 assert.equal(first.paymentStatus,'partially_refunded');
 const replay=await reconcileTursoVerifiedRefund(root,{...refund,refundId:prefix+'_refund1',amountCents:500});
 assert.equal(replay.alreadyRecorded,true);
 await assert.rejects(reconcileTursoVerifiedRefund(root,{...refund,refundId:prefix+'_refund1',amountCents:499}),/CHANGED_DETAILS/);
 await assert.rejects(reconcileTursoVerifiedRefund(root,{...refund,refundId:prefix+'_refund2',amountCents:700}),/EXCEEDS_CAPTURED/);
 const final=await reconcileTursoVerifiedRefund(root,{...refund,refundId:prefix+'_refund2',amountCents:699});
 assert.equal(final.paymentStatus,'refunded');assert.equal(final.refundedCents,1199);
 console.log(JSON.stringify({result:'PASS',environment:'isolated_Turso_staging',stockRollback:true,
  idempotentReservation:true,releasedOnce:true,committedOnce:true,refundReplay:true,partialAndFullRefund:true,actualProviderPayment:false}));
}
try{await run()}catch(e){console.error(JSON.stringify({result:'FAIL',error:String(e.message||e).slice(0,370)}));process.exitCode=1}
finally{
 try{
  await root.batch([
   stmt('DELETE FROM square_refund_entries WHERE order_id LIKE ?',[prefix+'%']),
   stmt('DELETE FROM inventory_events WHERE order_id LIKE ?',[prefix+'%']),
   stmt('DELETE FROM checkout_stock_claim_items WHERE order_id LIKE ?',[prefix+'%']),
   stmt('DELETE FROM checkout_stock_claims WHERE order_id LIKE ?',[prefix+'%']),
   stmt('DELETE FROM orders WHERE id LIKE ?',[prefix+'%']),
   stmt('DELETE FROM inventory WHERE product_id LIKE ?',[prefix+'%']),
   stmt('DELETE FROM products WHERE id LIKE ?',[prefix+'%']),
  ],'immediate');
  console.log(JSON.stringify({cleanup:'PASS',testOnly:true}));
 }catch(e){console.error(JSON.stringify({cleanup:'FAIL',error:String(e.message||e).slice(0,210)}));process.exitCode=1}
 await root.close();
}
