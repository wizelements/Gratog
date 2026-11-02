import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connect} from '@tursodatabase/serverless';
import {claimTursoSquareWebhook,completeTursoSquareWebhook,claimTursoNotification,
 markTursoNotificationSent} from '../../lib/checkout/turso-events.mjs';

const url=process.env.TURSO_DATABASE_URL||'',token=process.env.TURSO_AUTH_TOKEN||'',
 approved=process.env.TURSO_APPROVED_STAGING_NAME||'';
let host='';try{host=new URL(url.replace(/^libsql:/,'https:')).hostname}catch{}
if(!/^gratog-migration-cert-[a-z0-9-]+$/.test(approved)||!host.startsWith(approved+'-')||!token)
  throw new Error('REFUSE_UNVERIFIED_TURSO_STAGING');
const open=()=>connect({url,authToken:token,defaultQueryTimeout:30000});
const root=open(),prefix='events_cert_'+randomUUID().replaceAll('-','').slice(0,12);
const eventId=prefix+'_event',orderId=prefix+'_order',kind='staff_notification';
const now=new Date().toISOString();
try{
 await root.run('INSERT INTO orders(id,source_collection,status,total_cents,created_at,updated_at) VALUES (?,?,?,?,?,?)',
  orderId,'orders','pending',1199,now,now);
 async function parallel(op){
  return Promise.allSettled(Array.from({length:24},async()=>{
   const db=open();
   try{return await op(db)}
   finally{await db.close()}
  }));
 }
 const webhooks=await parallel(db=>claimTursoSquareWebhook(db,{eventId,eventType:'payment.updated'}));
 const processCount=webhooks.filter(r=>r.status==='fulfilled'&&r.value.process).length;
 const webhookErrors=webhooks.filter(r=>r.status==='rejected').length;
 assert.equal(processCount,1);assert.equal(webhookErrors,0);
 assert.equal(await completeTursoSquareWebhook(root,{eventId,eventType:'payment.updated',result:{verified:true}}),true);
 const duplicates=await claimTursoSquareWebhook(root,{eventId,eventType:'payment.updated'});
 assert.equal(duplicates.alreadyProcessed,true);
 const notifications=await parallel(db=>claimTursoNotification(db,{orderId,kind}));
 const sendCount=notifications.filter(r=>r.status==='fulfilled'&&r.value.send).length;
 const noteErrors=notifications.filter(r=>r.status==='rejected').length;
 assert.equal(sendCount,1);assert.equal(noteErrors,0);
 assert.equal(await markTursoNotificationSent(root,{orderId,kind,providerMessageId:prefix+'_provider_ack'}),true);
 const noResend=await claimTursoNotification(root,{orderId,kind});
 assert.equal(noResend.alreadySent,true);assert.equal(noResend.send,false);
 console.log(JSON.stringify({test:'REAL_REMOTE_TURSO_EVENT_OUTBOX',webhookClaims:processCount,
  webhookFailures:webhookErrors,staffSendsAuthorized:sendCount,notificationFailures:noteErrors,
  alreadyProcessed:true,providerMessageAckRecorded:true,noDuplicateSend:true,
  actualSquareWebhook:false,actualEmailProviderDelivery:false}));
}catch(e){console.error(JSON.stringify({test:'REMOTE_EVENT_CERT_FAILED',reason:String(e.message||e).slice(0,270)}));process.exitCode=1}
finally{
 try{
  await root.run('DELETE FROM checkout_notification_outbox WHERE order_id=?',orderId);
  await root.run('DELETE FROM webhook_events WHERE event_id=?',eventId);
  await root.run('DELETE FROM orders WHERE id=?',orderId);
  console.log(JSON.stringify({fixtureCleanup:'PASS'}));
 }catch(e){console.error(JSON.stringify({fixtureCleanup:'FAIL',reason:String(e.message||e).slice(0,190)}));process.exitCode=1}
 await root.close();
}
