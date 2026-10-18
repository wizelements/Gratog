/**
 * Transactional reverse-delta executor for a marked, loopback Mongo restore
 * clone ONLY. This is not a production database switch or backup utility.
 * Provider readbacks are supplied by an authenticated caller. The fixture
 * harness labels its synthetic provider separately and cannot certify Gate D.
 */
import {createHash} from 'node:crypto';
import {planVerifiedReverseDelta} from './turso-reverse-delta-plan.mjs';

export class CloneRecoveryBlocked extends Error {
  constructor(code) { super(code); this.name='CloneRecoveryBlocked'; this.code=code; }
}
const block=code=>{ throw new CloneRecoveryBlocked(code); };
const validId=x=>typeof x==='string' && x.length>0 && x.length<=250;
const int=x=>Number.isSafeInteger(x);
const iso=x=>typeof x==='string' && /^\d{4}-\d{2}-\d{2}T/.test(x) && Number.isFinite(Date.parse(x));
const hash=x=>typeof x==='string' && /^[a-f0-9]{64}$/.test(x);
const canonical=x=>Array.isArray(x) ? x.map(canonical) :
  x && typeof x==='object' && !(x instanceof Date)
    ? Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])) : x;
export const recoveryDigest=x=>createHash('sha256').update(JSON.stringify(canonical(x))??'undefined').digest('hex');
export const mongoDocumentDigest=x=>{ const {_id,...rest}=x; return recoveryDigest(rest); };

export function assertCloneAddress(uri, databaseName) {
  let parsed;
  try { parsed=new URL(uri); } catch { block('CLONE_URI_INVALID'); }
  if(parsed.protocol!=='mongodb:' || !['127.0.0.1','localhost','[::1]'].includes(parsed.hostname) ||
     parsed.username || parsed.password || parsed.pathname!==`/${databaseName}` ||
     !/^tog_recovery_clone_[a-z0-9_]{1,60}$/.test(databaseName) ||
     parsed.searchParams.get('directConnection')!=='true') block('CLONE_TARGET_NOT_ISOLATED');
}

