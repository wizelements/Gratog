/**
 * Turso-native checkout financial boundaries.
 * These functions receive an authenticated connection, never create one.
 * The existing Mongo checkout remains authoritative until full app certification.
 * No Square charge may occur unless reserveTursoCheckoutInventory() succeeds.
 */
import {randomUUID} from 'node:crypto';

export class TursoInventoryUnavailable extends Error {
  constructor(code = 'INVENTORY_UNAVAILABLE') {
    super('This quantity is no longer available for checkout. Please update your cart.');
    this.name = 'TursoInventoryUnavailable';
    this.code = code;
  }
}

const now = () => new Date().toISOString();
const runChanges = (result) => {
  // @tursodatabase/serverless .run() returns { changes }, never rowsAffected.
  if (!Number.isSafeInteger(result?.changes)) throw new Error('TURSO_WRITE_CONFIRMATION_UNAVAILABLE');
  return result.changes;
};

function normalizeLines(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 100) {
    throw new TursoInventoryUnavailable('INVALID_ORDER_ITEMS');
  }
  const totals = new Map();
  for(const row of raw){
    const id=String(row?.productId || row?.id || row?.squareId || '').trim();
    const quantity=row?.quantity;
    if(!id || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000)
      throw new TursoInventoryUnavailable('INVALID_ORDER_ITEMS');
    const next=(totals.get(id)||0)+quantity;
    if(!Number.isSafeInteger(next) || next>10000) throw new TursoInventoryUnavailable('INVALID_ORDER_ITEMS');
    totals.set(id,next);
  }
  return [...totals].sort(([a],[b])=>a.localeCompare(b))
    .map(([productId,quantity])=>({productId,quantity}));
}
function claimFingerprint(items){ return JSON.stringify(items); }
function transaction(db, fn) {
  if(typeof db?.transactionAsync !== 'function') throw new Error('TURSO_TRANSACTION_CONNECTION_REQUIRED');
  const work=db.transactionAsync(fn);
  if(typeof work?.immediate !== 'function') throw new Error('TURSO_IMMEDIATE_TRANSACTION_REQUIRED');
  return work.immediate();
}

export async function reserveTursoCheckoutInventory(db,{orderId,items:raw}){
  if(typeof orderId!=='string' || !orderId.trim()) return {valid:false,code:'INVALID_ORDER_ID'};
  let items;
  try{items=normalizeLines(raw)} catch(error) {
    if(error instanceof TursoInventoryUnavailable) return {valid:false,code:error.code};
    throw error;
  }
  try {
    return await transaction(db,async tx=>{
      const identity=await tx.get('SELECT id FROM orders WHERE id=?',orderId);
      if(!identity) throw new Error('TURSO_ORDER_NOT_FOUND');
      const prior=await tx.get('SELECT status,items_fingerprint FROM checkout_stock_claims WHERE order_id=?',orderId);
      const fingerprint=claimFingerprint(items);
      if(prior && prior.items_fingerprint!==fingerprint)
        throw new TursoInventoryUnavailable('CHECKOUT_STOCK_CLAIM_CONFLICT');
      if(prior?.status==='reserved'||prior?.status==='committed')
        return {valid:true,alreadyReserved:true};
      const time=now();
      for(const item of items){
        const result=await tx.run(
          'UPDATE inventory SET current_stock=current_stock-?,updated_at=? WHERE product_id=? AND active=1 AND current_stock>=?',
          item.quantity,time,item.productId,item.quantity
        );
        if(runChanges(result)!==1) throw new TursoInventoryUnavailable();
      }
      if(prior?.status==='released'){
        const update=await tx.run(
          "UPDATE checkout_stock_claims SET status='reserved',reserved_at=?,released_at=NULL,release_reason=NULL,updated_at=? WHERE order_id=? AND status='released'",
          time,time,orderId
        );
        if(runChanges(update)!==1) throw new Error('TURSO_CLAIM_REOPEN_RACE');
      }else{
        await tx.run(
          'INSERT INTO checkout_stock_claims(order_id,status,items_fingerprint,reserved_at,updated_at) VALUES (?,?,?,?,?)',
          orderId,'reserved',fingerprint,time,time
        );
        for(const item of items){
          await tx.run(
            'INSERT INTO checkout_stock_claim_items(order_id,product_id,quantity) VALUES (?,?,?)',
            orderId,item.productId,item.quantity
          );
        }
      }
      return {valid:true,alreadyReserved:false};
    });
  } catch(error){
    if(error instanceof TursoInventoryUnavailable) return {valid:false,code:error.code};
    // Unknown commit/transport state MUST NOT be classified as a decline.
    throw error;
  }
}

