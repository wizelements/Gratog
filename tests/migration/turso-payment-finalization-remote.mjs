import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connect} from '@tursodatabase/serverless';
import {reserveTursoCheckoutInventory} from '../../lib/checkout/turso-commerce.mjs';
import {finalizeVerifiedTursoSquarePayment} from '../../lib/checkout/turso-payment-finalization.mjs';

const url=process.env.TURSO_DATABASE_URL||'';
const token=process.env.TURSO_AUTH_TOKEN||'';
const name=process.env.TURSO_APPROVED_STAGING_NAME||'';
let host='';try{host=new URL(url.replace(/^libsql:/,'https:')).hostname}catch{}
if(!/^gratog-migration-cert-[a-z0-9-]+$/.test(name)||!host.startsWith(name+'-')||!token)
 throw Error('REFUSE_UNVERIFIED_TURSO_STAGING');
const open=()=>connect({url,authToken:token,defaultQueryTimeout:30000});
const root=open(),prefix='finalization_'+randomUUID().replaceAll('-','').slice(0,12);
const orderId=prefix+'_order',sku=prefix+'_sku',provider=prefix+'_sqpay',now=new Date().toISOString();
const statement=(sql,args=[])=>({sql,args});
async function execute(){
 await root.batch([
  statement('INSERT INTO products(id,name) VALUES (?,?)',[sku,'Staging verification only']),
  statement('INSERT INTO inventory(product_id,current_stock,source,updated_at) VALUES (?,?,?,?)',[sku,1,'staging',now]),
  statement("INSERT INTO orders(id,source_collection,status,payment_status,total_cents,currency,created_at,updated_at) VALUES (?,'orders','pending','pending',1199,'USD',?,?)",[orderId,now,now])
 ],'immediate');
 assert.equal((await reserveTursoCheckoutInventory(root,{orderId,items:[{productId:sku,quantity:1}]})).valid,true);
 const input={orderId,providerVerified:true,squarePayment:{id:provider,idempotencyKey:prefix+'_key',status:'COMPLETED',currency:'USD',amountCents:1199}};
 const results=await Promise.allSettled(Array.from({length:24},async()=>{
  const client=open();
  try{return await finalizeVerifiedTursoSquarePayment(client,input)}
  finally{await client.close()}
 }));
 const records=results.filter(x=>x.status==='fulfilled'&&x.value.recorded).length;
 const replays=results.filter(x=>x.status==='fulfilled'&&x.value.alreadyFinalized).length;
 const errors=results.filter(x=>x.status==='rejected').map(x=>x.reason?.name||'UNKNOWN');
 const get=sql=>root.get(sql,orderId);
 const order=await get('SELECT status,payment_status,amount_paid_cents FROM orders WHERE id=?');
 const stock=await root.get('SELECT current_stock FROM inventory WHERE product_id=?',sku);
 const claim=await get('SELECT status FROM checkout_stock_claims WHERE order_id=?');
 const payment=await get('SELECT COUNT(*) n FROM payments WHERE order_id=?');
 const notices=await get('SELECT COUNT(*) n FROM checkout_notification_outbox WHERE order_id=?');
 const event=await get("SELECT COUNT(*) n FROM inventory_events WHERE order_id=? AND event_type='order_debit'");
 const proof={test:'REAL_TURSO_24_CONCURRENT_CAPTURE_FINALIZATIONS',records,replays,errors:errors.length,
  dbPaymentRows:Number(payment.n),outboxRows:Number(notices.n),debitRows:Number(event.n),stock:stock.current_stock,
  status:order.status,paymentStatus:order.payment_status,amountPaidCents:order.amount_paid_cents,
  claimStatus:claim.status,actualSquareProviderReadback:false};
 console.log(JSON.stringify(proof));
 assert.equal(records,1);assert.equal(replays,23);assert.deepEqual(errors,[]);
 assert.equal(Number(payment.n),1);assert.equal(Number(notices.n),2);assert.equal(Number(event.n),1);
 assert.equal(Number(stock.current_stock),0);assert.equal(order.payment_status,'paid');
 assert.equal(order.amount_paid_cents,1199);assert.equal(claim.status,'committed');
 await assert.rejects(finalizeVerifiedTursoSquarePayment(root,{...input,squarePayment:{...input.squarePayment,id:provider+'changed'}}),
 /SECOND_CAPTURE_REQUIRES_RECONCILIATION/);
}
try{await execute()}
catch(e){console.error(JSON.stringify({test:'FINALIZATION_FAILED',error:String(e.message||e).slice(0,260)}));process.exitCode=1}
finally{
 try{
 await root.batch([
  statement('DELETE FROM checkout_notification_outbox WHERE order_id=?',[orderId]),
  statement('DELETE FROM payments WHERE order_id=?',[orderId]),
  statement('DELETE FROM inventory_events WHERE order_id=?',[orderId]),
  statement('DELETE FROM checkout_stock_claim_items WHERE order_id=?',[orderId]),
  statement('DELETE FROM checkout_stock_claims WHERE order_id=?',[orderId]),
  statement('DELETE FROM orders WHERE id=?',[orderId]),
  statement('DELETE FROM inventory WHERE product_id=?',[sku]),
  statement('DELETE FROM products WHERE id=?',[sku]),
 ],'immediate');console.log(JSON.stringify({fixtureCleanup:'PASS'}))
 }catch(e){console.error(JSON.stringify({fixtureCleanup:'FAIL',error:String(e.message||e).slice(0,200)}));process.exitCode=1}
 await root.close();
}