/** Validate all data before any Mongo write. Unknown financial states block. */
export function validateCloneBundle(bundle) {
  if(!bundle || bundle.schemaVersion!==1 || bundle.scope!=='isolated-restore-clone' ||
     !validId(bundle.id) || !hash(bundle.snapshotSha256) || !iso(bundle.freezeWatermark) ||
     !iso(bundle.throughWatermark) || Date.parse(bundle.throughWatermark)<=Date.parse(bundle.freezeWatermark) ||
     !Array.isArray(bundle.records) || !bundle.records.length || bundle.records.length>1000)
    block('RECOVERY_BUNDLE_INVALID');
  const orderIds=new Set(), paymentIds=new Set(), refundIds=new Set(), eventIds=new Set(), webhookIds=new Set();
  const stockFinal=new Map();
  for(const r of bundle.records) {
    const o=r?.order, p=r?.payment;
    if(!o || !validId(o.id) || orderIds.has(o.id) || !validId(o.squareOrderId) ||
       !validId(o.squarePaymentId) || !int(o.totalCents) || o.totalCents<=0 ||
       o.currency!=='USD' || !iso(o.createdAt) || !iso(o.updatedAt) ||
       Date.parse(o.updatedAt)<=Date.parse(bundle.freezeWatermark) ||
       Date.parse(o.updatedAt)>Date.parse(bundle.throughWatermark) ||
       !(r.expectedBeforeHash===null || hash(r.expectedBeforeHash)) ||
       !Array.isArray(o.items) || !o.items.length || o.items.length>100 ||
       !Array.isArray(r.refunds) || !Array.isArray(r.inventoryEvents) ||
       !Array.isArray(r.notifications) || !Array.isArray(r.webhookEvents) ||
       (r.expectedBeforeHash===null && Date.parse(o.createdAt)<=Date.parse(bundle.freezeWatermark)))
      block('RECOVERY_ORDER_INVALID');
    orderIds.add(o.id);
    if(!p || p.orderId!==o.id || p.squarePaymentId!==o.squarePaymentId ||
       p.squareOrderId!==o.squareOrderId || paymentIds.has(p.squarePaymentId) ||
       p.status!=='COMPLETED' || p.currency!=='USD' || p.amountCents!==o.totalCents)
      block('RECOVERY_PAYMENT_INVALID');
    paymentIds.add(p.squarePaymentId);
    const items=new Map();
    for(const line of o.items) {
      if(!validId(line.productId) || !int(line.quantity) || line.quantity<=0)
        block('RECOVERY_STOCK_ITEMS_INVALID');
      const quantity=(items.get(line.productId)||0)+line.quantity;
      if(!int(quantity)) block('RECOVERY_STOCK_ITEMS_INVALID');
      items.set(line.productId,quantity);
    }
    let refunded=0;
    for(const refund of r.refunds) {
      if(!validId(refund.refundId) || refundIds.has(refund.refundId) ||
         refund.orderId!==o.id || refund.paymentId!==p.squarePaymentId ||
         refund.currency!=='USD' || !int(refund.amountCents) || refund.amountCents<=0)
        block('RECOVERY_REFUND_INVALID');
      refundIds.add(refund.refundId); refunded+=refund.amountCents;
    }
    if(!int(refunded) || refunded>o.totalCents || o.amountPaidCents!==o.totalCents ||
       o.refundedAmountCents!==refunded || o.paymentStatus!==
       (refunded===o.totalCents?'refunded':refunded?'partially_refunded':'paid'))
      block('RECOVERY_FINANCIAL_STATE_MISMATCH');
    const debits=new Map(), restocks=new Map();
    for(const event of r.inventoryEvents) {
      if(!validId(event.id) || eventIds.has(event.id) || event.orderId!==o.id ||
         !items.has(event.productId) || !int(event.before) || !int(event.after) ||
         !int(event.delta) || !event.delta || event.before<0 || event.after<0 ||
         event.before+event.delta!==event.after || !iso(event.createdAt) ||
         Date.parse(event.createdAt)<=Date.parse(bundle.freezeWatermark) ||
         Date.parse(event.createdAt)>Date.parse(bundle.throughWatermark))
        block('RECOVERY_INVENTORY_EVENT_INVALID');
      eventIds.add(event.id);
      if(stockFinal.has(event.productId) && stockFinal.get(event.productId)!==event.before)
        block('RECOVERY_INVENTORY_CHAIN_BROKEN');
      stockFinal.set(event.productId,event.after);
      if(event.type==='order_debit' && event.delta<0) {
        debits.set(event.productId,(debits.get(event.productId)||0)-event.delta);
      } else if(event.type==='return_restock' && event.delta>0 && validId(event.returnDecisionId)) {
        restocks.set(event.productId,(restocks.get(event.productId)||0)+event.delta);
      } else block('RECOVERY_RESTOCK_POLICY_UNVERIFIED');
    }
    for(const [productId,quantity] of items) {
      if(r.expectedBeforeHash===null && debits.get(productId)!==quantity)
        block('RECOVERY_NEW_ORDER_DEBIT_MISSING');
      if((debits.get(productId)||0)>quantity || (restocks.get(productId)||0)>quantity)
        block('RECOVERY_INVENTORY_QUANTITY_MISMATCH');
    }
    const kinds=new Set();
    for(const n of r.notifications) {
      if(!['customer_confirmation','staff_notification'].includes(n.kind) || kinds.has(n.kind) ||
         !['pending','claimed','sent','accepted','delivered','failed','needs_reconciliation'].includes(n.sourceStatus) ||
         (['sent','accepted','delivered'].includes(n.sourceStatus) && !validId(n.providerMessageId)) ||
         !int(n.attemptCount) || n.attemptCount<0 ||
         (n.sourceAcceptedAt!==undefined && (!iso(n.sourceAcceptedAt) ||
          !['sent','accepted','delivered'].includes(n.sourceStatus))) ||
         (n.sourceDeliveredAt!==undefined && (!iso(n.sourceDeliveredAt) || n.sourceStatus!=='delivered')) ||
         (n.sourceStatus==='delivered' && !iso(n.sourceDeliveredAt))) block('RECOVERY_NOTIFICATION_INVALID');
      kinds.add(n.kind);
    }
    if(kinds.size!==2) block('RECOVERY_NOTIFICATION_INCOMPLETE');
    for(const e of r.webhookEvents) {
      const paymentEvent=['payment.created','payment.updated','payment.completed'].includes(e.eventType);
      const refundEvent=['refund.created','refund.updated'].includes(e.eventType);
      if(!validId(e.eventId) || webhookIds.has(e.eventId) || e.orderId!==o.id ||
         e.status!=='processed' || !iso(e.processedAt) ||
         !(paymentEvent && e.providerObjectId===p.squarePaymentId ||
           refundEvent && r.refunds.some(x=>x.refundId===e.providerObjectId)))
        block('RECOVERY_WEBHOOK_EVENT_UNVERIFIED');
      webhookIds.add(e.eventId);
    }
  }
  return {digest:recoveryDigest(bundle),stockFinal};
}

