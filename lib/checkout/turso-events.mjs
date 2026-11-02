/**
 * Turso durable Square webhook deduplication and notification outbox.
 *
 * IMPORTANT: A Square webhook's HMAC/amount/provider status MUST be
 * independently verified before invoking these functions. An outbox claim is
 * NOT a delivered email; on ambiguous provider response, reconciliation is
 * required to avoid either double sending or silently losing a notice.
 */
const timestamp=()=>new Date().toISOString();
const affected=(r)=>{
  if(!Number.isSafeInteger(r?.changes)) throw Error('TURSO_WRITE_CONFIRMATION_UNAVAILABLE');
  return r.changes;
};
function immediately(db,fn){
  if(typeof db?.transactionAsync!=='function')throw Error('TURSO_TRANSACTION_REQUIRED');
  const tx=db.transactionAsync(fn);
  if(typeof tx?.immediate!=='function')throw Error('TURSO_IMMEDIATE_TRANSACTION_REQUIRED');
  return tx.immediate();
}
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=250&&id!=='unknown';
const kinds=new Set(['customer_confirmation','staff_notification']);

/** One webhook is owned by at most one processor. No expiry-based takeover. */
export async function claimTursoSquareWebhook(db,{eventId,eventType}){
  if(!validId(eventId)||!validId(eventType))throw Error('TURSO_WEBHOOK_IDENTITY_REQUIRED');
  return immediately(db,async tx=>{
    const prior=await tx.get('SELECT provider,event_type,status FROM webhook_events WHERE event_id=?',eventId);
    if(prior){
      if(prior.provider!=='square'||prior.event_type!==eventType)throw Error('TURSO_WEBHOOK_ID_REUSED');
      return {process:false,alreadyProcessed:prior.status==='processed',
        needsReconciliation:prior.status!=='processed'};
    }
    const time=timestamp();
    const r=await tx.run(
      'INSERT INTO webhook_events(event_id,provider,event_type,status,attempt_count,first_attempt_at,last_attempt_at) VALUES (?,?,?,?,?,?,?)',
      eventId,'square',eventType,'processing',1,time,time);
    if(affected(r)!==1)throw Error('TURSO_WEBHOOK_CLAIM_LOST');
    return {process:true,alreadyProcessed:false,needsReconciliation:false};
  });
}
export async function completeTursoSquareWebhook(db,{eventId,eventType,result={}}){
  if(!validId(eventId)||!validId(eventType))throw Error('TURSO_WEBHOOK_IDENTITY_REQUIRED');
  return immediately(db,async tx=>{
    const prior=await tx.get('SELECT provider,event_type,status FROM webhook_events WHERE event_id=?',eventId);
    if(!prior||prior.provider!=='square'||prior.event_type!==eventType)throw Error('TURSO_WEBHOOK_CLAIM_MISSING');
    if(prior.status==='processed')return false;
    if(prior.status!=='processing')throw Error('TURSO_WEBHOOK_REQUIRES_RECONCILIATION');
    const time=timestamp();
    const update=await tx.run(
      "UPDATE webhook_events SET status='processed',processed_at=?,last_attempt_at=?,result_json=? WHERE event_id=? AND status='processing'",
      time,time,JSON.stringify(result),eventId);
    if(affected(update)!==1)throw Error('TURSO_WEBHOOK_COMPLETION_RACE');
    return true;
  });
}

/** Durable outbox claim. Only a new claim authorizes sending once. */
export async function claimTursoNotification(db,{orderId,kind}){
  if(!validId(orderId)||!kinds.has(kind))throw Error('TURSO_NOTIFICATION_IDENTITY_REQUIRED');
  return immediately(db,async tx=>{
    const order=await tx.get('SELECT id FROM orders WHERE id=?',orderId);
    if(!order)throw Error('TURSO_NOTIFICATION_ORDER_NOT_FOUND');
    const row=await tx.get('SELECT status FROM checkout_notification_outbox WHERE order_id=? AND kind=?',orderId,kind);
    if(row){
      if(row.status!=='pending')return {send:false,alreadySent:row.status==='sent',
        needsReconciliation:row.status!=='sent'};
      const changed=await tx.run(
        "UPDATE checkout_notification_outbox SET status='claimed',attempt_count=attempt_count+1,claimed_at=?,updated_at=? WHERE order_id=? AND kind=? AND status='pending'",
        timestamp(),timestamp(),orderId,kind);
      if(affected(changed)!==1)throw Error('TURSO_NOTIFICATION_CLAIM_RACE');
    }else{
      const time=timestamp();
      const inserted=await tx.run(
        'INSERT INTO checkout_notification_outbox(order_id,kind,status,attempt_count,claimed_at,updated_at) VALUES (?,?,?,?,?,?)',
        orderId,kind,'claimed',1,time,time);
      if(affected(inserted)!==1)throw Error('TURSO_NOTIFICATION_CLAIM_RACE');
    }
    return {send:true,alreadySent:false,needsReconciliation:false};
  });
}
/** Only record 'sent' after the external provider has confirmed acceptance. */
export async function markTursoNotificationSent(db,{orderId,kind,providerMessageId}){
  if(!validId(orderId)||!kinds.has(kind)||!validId(providerMessageId))
    throw Error('TURSO_NOTIFICATION_DELIVERY_PROOF_REQUIRED');
  return immediately(db,async tx=>{
    const prior=await tx.get('SELECT status,provider_message_id FROM checkout_notification_outbox WHERE order_id=? AND kind=?',orderId,kind);
    if(!prior)throw Error('TURSO_NOTIFICATION_CLAIM_MISSING');
    if(prior.status==='sent'){
      if(prior.provider_message_id!==providerMessageId)throw Error('TURSO_NOTIFICATION_PROVIDER_ID_CONFLICT');
      return false;
    }
    if(prior.status!=='claimed')throw Error('TURSO_NOTIFICATION_REQUIRES_RECONCILIATION');
    const time=timestamp();
    const updated=await tx.run(
      "UPDATE checkout_notification_outbox SET status='sent',provider_message_id=?,sent_at=?,updated_at=? WHERE order_id=? AND kind=? AND status='claimed'",
      providerMessageId,time,time,orderId,kind);
    if(affected(updated)!==1)throw Error('TURSO_NOTIFICATION_CONFIRMATION_RACE');
    return true;
  });
}
export async function markTursoNotificationUncertain(db,{orderId,kind}){
  if(!validId(orderId)||!kinds.has(kind))throw Error('TURSO_NOTIFICATION_IDENTITY_REQUIRED');
  return immediately(db,async tx=>{
    const update=await tx.run(
      "UPDATE checkout_notification_outbox SET status='needs_reconciliation',updated_at=? WHERE order_id=? AND kind=? AND status='claimed'",
      timestamp(),orderId,kind);
    return affected(update)===1;
  });
}