export async function releaseTursoCheckoutInventory(db,orderId,reason='square_declined'){
  if(!orderId) throw new Error('INVALID_ORDER_ID');
  return transaction(db,async tx=>{
    const claim=await tx.get('SELECT status FROM checkout_stock_claims WHERE order_id=?',orderId);
    if(!claim || claim.status!=='reserved') return false;
    const lines=await tx.all('SELECT product_id,quantity FROM checkout_stock_claim_items WHERE order_id=?',orderId);
    if(!lines?.length) throw new Error('TURSO_CLAIM_ITEMS_MISSING');
    const time=now();
    for(const line of lines){
      const update=await tx.run('UPDATE inventory SET current_stock=current_stock+?,updated_at=? WHERE product_id=?',
        line.quantity,time,line.product_id);
      if(runChanges(update)!==1) throw new Error('TURSO_RELEASE_STOCK_MISSING');
    }
    const updated=await tx.run(
      "UPDATE checkout_stock_claims SET status='released',released_at=?,release_reason=?,updated_at=? WHERE order_id=? AND status='reserved'",
      time,reason,time,orderId);
    if(runChanges(updated)!==1) throw new Error('TURSO_RELEASE_CLAIM_RACE');
    return true;
  });
}
export async function commitTursoCheckoutInventory(db,orderId,actor='payment_capture'){
  if(!orderId) throw new Error('INVALID_ORDER_ID');
  return transaction(db,async tx=>{
    const claim=await tx.get('SELECT status FROM checkout_stock_claims WHERE order_id=?',orderId);
    if(!claim)return {managed:false,skipped:false,debited:0};
    if(claim.status==='committed')return {managed:true,skipped:true,debited:0};
    if(claim.status!=='reserved')throw new Error('CAPTURE_WITHOUT_ACTIVE_STOCK_CLAIM');
    const lines=await tx.all('SELECT product_id,quantity FROM checkout_stock_claim_items WHERE order_id=?',orderId);
    if(!lines?.length)throw new Error('TURSO_CLAIM_ITEMS_MISSING');
    const time=now();
    const updated=await tx.run(
      "UPDATE checkout_stock_claims SET status='committed',committed_at=?,updated_at=? WHERE order_id=? AND status='reserved'",
      time,time,orderId
    );
    if(runChanges(updated)!==1)throw new Error('TURSO_COMMIT_CLAIM_RACE');
    await tx.run('INSERT INTO inventory_events (id,order_id,event_type,created_at,metadata_json) VALUES (?,?,?,?,?)',
      randomUUID(),orderId,'order_debit',time,JSON.stringify({actor,origin:'checkout_prepayment_reservation',items:lines}));
    return {managed:true,skipped:false,debited:lines.length};
  });
}

/**
 * Caller must verify Square HMAC and provider-refund completion before use.
 * One immediate transaction owns replay, cumulative cents and new row insert.
 */
export async function reconcileTursoVerifiedRefund(db,refund){
  const {orderId,paymentId,refundId,amountCents,paidCents}=refund||{};
  const currency=String(refund?.currency||'').toUpperCase();
  if(!orderId||!paymentId||!refundId||currency!=='USD' ||
      !Number.isSafeInteger(amountCents)||amountCents<=0 ||
      !Number.isSafeInteger(paidCents)||paidCents<=0)
    throw new Error('TURSO_REFUND_NOT_VERIFIED');
  return transaction(db,async tx=>{
    const existing=await tx.get(
      'SELECT order_id,payment_id,amount_cents,currency FROM square_refund_entries WHERE refund_id=?',refundId);
    if(existing && (existing.order_id!==orderId || existing.payment_id!==paymentId ||
        Number(existing.amount_cents)!==amountCents || existing.currency!==currency))
      throw new Error('TURSO_REFUND_ID_REUSED_WITH_CHANGED_DETAILS');
    const order=await tx.get('SELECT id FROM orders WHERE id=?',orderId);
    if(!order)throw new Error('TURSO_REFUND_ORDER_NOT_FOUND');
    const totals=await tx.get('SELECT coalesce(sum(amount_cents),0) AS cents FROM square_refund_entries WHERE order_id=?',orderId);
    const already=Number(totals.cents||0);
    if(!Number.isSafeInteger(already) || already<0 || already>paidCents ||
        (!existing && already+amountCents>paidCents))
      throw new Error('TURSO_REFUND_EXCEEDS_CAPTURED_TOTAL');
    if(!existing){
      await tx.run('INSERT INTO square_refund_entries(refund_id,order_id,payment_id,amount_cents,currency,confirmed_at) VALUES (?,?,?,?,?,?)',
        refundId,orderId,paymentId,amountCents,currency,now());
    }
    const refundedCents=already+(existing?0:amountCents);
    return {fullyRefunded:refundedCents===paidCents,
      paymentStatus:refundedCents===paidCents?'refunded':'partially_refunded',
      refundedCents,paidCents,alreadyRecorded:Boolean(existing)};
  });
}
