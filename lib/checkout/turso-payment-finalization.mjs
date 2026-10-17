/**
 * A single Turso write transaction binds a provider-verified Square capture to
 * exactly one canonical order, its pre-payment stock hold, its durable payment
 * record, and pending customer/staff notification claims.
 *
 * This function MUST be called only AFTER retrieving and verifying payment
 * status/amount/currency/identity from Square itself. It never charges money,
 * sends email, or infers that an ambiguous Square result failed.
 */
import { randomUUID } from 'node:crypto';

const nonempty = (value) => typeof value === 'string' && value.length > 0 && value.length <= 250;
const changeCount = result => {
  if (!Number.isSafeInteger(result?.changes)) throw new Error('TURSO_WRITE_CONFIRMATION_MISSING');
  return result.changes;
};
const transaction = (db,fn) => {
  if (typeof db?.transactionAsync !== 'function') throw new Error('TURSO_TRANSACTION_CONNECTION_REQUIRED');
  const work = db.transactionAsync(fn);
  if (typeof work?.immediate !== 'function') throw new Error('TURSO_IMMEDIATE_TRANSACTION_REQUIRED');
  return work.immediate();
};

/** squarePayment is a trusted server-side readback, never browser JSON. */
export async function finalizeVerifiedTursoSquarePayment(db,{
  orderId, squarePayment, providerVerified=false,
}={}) {
  if (!nonempty(orderId) || providerVerified !== true ||
      !squarePayment || squarePayment.status !== 'COMPLETED' ||
      !nonempty(squarePayment.id) ||
      !nonempty(squarePayment.idempotencyKey) ||
      squarePayment.currency !== 'USD' ||
      !Number.isSafeInteger(squarePayment.amountCents) ||
      squarePayment.amountCents <= 0) {
    throw new Error('SQUARE_CAPTURE_NOT_INDEPENDENTLY_VERIFIED');
  }
  return transaction(db,async tx => {
    const order = await tx.get(
      'SELECT id,source_collection,status,payment_status,total_cents,currency,amount_paid_cents FROM orders WHERE id=?',orderId);
    if (!order || !['orders','marketorders'].includes(order.source_collection) || order.currency !== 'USD' ||
        Number(order.total_cents) !== squarePayment.amountCents) {
      throw new Error('SQUARE_CAPTURE_AMOUNT_OR_ORDER_MISMATCH');
    }
    const prior = await tx.get(
      'SELECT order_id,square_payment_id,status,amount_cents,currency,idempotency_key FROM payments WHERE square_payment_id=?',
      squarePayment.id
    );
    if (prior && (prior.order_id !== orderId || prior.status !== 'COMPLETED' ||
      Number(prior.amount_cents) !== squarePayment.amountCents ||
      prior.currency !== squarePayment.currency ||
      prior.idempotency_key !== squarePayment.idempotencyKey)) {
      throw new Error('SQUARE_CAPTURE_IDENTITY_REUSED');
    }
    const existing = await tx.get(
      "SELECT square_payment_id,status FROM payments WHERE order_id=? AND status='COMPLETED'",orderId);
    if (existing && existing.square_payment_id !== squarePayment.id)
      throw new Error('SQUARE_SECOND_CAPTURE_REQUIRES_RECONCILIATION');
    const claim = await tx.get('SELECT status FROM checkout_stock_claims WHERE order_id=?',orderId);
    if (!claim || !['reserved','committed'].includes(claim.status))
      throw new Error('SQUARE_CAPTURE_WITHOUT_RESERVED_STOCK');
    const lines=await tx.all('SELECT product_id,quantity FROM checkout_stock_claim_items WHERE order_id=?',orderId);
    if (!Array.isArray(lines) || !lines.length) throw new Error('SQUARE_CAPTURE_WITHOUT_STOCK_ITEMS');
    if (order.payment_status === 'paid' && (!prior || claim.status !== 'committed' ||
        Number(order.amount_paid_cents)!==squarePayment.amountCents)) {
      throw new Error('SQUARE_PAID_ORDER_INCONSISTENT');
    }
    if (order.payment_status !== 'paid' &&
      (!['pending','payment_processing','PENDING_PAYMENT','PREORDER_PENDING_PAYMENT','payment_failed'].includes(order.payment_status) ||
       !['pending','payment_processing','PENDING_PAYMENT','PREORDER_PENDING_PAYMENT','payment_failed'].includes(order.status))) {
      throw new Error('SQUARE_ORDER_NOT_PAYABLE');
    }
    if (order.payment_status === 'paid') {
      return {recorded:false,alreadyFinalized:true,amountCents:squarePayment.amountCents,notificationQueued:false};
    }
    if (claim.status!=='reserved' || prior) throw new Error('SQUARE_CAPTURE_PARTIAL_FINALIZATION');
    const ts=new Date().toISOString();
    const r=await tx.run(
      'INSERT INTO payments(id,order_id,square_payment_id,idempotency_key,status,amount_cents,currency,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
      randomUUID(),orderId,squarePayment.id,squarePayment.idempotencyKey,'COMPLETED',
      squarePayment.amountCents,'USD',ts,ts
    );
    if(changeCount(r)!==1)throw new Error('SQUARE_PAYMENT_RECORD_WRITE_FAILED');
    const claimUpdate=await tx.run(
      "UPDATE checkout_stock_claims SET status='committed',committed_at=?,updated_at=? WHERE order_id=? AND status='reserved'",
      ts,ts,orderId
    );
    if(changeCount(claimUpdate)!==1)throw new Error('SQUARE_STOCK_COMMIT_FAILED');
    const event=await tx.run(
      'INSERT INTO inventory_events(id,order_id,event_type,created_at,metadata_json) VALUES (?,?,?,?,?)',
      randomUUID(),orderId,'order_debit',ts,
      JSON.stringify({origin:'verified_square_capture',squarePaymentId:squarePayment.id,items:lines})
    );
    if(changeCount(event)!==1)throw new Error('SQUARE_DEBIT_LEDGER_FAILED');
    const changed=await tx.run(
      "UPDATE orders SET status='paid',payment_status='paid',amount_paid_cents=?,updated_at=? WHERE id=? AND payment_status IN ('pending','payment_processing','PENDING_PAYMENT','PREORDER_PENDING_PAYMENT','payment_failed') AND status IN ('pending','payment_processing','PENDING_PAYMENT','PREORDER_PENDING_PAYMENT','payment_failed')",
      squarePayment.amountCents,ts,orderId
    );
    if(changeCount(changed)!==1)throw new Error('SQUARE_ORDER_PAID_UPDATE_FAILED');
    for(const kind of ['customer_confirmation','staff_notification']){
      const note=await tx.run(
        "INSERT INTO checkout_notification_outbox(order_id,kind,status,attempt_count,updated_at) VALUES (?,?,?,0,?)",
        orderId,kind,'pending',ts
      );
      if(changeCount(note)!==1)throw new Error('SQUARE_NOTIFICATION_OUTBOX_WRITE_FAILED');
    }
    return {recorded:true,alreadyFinalized:false,amountCents:squarePayment.amountCents,notificationQueued:true};
  });
}

