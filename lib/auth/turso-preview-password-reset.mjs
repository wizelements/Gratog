/** Customer password recovery for explicitly isolated QA Preview only.
 * Never use a request Host header, production URL or a real buyer recipient. */
import {createHash} from 'node:crypto';
const QA='delivered@resend.dev';
export const isTursoPreviewResetRecipient=email=>typeof email==='string' &&
  email.trim().toLowerCase()===QA;
export function trustedTursoPreviewResetBaseUrl(env=process.env){
  const host=env.VERCEL_URL||'';
  if(env.VERCEL_ENV!=='preview'||
     !/^gratog-[a-z0-9]{8,}-theangelsilvers-projects\.vercel\.app$/.test(host))
    throw Error('TURSO_PREVIEW_RESET_ORIGIN_UNVERIFIED');
  return 'https://'+host;
}
const statusChanges=r=>typeof r?.changes==='bigint'?Number(r.changes):r?.changes;
export async function deliverTursoPreviewReset(db,{user,token,baseUrl,send=undefined}){
  if(!isTursoPreviewResetRecipient(user?.email)||typeof user?.id!=='string'||
    typeof token!=='string'||!(/^[a-f0-9]{64}$/.test(token))||
    !/^https:\/\/gratog-[a-z0-9]{8,}-theangelsilvers-projects\.vercel\.app$/.test(baseUrl))
    throw Error('TURSO_PREVIEW_RESET_SEND_DENIED');
  const hash=createHash('sha256').update(token).digest('hex');
  const row=await db.get('SELECT d.status,d.recipient_email,a.user_id FROM customer_password_reset_delivery d '+
    'JOIN customer_accounts a ON a.id=d.account_id WHERE d.token_hash=?',hash);
  if(row?.status!=='pending'||row.recipient_email!==QA||row.user_id!==user.id)
    throw Error('TURSO_PREVIEW_RESET_RECEIPT_UNAVAILABLE');
  const deliver=send||(async payload=>{
    const [{default:resend},{getFromAddress}]=await Promise.all([
      import('../email/resend-client.js'),import('../email-config.js')]);
    if(!resend)throw Error('RESEND_STAGING_CREDENTIAL_MISSING');
    const response=await resend.emails.send({from:process.env.RESEND_FROM_EMAIL||getFromAddress('password'),...payload});
    if(response?.error)throw Error('RESEND_STAGING_DELIVERY_NOT_ACCEPTED');
    return response;
  });
  // QA-only address and immutable deployment link, not NEXT_PUBLIC_BASE_URL.
  const resetLink=baseUrl+'/reset-password?token='+encodeURIComponent(token);
  let response;
  try{
    response=await deliver({to:[QA],subject:'Taste of Gratitude — Preview password reset',
      html:'<p>QA-only password reset</p><p><a href="'+resetLink+'">Reset password</a></p>'});
  }catch{
    await db.run("UPDATE customer_password_reset_delivery SET status='needs_reconciliation',updated_at=? WHERE token_hash=? AND status='pending'",new Date().toISOString(),hash);
    throw Error('TURSO_PREVIEW_RESET_DELIVERY_UNVERIFIED');
  }
  const providerId=response?.data?.id||response?.id;
  if(typeof providerId!=='string'||providerId.length<3||providerId.length>250){
    await db.run("UPDATE customer_password_reset_delivery SET status='needs_reconciliation',updated_at=? WHERE token_hash=? AND status='pending'",new Date().toISOString(),hash);
    throw Error('TURSO_PREVIEW_RESET_PROVIDER_ACK_MISSING');
  }
  const changed=await db.run("UPDATE customer_password_reset_delivery SET status='accepted',provider_message_id=?,updated_at=? WHERE token_hash=? AND status='pending'",providerId,new Date().toISOString(),hash);
  if(statusChanges(changed)!==1)throw Error('TURSO_PREVIEW_RESET_RECEIPT_CONFLICT');
  return {providerAccepted:true,providerDelivered:false};
}
