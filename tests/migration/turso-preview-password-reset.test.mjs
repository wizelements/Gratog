import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createTursoPasswordReset} from '../../lib/auth/turso-customer-accounts.mjs';
import {deliverTursoPreviewReset,isTursoPreviewResetRecipient,trustedTursoPreviewResetBaseUrl} from '../../lib/auth/turso-preview-password-reset.mjs';
const BASE='https://gratog-demo12345-theangelsilvers-projects.vercel.app';
function fixture(){
 const raw=new DatabaseSync(':memory:');raw.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync('db/migrations').filter(n=>n.endsWith('.sql')).sort())raw.exec(readFileSync('db/migrations/'+file,'utf8'));
 raw.prepare("INSERT INTO customer_accounts(id,user_id,email,name,password_hash,active,joined_at,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?,?)").run('qa1','qa1','delivered@resend.dev','Test Buyer','$2a$12$'+'a'.repeat(53),'2026-10-19','2026-10-19','2026-10-19');
 const db={get:async(sql,...p)=>raw.prepare(sql).get(...p),all:async(sql,...p)=>raw.prepare(sql).all(...p),run:async(sql,...p)=>raw.prepare(sql).run(...p)};
 db.transactionAsync=fn=>({immediate:()=>fn(db)});
 return{db,raw};
}
test('public reset origin and recipient validation refuses real buyers and forged hosts',()=>{
 assert.equal(isTursoPreviewResetRecipient('delivered@resend.dev'),true);
 assert.equal(isTursoPreviewResetRecipient('test@gmail.com'),false);
 assert.equal(isTursoPreviewResetRecipient('DELIVERED@RESEND.DEV '),true);
 assert.equal(trustedTursoPreviewResetBaseUrl({VERCEL_ENV:'preview',VERCEL_URL:BASE.slice(8)}),BASE);
 for(const env of [
  {VERCEL_ENV:'production',VERCEL_URL:BASE.slice(8)},
  {VERCEL_ENV:'preview',VERCEL_URL:'tasteofgratitude.shop'},
  {VERCEL_ENV:'preview',VERCEL_URL:'evil-example.vercel.app'},
 ])assert.throws(()=>trustedTursoPreviewResetBaseUrl(env),/UNVERIFIED/);
});
test('one-time QA password reset records provider acceptance in Turso without Mongo',async()=>{
 const f=fixture();try{
  const token='a'.repeat(64),hash=createHash('sha256').update(token).digest('hex');
  assert.equal(await createTursoPasswordReset(f.db,'qa1',hash,'2099-01-01T00:00:00Z'),true);
  assert.equal((await f.db.get('SELECT status FROM customer_password_reset_delivery WHERE token_hash=?',hash)).status,'pending');
  await assert.rejects(deliverTursoPreviewReset(f.db,{user:{id:'another-user',email:'delivered@resend.dev'},token,baseUrl:BASE,send:async()=>{throw Error('must not send')}}),/UNAVAILABLE/);
  let received;
  const result=await deliverTursoPreviewReset(f.db,{user:{id:'qa1',email:'delivered@resend.dev'},token,baseUrl:BASE,
   send:async payload=>{received=payload;return{data:{id:'resend-qa-123'}}}});
  assert.deepEqual(result,{providerAccepted:true,providerDelivered:false});
  assert.deepEqual(received.to,['delivered@resend.dev']);
  assert.ok(received.html.includes(BASE+'/reset-password?token='+token));
  const recorded=await f.db.get('SELECT status,provider_message_id FROM customer_password_reset_delivery WHERE token_hash=?',hash);
  assert.equal(recorded.status,'accepted');assert.equal(recorded.provider_message_id,'resend-qa-123');
  await assert.rejects(deliverTursoPreviewReset(f.db,{user:{id:'qa1',email:'delivered@resend.dev'},token,baseUrl:BASE,send:async()=>{throw Error('sent twice')}}),/UNAVAILABLE/);
 }finally{f.raw.close()}
});
test('provider failure or missing ack is recorded as reconciliation-needed, never delivered',async()=>{
 for(const send of [async()=>{throw Error('timeout')},async()=>({data:{}})]){
  const f=fixture();try{
   const token='b'.repeat(64),hash=createHash('sha256').update(token).digest('hex');
   await createTursoPasswordReset(f.db,'qa1',hash,'2099-01-01T00:00:00Z');
   await assert.rejects(deliverTursoPreviewReset(f.db,{user:{id:'qa1',email:'delivered@resend.dev'},token,baseUrl:BASE,send}),/UNVERIFIED|MISSING/);
   assert.equal((await f.db.get('SELECT status FROM customer_password_reset_delivery WHERE token_hash=?',hash)).status,'needs_reconciliation');
  }finally{f.raw.close()}
 }
});
test('unsafe recipients or public production URL cannot trigger provider transport',async()=>{
 const f=fixture();try{
  let calls=0;const send=async()=>{calls++;return{data:{id:'sent'}}};
  for(const request of [{user:{id:'qa1',email:'real@gmail.com'},baseUrl:BASE},
   {user:{id:'qa1',email:'delivered@resend.dev'},baseUrl:'https://tasteofgratitude.shop'}])
   await assert.rejects(deliverTursoPreviewReset(f.db,{...request,token:'f'.repeat(64),send}),/DENIED/);
  assert.equal(calls,0);
 }finally{f.raw.close()}
});
test('forgot password route selects Turso identity without Mongo fallback and suppresses live email',()=>{
 const source=readFileSync('app/api/auth/forgot-password/route.ts','utf8');
 assert.ok(source.includes('isTursoPreviewResetRecipient(normalizedEmail)'));
 assert.ok(source.includes('findTursoCustomerByEmail(tursoDb,normalizedEmail)'));
 assert.ok(source.includes('deliverTursoPreviewReset(tursoDb'));
 assert.ok(source.includes("await import('@/lib/db/users')"));
 assert.ok(!source.includes('const user = await findUserByEmail(normalizedEmail)'));
});
