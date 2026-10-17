/**
 * Staging-only Turso counterpart of Mongo checkout single-order admission.
 * Caller MUST price and validate cart on the server before constructing input.
 * No Square payment side effect occurs in this module.
 */
import {randomUUID} from 'node:crypto';

export class TursoCheckoutConflict extends Error {
  constructor(code='CHECKOUT_ATTEMPT_CONFLICT') {
    super('Checkout request identity was reused with different order details.');
    this.name='TursoCheckoutConflict'; this.code=code;
  }
}
function assertNewOrderInput(input) {
  if(!input || typeof input.attemptKey!=='string' || input.attemptKey.length<8 ||
      input.attemptKey.length>200 || !/^[a-f0-9]{64}$/i.test(input.fingerprint||'') ||
      !Array.isArray(input.items)||input.items.length===0||input.items.length>100 ||
      !Number.isSafeInteger(input.totalCents)||input.totalCents<=0||
      !Number.isSafeInteger(input.subtotalCents)||input.subtotalCents<0||
      !Number.isSafeInteger(input.taxCents)||input.taxCents<0||
      (input.currency||'USD')!=='USD')
    throw new Error('INVALID_SERVER_PRICED_ORDER');
  for(const item of input.items){
    if(typeof item?.productId!=='string'||!item.productId||
      !Number.isSafeInteger(item.quantity)||item.quantity<1||
      !Number.isSafeInteger(item.unitPriceCents)||item.unitPriceCents<0||
      !Number.isSafeInteger(item.lineTotalCents)||
      item.lineTotalCents!==item.unitPriceCents*item.quantity||
      typeof item.name!=='string'||!item.name)
      throw new Error('INVALID_SERVER_PRICED_LINE');
  }
}
export async function createOrReuseTursoPricedOrder(db,input){
  assertNewOrderInput(input);
  if(typeof db?.transactionAsync!=='function')throw new Error('TURSO_TRANSACTION_CONNECTION_REQUIRED');
  const operation=db.transactionAsync(async tx=>{
    const prior=await tx.get('SELECT id,source_collection,total_cents FROM orders WHERE checkout_attempt_key=?',input.attemptKey);
    if(prior){
      const ledger=await tx.get("SELECT metadata_json FROM idempotency_keys WHERE namespace='checkout_attempt' AND key=?",input.attemptKey);
      if(!ledger)throw new TursoCheckoutConflict('CHECKOUT_LEDGER_MISSING');
      let metadata;
      try{metadata=JSON.parse(ledger.metadata_json)}catch{throw new TursoCheckoutConflict('CHECKOUT_LEDGER_CORRUPT')}
      if(metadata.fingerprint!==input.fingerprint||metadata.orderId!==prior.id||
        prior.source_collection!=='orders'||Number(prior.total_cents)!==input.totalCents)
        throw new TursoCheckoutConflict();
      return {orderId:prior.id,reused:true,totalCents:Number(prior.total_cents)};
    }
    const time=new Date().toISOString();
    const orderId=randomUUID();
    await tx.run(
      'INSERT INTO orders(id,source_collection,order_number,customer_snapshot_json,fulfillment_json,status,payment_status,subtotal_cents,tax_cents,total_cents,currency,created_at,updated_at,checkout_attempt_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      orderId,'orders',null,JSON.stringify(input.customer||{}),JSON.stringify(input.fulfillment||{}),
      'pending','pending',input.subtotalCents,input.taxCents,input.totalCents,'USD',time,time,input.attemptKey
    );
    for(const [i,line] of input.items.entries()){
      await tx.run(
        'INSERT INTO order_items(id,order_id,product_id,external_catalog_id,name_snapshot,quantity,unit_price_cents,total_cents,position,metadata_json) VALUES (?,?,?,?,?,?,?,?,?,?)',
        randomUUID(),orderId,line.productId,line.catalogObjectId||null,line.name,line.quantity,line.unitPriceCents,line.lineTotalCents,i,JSON.stringify(line.metadata||{})
      );
    }
    await tx.run(
      'INSERT INTO idempotency_keys(namespace,key,status,metadata_json) VALUES (?,?,?,?)',
      'checkout_attempt',input.attemptKey,'created',JSON.stringify({fingerprint:input.fingerprint,orderId})
    );
    return {orderId,reused:false,totalCents:input.totalCents};
  });
  if(typeof operation?.immediate!=='function')throw new Error('TURSO_IMMEDIATE_TRANSACTION_REQUIRED');
  // Lost commit acknowledgement must propagate, not trigger creation of a new attempt.
  return operation.immediate();
}