/**
 * Verified, COMPLETED Square refund: atomically bind provider refund identity,
 * cumulative cents and canonical order state to a prior captured payment.
 * Provider verification must occur on the server and cannot be supplied by a buyer.
 */
export async function finalizeVerifiedTursoSquareRefund(db,{
  orderId, squareRefund, providerVerified=false,
}={}) {
  if (!nonempty(orderId) || providerVerified !== true || !squareRefund ||
    squareRefund.status !== 'COMPLETED' || !nonempty(squareRefund.id) ||
    !nonempty(squareRefund.paymentId) || squareRefund.currency !== 'USD' ||
    !Number.isSafeInteger(squareRefund.amountCents) || squareRefund.amountCents<=0) {
    throw new Error('SQUARE_REFUND_NOT_INDEPENDENTLY_VERIFIED');
  }
  return transaction(db,async tx=>{
    const payment=await tx.get(
      "SELECT order_id,square_payment_id,status,amount_cents,currency FROM payments WHERE order_id=? AND square_payment_id=?",
      orderId,squareRefund.paymentId
    );
    if (!payment || payment.order_id !== orderId || payment.status!=='COMPLETED' ||
      payment.currency!=='USD' || !Number.isSafeInteger(Number(payment.amount_cents)) ||
      Number(payment.amount_cents)<=0) throw new Error('SQUARE_REFUND_CAPTURE_NOT_FOUND');
    const captured=Number(payment.amount_cents);
    const order=await tx.get(
      'SELECT status,payment_status,amount_paid_cents FROM orders WHERE id=?',orderId
    );
    if(!order || Number(order.amount_paid_cents)!==captured)
      throw new Error('SQUARE_REFUND_CAPTURE_TOTAL_MISMATCH');
    const prior=await tx.get(
      'SELECT order_id,payment_id,amount_cents,currency FROM square_refund_entries WHERE refund_id=?',
      squareRefund.id
    );
    if(prior && (prior.order_id!==orderId || prior.payment_id!==squareRefund.paymentId ||
      Number(prior.amount_cents)!==squareRefund.amountCents || prior.currency!=='USD'))
      throw new Error('SQUARE_REFUND_ID_CONFLICT');
    const sum=await tx.get(
      'SELECT COALESCE(SUM(amount_cents),0) total FROM square_refund_entries WHERE order_id=?',orderId
    );
    const refunded=Number(sum.total);
    if(!Number.isSafeInteger(refunded) || refunded<0 ||
       refunded>captured || (!prior && refunded+squareRefund.amountCents>captured))
      throw new Error('SQUARE_REFUND_EXCEEDS_CAPTURE');
    const total=refunded+(prior?0:squareRefund.amountCents);
    const state=total===captured?'refunded':'partially_refunded';
    if(prior){
      if(order.payment_status!==state)throw new Error('SQUARE_REFUND_REPLAY_STATE_MISMATCH');
      return {alreadyRecorded:true,refundedCents:total,paymentStatus:state};
    }
    if(!['paid','partially_refunded'].includes(order.payment_status))
      throw new Error('SQUARE_REFUND_ORDER_STATE_UNSAFE');
    await tx.run(
      'INSERT INTO square_refund_entries(refund_id,order_id,payment_id,amount_cents,currency,confirmed_at) VALUES (?,?,?,?,?,?)',
      squareRefund.id,orderId,squareRefund.paymentId,squareRefund.amountCents,'USD',new Date().toISOString()
    );
    const update=await tx.run(
      'UPDATE orders SET payment_status=?,status=?,updated_at=? WHERE id=? AND payment_status IN (\'paid\',\'partially_refunded\')',
      state,state,new Date().toISOString(),orderId
    );
    if(changeCount(update)!==1)throw new Error('SQUARE_REFUND_ORDER_UPDATE_FAILED');
    return {alreadyRecorded:false,refundedCents:total,paymentStatus:state};
  });
}