async function assertMarker(db, client, expected, session) {
  const hello=await db.command({hello:1},{session});
  if(!hello.setName || !hello.isWritablePrimary) block('CLONE_REPLICA_TRANSACTION_REQUIRED');
  const marker=await db.collection('recovery_clone_control').findOne({_id:'isolated_restore_clone'},{session});
  if(!marker || marker.cloneId!==expected.cloneId || marker.databaseName!==db.databaseName ||
     marker.snapshotSha256!==expected.snapshotSha256 || marker.snapshotWatermark!==expected.freezeWatermark ||
     marker.kind!=='disposable_restore_clone' || marker.applicationWritersDisabled!==true ||
     marker.restoredAndVerified!==true) block('CLONE_OWNERSHIP_OR_RESTORE_UNVERIFIED');
}

async function indexes(db) {
  for(const [collection,key,options] of [
    ['orders',{id:1},{unique:true}],
    ['orders',{squarePaymentId:1},{unique:true,partialFilterExpression:{squarePaymentId:{$type:'string'}}}],
    ['payment_records',{squarePaymentId:1},{unique:true}],
    ['square_refund_entries',{refundId:1},{unique:true}],
    ['inventory',{productId:1},{unique:true}],
    ['checkout_stock_claims',{orderId:1},{unique:true}],
    ['inventory_events',{recoveryEventId:1},{unique:true,partialFilterExpression:{recoveryEventId:{$type:'string'}}}],
    ['checkout_notification_outbox',{orderId:1,kind:1},{unique:true}],
    ['webhook_events_processed',{eventId:1},{unique:true}],
  ]) await db.collection(collection).createIndex(key,options);
  // Precreate collections: transactions cannot safely infer missing namespaces.
  for(const name of ['recovery_applications','recovery_runs']) {
    if(!(await db.listCollections({name}).toArray()).length) await db.createCollection(name);
  }
}

async function insertOrCheck(collection, query, value, session, code) {
  const prior=await collection.findOne(query,{session});
  if(prior) {
    for(const [key,expected] of Object.entries(value)) {
      if(recoveryDigest(prior[key])!==recoveryDigest(expected)) block(code);
    }
    return false;
  }
  // Mongo adds _id to the supplied object. Never let that mutate the signed
  // recovery input and change its digest between an interrupted run and retry.
  await collection.insertOne(structuredClone(value),{session}); return true;
}

export function buildRecoveredCloneOrder(record) {
  const o=structuredClone(record.order);
  // Holds block legacy senders explicitly; a recovery watermark is never a
  // send or delivery timestamp. Carry only actual known source timestamps.
  delete o.emailSentAt;
  delete o.emailClaimedAt;
  delete o.confirmationEmailClaimedAt;
  delete o.staffNotifiedAt;
  delete o.staffNotificationClaimedAt;
  const customer=record.notifications.find(x=>x.kind==='customer_confirmation');
  const staff=record.notifications.find(x=>x.kind==='staff_notification');
  if(customer?.sourceAcceptedAt) o.emailSentAt=customer.sourceAcceptedAt;
  if(staff?.sourceAcceptedAt) o.staffNotifiedAt=staff.sourceAcceptedAt;
  o.customerNotificationSourceStatus=customer.sourceStatus;
  o.staffNotificationSourceStatus=staff.sourceStatus;
  o.customerNotificationRecoveryHold=true;
  o.staffNotificationRecoveryHold=true;
  o.recoveryNotificationDecision='do_not_resend_without_reconciliation';
  return o;
}

