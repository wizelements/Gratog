import assert from 'node:assert/strict';
import {connect} from '@tursodatabase/serverless';
import {randomUUID} from 'node:crypto';
import {createOrReuseTursoPricedOrder} from '../../lib/checkout/turso-order-admission.mjs';

const url=process.env.TURSO_DATABASE_URL||'';
const authToken=process.env.TURSO_AUTH_TOKEN||'';
const approved=process.env.TURSO_APPROVED_STAGING_NAME||'';
let hostname=''; try{hostname=new URL(url.replace(/^libsql:/,'https:')).hostname}catch{}
if(!/^gratog-migration-cert-[a-z0-9-]+$/.test(approved)||!hostname.startsWith(approved+'-')||!authToken)
 throw Error('REFUSE_UNVERIFIED_TURSO_STAGING');
const connectDb=()=>connect({url,authToken,defaultQueryTimeout:30000});
const root=connectDb(), prefix='order_adapter_'+randomUUID().replaceAll('-','').slice(0,12);
const sku=prefix+'_sku',attemptKey=prefix+'_attempt',stmt=(sql,args=[])=>({sql,args});
const input={attemptKey,fingerprint:'b'.repeat(64),totalCents:1199,subtotalCents:1199,taxCents:0,
 currency:'USD',customer:{email:'fixture@example.invalid'},fulfillment:{type:'pickup'},
 items:[{productId:sku,name:'Test drink',quantity:1,unitPriceCents:1199,lineTotalCents:1199}]};
let orderId=null;
try{
 await root.run('INSERT INTO products(id,name) VALUES (?,?)',sku,'Test item');
 const results=await Promise.allSettled(Array.from({length:24},async()=>{
   const db=connectDb();
   try{return await createOrReuseTursoPricedOrder(db,input)}
   finally{await db.close()}
 }));
 const accepted=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
 const rejected=results.filter(r=>r.status==='rejected');
 orderId=accepted[0]?.orderId||null;
 const row=await root.get('SELECT count(*) n FROM orders WHERE checkout_attempt_key=?',attemptKey);
 const itemCount=orderId?Number((await root.get('SELECT count(*) n FROM order_items WHERE order_id=?',orderId)).n):0;
 console.log(JSON.stringify({test:'TURSO_REAL_24_CLIENT_ORDER_ADMISSION',accepted:accepted.length,
   uniqueIds:new Set(accepted.map(x=>x.orderId)).size,
   created:accepted.filter(x=>!x.reused).length,replayed:accepted.filter(x=>x.reused).length,
   transactionErrors:rejected.length,errorNames:rejected.map(x=>x.reason?.name||'UNKNOWN').slice(0,4),
   storedOrders:Number(row.n),storedItems:itemCount}));
 assert.equal(accepted.length,24);assert.equal(rejected.length,0);
 assert.equal(accepted.filter(x=>!x.reused).length,1);
 assert.equal(new Set(accepted.map(x=>x.orderId)).size,1);
 assert.equal(Number(row.n),1);assert.equal(itemCount,1);
 await assert.rejects(createOrReuseTursoPricedOrder(root,{...input,fingerprint:'c'.repeat(64)}),/different order details/);
} catch(e) {
 console.error(JSON.stringify({status:'FAILED',reason:String(e.message||e).slice(0,230)}));process.exitCode=1;
} finally {
 try{
  await root.batch([
   stmt('DELETE FROM order_items WHERE order_id=?',[orderId||'']),
   stmt('DELETE FROM orders WHERE checkout_attempt_key=?',[attemptKey]),
   stmt("DELETE FROM idempotency_keys WHERE namespace='checkout_attempt' AND key=?",[attemptKey]),
   stmt('DELETE FROM products WHERE id=?',[sku])
  ],'immediate');
  console.log(JSON.stringify({fixtureCleanup:'PASS'}));
 }catch(e){console.error(JSON.stringify({fixtureCleanup:'FAIL',reason:String(e.message||e).slice(0,200)}));process.exitCode=1}
 await root.close();
}
