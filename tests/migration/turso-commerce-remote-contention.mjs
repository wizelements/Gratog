import assert from 'node:assert/strict';
import {connect} from '@tursodatabase/serverless';
import {randomUUID} from 'node:crypto';
import {reserveTursoCheckoutInventory} from '../../lib/checkout/turso-commerce.mjs';
const url=process.env.TURSO_DATABASE_URL||'';
const token=process.env.TURSO_AUTH_TOKEN||'';
const name=process.env.TURSO_APPROVED_STAGING_NAME||'';
let host='';try{host=new URL(url.replace(/^libsql:/,'https:')).hostname}catch{}
if(!/^gratog-migration-cert-[a-z0-9-]+$/.test(name)||!host.startsWith(name+'-')||!token)
  throw new Error('REFUSE_UNVERIFIED_TURSO_STAGING');
const connectDb=()=>connect({url,authToken:token,defaultQueryTimeout:30000});
const db=connectDb();
const prefix='race_adapter_'+randomUUID().replaceAll('-','').slice(0,12);
const sku=prefix+'_sku',orders=Array.from({length:24},(_,i)=>prefix+'_order_'+i);
const now=new Date().toISOString();
const stmt=(sql,args=[])=>({sql,args});
async function run(){
 await db.batch([
  stmt('INSERT INTO products(id,name) VALUES (?,?)',[sku,'Staging last unit']),
  stmt('INSERT INTO inventory(product_id,current_stock,source,updated_at) VALUES (?,?,?,?)',[sku,1,'staging_cert',now]),
  ...orders.map(order=>stmt('INSERT INTO orders(id,source_collection,status,total_cents,created_at,updated_at) VALUES (?,?,?,?,?,?)',
    [order,'orders','pending',1199,now,now]))
 ],'immediate');
 const results=await Promise.allSettled(orders.map(async order=>{
  const c=connectDb();
  try{return await reserveTursoCheckoutInventory(c,{orderId:order,items:[{productId:sku,quantity:1}]})}
  finally{await c.close()}
 }));
 const winners=results.filter(r=>r.status==='fulfilled'&&r.value.valid);
 const noStock=results.filter(r=>r.status==='fulfilled'&&!r.value.valid&&r.value.code==='INVENTORY_UNAVAILABLE');
 const errors=results.filter(r=>r.status==='rejected');
 const current=Number((await db.get('SELECT current_stock FROM inventory WHERE product_id=?',sku)).current_stock);
 const claims=Number((await db.get('SELECT count(*) n FROM checkout_stock_claims WHERE order_id LIKE ?',prefix+'%')).n);
 console.log(JSON.stringify({test:'REAL_REMOTE_24_CLIENT_ADAPTER_RACE',winners:winners.length,noStock:noStock.length,
   errors:errors.length,errorClasses:errors.map(e=>e.reason?.code||e.reason?.name||'UNKNOWN').slice(0,5),stock:current,claims}));
 assert.equal(winners.length,1);
 assert.equal(noStock.length,23);
 assert.equal(errors.length,0);
 assert.equal(current,0);assert.equal(claims,1);
}
try{await run()}catch(e){console.error(JSON.stringify({test:'REMOTE_RACE_FAILED',error:String(e.message||e).slice(0,270)}));process.exitCode=1}
finally{
 try{
  await db.batch([
   stmt('DELETE FROM checkout_stock_claim_items WHERE order_id LIKE ?',[prefix+'%']),
   stmt('DELETE FROM checkout_stock_claims WHERE order_id LIKE ?',[prefix+'%']),
   stmt('DELETE FROM orders WHERE id LIKE ?',[prefix+'%']),
   stmt('DELETE FROM inventory WHERE product_id=?',[sku]),
   stmt('DELETE FROM products WHERE id=?',[sku])
  ],'immediate');
  console.log(JSON.stringify({stagingFixtureCleanup:'PASS'}));
 }catch(e){console.error(JSON.stringify({stagingFixtureCleanup:'FAIL',error:String(e.message||e).slice(0,200)}));process.exitCode=1}
 await db.close();
}