export async function replayIntoMongoClone({client,db,uri,cloneId,bundle,providerReadback,fault}) {
  assertCloneAddress(uri,db.databaseName);
  const actualHosts=client.options?.hosts;
  if(db.client!==client || client.options?.directConnection!==true ||
     client.options?.dbName!==db.databaseName || !Array.isArray(actualHosts) || actualHosts.length!==1 ||
     !['127.0.0.1','localhost','::1'].includes(actualHosts[0]?.host))
    block('CLONE_CLIENT_CONNECTION_MISMATCH');
  const validated=validateCloneBundle(bundle);
  if(!validId(cloneId) || !providerReadback || typeof providerReadback.payment!=='function' ||
     typeof providerReadback.refund!=='function' ||
     !['authenticated-square-readback','synthetic-fixture'].includes(providerReadback.kind))
    block('RECOVERY_PROVIDER_READER_REQUIRED');
  const expected={cloneId,snapshotSha256:bundle.snapshotSha256,freezeWatermark:bundle.freezeWatermark};
  await assertMarker(db,client,expected);
  const providerPayments=[],providerRefunds=[];
  // Read every provider outcome before any write, including a resumed run.
  for(const r of bundle.records) {
    providerPayments.push(await providerReadback.payment(r.payment.squarePaymentId));
    for(const refund of r.refunds) providerRefunds.push(await providerReadback.refund(refund.refundId));
  }
  const planned=planVerifiedReverseDelta({freezeWatermark:bundle.freezeWatermark,
    orders:bundle.records.map(({order:o})=>({id:o.id,square_order_id:o.squareOrderId,
      total_cents:o.totalCents,currency:o.currency,payment_status:o.paymentStatus,updated_at:o.updatedAt})),
    payments:bundle.records.map(({payment:p})=>({order_id:p.orderId,square_payment_id:p.squarePaymentId,
      amount_cents:p.amountCents,currency:p.currency,status:p.status})),
    refunds:bundle.records.flatMap(r=>r.refunds.map(x=>({order_id:x.orderId,refund_id:x.refundId,
      payment_id:x.paymentId,amount_cents:x.amountCents,currency:x.currency}))),
    providerPayments,providerRefunds,
  });
  if(!int(planned.capturedCents) || !int(planned.refundedCents)) block('RECOVERY_LEDGER_SUM_OVERFLOW');
  await indexes(db);
  await db.collection('recovery_runs').updateOne({_id:bundle.id},{$setOnInsert:{
    bundleDigest:validated.digest,cloneId,snapshotSha256:bundle.snapshotSha256,
    freezeWatermark:bundle.freezeWatermark,throughWatermark:bundle.throughWatermark,
    providerEvidenceKind:providerReadback.kind,status:'replaying',
  }},{upsert:true});
  const run=await db.collection('recovery_runs').findOne({_id:bundle.id});
  if(run.bundleDigest!==validated.digest || run.cloneId!==cloneId || run.providerEvidenceKind!==providerReadback.kind)
    block('RECOVERY_RUN_ID_REUSED');
  let applied=0,replayed=0;
  for(const [position,r] of bundle.records.entries()) {
    const operationHash=recoveryDigest(r), operationId=`${bundle.id}:${r.order.id}`;
    const session=client.startSession();
    let didApply=false;
    try {
      await session.withTransaction(async()=>{
        didApply=false;
        const marker=await db.collection('recovery_clone_control').findOne({_id:'isolated_restore_clone'},{session});
        if(!marker || marker.cloneId!==cloneId || marker.snapshotSha256!==bundle.snapshotSha256 ||
           marker.applicationWritersDisabled!==true) block('CLONE_OWNERSHIP_CHANGED');
        const priorApply=await db.collection('recovery_applications').findOne({_id:operationId},{session});
        if(priorApply) {
          if(priorApply.operationHash!==operationHash) block('RECOVERY_OPERATION_ID_REUSED');
          return;
        }
        const existing=await db.collection('orders').findOne({id:r.order.id},{session});
        if((r.expectedBeforeHash===null && existing) ||
           (r.expectedBeforeHash!==null && (!existing || mongoDocumentDigest(existing)!==r.expectedBeforeHash)))
          block('RECOVERY_BASE_ORDER_CHANGED');
        const paymentValue={squarePaymentId:r.payment.squarePaymentId,status:'COMPLETED',
          amountCents:r.payment.amountCents,currency:'USD',metadata:{orderId:r.order.id,squareOrderId:r.order.squareOrderId}};
        const priorPayment=await db.collection('payment_records').findOne({squarePaymentId:r.payment.squarePaymentId},{session});
        if(priorPayment && (priorPayment.metadata?.orderId!==r.order.id ||
           priorPayment.metadata?.squareOrderId!==r.order.squareOrderId || priorPayment.amountCents!==r.order.totalCents ||
           priorPayment.status!=='COMPLETED' || priorPayment.currency!=='USD')) block('RECOVERY_PAYMENT_COLLISION');
        if(!priorPayment) await db.collection('payment_records').insertOne(paymentValue,{session});
        const orderValue=buildRecoveredCloneOrder(r);
        if(existing) await db.collection('orders').replaceOne({_id:existing._id},{...orderValue,_id:existing._id},{session});
        else await db.collection('orders').insertOne(orderValue,{session});
        for(const refund of r.refunds) await insertOrCheck(db.collection('square_refund_entries'),
          {refundId:refund.refundId},refund,session,'RECOVERY_REFUND_COLLISION');
        // An unrelated refund for this order must not silently survive replay.
        const refundRows=await db.collection('square_refund_entries').find({orderId:r.order.id},{session}).toArray();
        if(refundRows.length!==r.refunds.length ||
           refundRows.reduce((n,x)=>n+x.amountCents,0)!==r.order.refundedAmountCents)
          block('RECOVERY_RESTORED_REFUND_LEDGER_MISMATCH');
        for(const event of r.inventoryEvents) {
          if(await db.collection('inventory_events').findOne({recoveryEventId:event.id},{session}))
            block('RECOVERY_ORPHAN_INVENTORY_EVENT');
          const updated=await db.collection('inventory').updateOne(
            {productId:event.productId,currentStock:event.before},
            {$inc:{currentStock:event.delta}},{session});
          if(updated.matchedCount!==1) block('RECOVERY_STOCK_BASE_MISMATCH');
          await db.collection('inventory_events').insertOne({recoveryEventId:event.id,
            orderId:event.orderId,productId:event.productId,type:event.type,adjustment:event.delta,
            before:event.before,after:event.after,sourceEventHash:recoveryDigest(event),
            createdAt:event.createdAt,recoveryRunId:bundle.id},{session});
          await fault?.('after_inventory',{position,orderId:r.order.id});
        }
        const items=[...r.order.items.reduce((map,x)=>map.set(x.productId,(map.get(x.productId)||0)+x.quantity),new Map())]
          .sort(([a],[b])=>a.localeCompare(b)).map(([productId,quantity])=>({productId,quantity}));
        await insertOrCheck(db.collection('checkout_stock_claims'),{orderId:r.order.id},
          {orderId:r.order.id,status:'committed',items},session,'RECOVERY_STOCK_CLAIM_CONFLICT');
        for(const n of r.notifications) {
          const value={orderId:r.order.id,kind:n.kind,status:'reconciliation_hold',sourceStatus:n.sourceStatus,
            providerMessageId:n.providerMessageId||null,attemptCount:n.attemptCount,
            sourceAcceptedAt:n.sourceAcceptedAt||null,sourceDeliveredAt:n.sourceDeliveredAt||null,
            suppressAutomaticSend:true,recoveryRunId:bundle.id};
          await insertOrCheck(db.collection('checkout_notification_outbox'),{orderId:r.order.id,kind:n.kind},
            value,session,'RECOVERY_NOTIFICATION_COLLISION');
        }
        for(const event of r.webhookEvents) {
          await insertOrCheck(db.collection('webhook_events_processed'),{eventId:event.eventId},
            {eventId:event.eventId,eventType:event.eventType,orderId:r.order.id,
              providerObjectId:event.providerObjectId,status:'success',processedAt:event.processedAt,
              sourceEventHash:recoveryDigest(event),recoveryRunId:bundle.id},session,
            'RECOVERY_WEBHOOK_EVENT_COLLISION');
        }
        await db.collection('recovery_applications').insertOne({_id:operationId,
          operationHash,orderId:r.order.id,recoveryRunId:bundle.id,status:'applied'},{session});
        await fault?.('before_commit',{position,orderId:r.order.id});
        didApply=true;
      },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'},readPreference:'primary'});
    } finally { await session.endSession(); }
    if(didApply) applied++; else replayed++;
    await fault?.('after_commit',{position,orderId:r.order.id});
  }
  // Independent readback catches drift even when every durable operation is a replay.
  for(const r of bundle.records) {
    const restored=await db.collection('orders').findOne({id:r.order.id});
    if(!restored || mongoDocumentDigest(restored)!==recoveryDigest(buildRecoveredCloneOrder(r)))
      block('RECOVERY_ORDER_READBACK_MISMATCH');
    const p=await db.collection('payment_records').findOne({squarePaymentId:r.payment.squarePaymentId});
    if(!p || p.metadata?.orderId!==r.order.id || p.amountCents!==r.order.totalCents || p.status!=='COMPLETED')
      block('RECOVERY_PAYMENT_READBACK_MISMATCH');
    const refunds=await db.collection('square_refund_entries').find({orderId:r.order.id}).toArray();
    if(refunds.length!==r.refunds.length || refunds.reduce((n,x)=>n+x.amountCents,0)!==r.order.refundedAmountCents)
      block('RECOVERY_REFUND_READBACK_MISMATCH');
    for(const refund of r.refunds) {
      const actual=refunds.find(x=>x.refundId===refund.refundId);
      if(!actual || Object.keys(refund).some(k=>recoveryDigest(actual[k])!==recoveryDigest(refund[k])))
        block('RECOVERY_REFUND_READBACK_MISMATCH');
    }
    for(const event of r.inventoryEvents) {
      const actual=await db.collection('inventory_events').findOne({recoveryEventId:event.id});
      if(actual?.sourceEventHash!==recoveryDigest(event)) block('RECOVERY_EVENT_READBACK_MISMATCH');
    }
    for(const n of r.notifications) {
      const actual=await db.collection('checkout_notification_outbox').findOne({orderId:r.order.id,kind:n.kind});
      if(!actual || actual.status!=='reconciliation_hold' || actual.suppressAutomaticSend!==true ||
         actual.providerMessageId!==(n.providerMessageId||null) || actual.sourceStatus!==n.sourceStatus)
        block('RECOVERY_NOTIFICATION_READBACK_MISMATCH');
    }
    for(const event of r.webhookEvents) {
      const actual=await db.collection('webhook_events_processed').findOne({eventId:event.eventId});
      if(actual?.status!=='success' || actual.sourceEventHash!==recoveryDigest(event))
        block('RECOVERY_WEBHOOK_READBACK_MISMATCH');
    }
  }
  for(const [productId,stock] of validated.stockFinal) {
    if((await db.collection('inventory').findOne({productId}))?.currentStock!==stock)
      block('RECOVERY_FINAL_STOCK_MISMATCH');
  }
  await db.collection('recovery_runs').updateOne({_id:bundle.id,bundleDigest:validated.digest},
    {$set:{status:'verified',verifiedAt:new Date().toISOString()}});
  return {status:'ISOLATED_CLONE_REPLAY_VERIFIED',providerEvidenceKind:providerReadback.kind,
    operationDigest:validated.digest,applied,replayed,orderCount:planned.orderCount,
    capturedCents:planned.capturedCents,refundedCents:planned.refundedCents,
    notificationsHeld:bundle.records.length*2,certifiesProductionSourceBackup:false,
    certifiesProductionRollback:false};
}
