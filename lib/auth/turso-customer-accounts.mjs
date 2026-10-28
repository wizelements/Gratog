import {createHash, randomBytes, randomUUID} from 'node:crypto';

export class TursoCustomerRefusal extends Error {
  constructor(code, status=503) {super(code);this.name='TursoCustomerRefusal';this.status=status;}
}
const fail=(code,status)=>{throw new TursoCustomerRefusal(code,status)};
const stamp=()=>new Date().toISOString();
const digest=value=>createHash('sha256').update(value).digest('hex');
const safeKey=value=>typeof value==='string' && value.length>0 && value.length<=250 && !/[\x00-\x1f]/.test(value);
const email=value=>typeof value==='string'?value.trim().toLowerCase():'';
function changed(result) {
  const n=typeof result?.changes==='bigint'?Number(result.changes):result?.changes;
  if(!Number.isSafeInteger(n)||n<0)fail('CUSTOMER_WRITE_CONFIRMATION_MISSING');
  return n;
}
function decode(value) {
  try {
    const result=JSON.parse(value);
    if(result && typeof result==='object' && !Array.isArray(result))return result;
  }catch{}
  fail('CUSTOMER_RECORD_INVALID');
}
function project(row, includeHash=false) {
  if(!row)return null;
  if(!safeKey(row.id)||!safeKey(row.user_id)||!email(row.email))fail('CUSTOMER_IDENTITY_INVALID');
  if(Number(row.active)!==1)return null;
  if(includeHash&&(typeof row.password_hash!=='string'||!/^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$/.test(row.password_hash)))return null;
  return {id:row.user_id,name:row.name,email:row.email,phone:row.phone,avatar:row.avatar,
    joinedAt:row.joined_at,createdAt:row.created_at,updatedAt:row.updated_at,
    ...(includeHash?{passwordHash:row.password_hash}: {})};
}
async function accountById(db,id) {
  if(!safeKey(id))return null;
  const rows=await db.all('SELECT * FROM customer_accounts WHERE user_id=? OR id=? LIMIT 2',id,id);
  if(!Array.isArray(rows)||rows.length>1)fail('CUSTOMER_IDENTITY_AMBIGUOUS');
  return rows[0]||null;
}
export async function findTursoCustomerById(db,id) {return project(await accountById(db,id));}
export async function findTursoCustomerByEmail(db,value) {
  return project(await db.get('SELECT * FROM customer_accounts WHERE email=?',email(value)),true);
}
async function immediate(db,fn) {
  if(typeof db?.transactionAsync!=='function')fail('CUSTOMER_TRANSACTION_REQUIRED');
  const operation=db.transactionAsync(fn);
  if(typeof operation?.immediate!=='function')fail('CUSTOMER_IMMEDIATE_TRANSACTION_REQUIRED');
  return operation.immediate();
}
export async function createTursoCustomerAccount(db,data) {
  const normalized=email(data?.email);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)||normalized.length>254||
    typeof data.name!=='string'||!data.name.trim()||typeof data.passwordHash!=='string'||
    !/^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$/.test(data.passwordHash))fail('CUSTOMER_ACCOUNT_INVALID',400);
  return immediate(db,async tx=>{
    if(await tx.get('SELECT id FROM customer_accounts WHERE email=?',normalized))throw Error('Email already registered');
    const id=randomUUID(),at=stamp();
    // New, unverified signups never acquire a guest customer_id by matching email.
    changed(await tx.run('INSERT INTO customer_accounts(id,user_id,email,name,phone,avatar,password_hash,active,joined_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,?,?,?)',
      id,id,normalized,data.name.trim(),data.phone||null,data.avatar||null,data.passwordHash,at,at,at));
    return project(await tx.get('SELECT * FROM customer_accounts WHERE id=?',id));
  });
}
export async function updateTursoCustomerAccount(db,id,patch) {
  return immediate(db,async tx=>{
    const row=await accountById(tx,id);
    if(!project(row))return null;
    const allowed=['name','phone','avatar'];
    const updates=Object.fromEntries(Object.entries(patch||{}).filter(([key])=>allowed.includes(key)));
    for(const [key,value] of Object.entries(updates)) {
      if(value!==null && (typeof value!=='string'||value.length>(key==='avatar'?2048:100)))fail('CUSTOMER_PROFILE_INVALID',400);
    }
    if('name' in updates && (typeof updates.name!=='string'||updates.name.trim().length<2))fail('CUSTOMER_PROFILE_INVALID',400);
    if(Object.keys(updates).length) {
      const keys=Object.keys(updates);
      if(changed(await tx.run('UPDATE customer_accounts SET '+keys.map(k=>k+'=?').join(',')+',updated_at=? WHERE id=? AND active=1',
        ...keys.map(k=>updates[k]),stamp(),row.id))!==1)fail('CUSTOMER_PROFILE_UPDATE_CONFLICT');
    }
    return project(await tx.get('SELECT * FROM customer_accounts WHERE id=?',row.id));
  });
}
export async function createTursoCustomerSession(db,id,expectedEmail,expectedHash) {
  return immediate(db,async tx=>{
    const row=await accountById(tx,id);
    if(!project(row)||email(expectedEmail)!==row.email||
      typeof expectedHash!=='string'||row.password_hash!==expectedHash)fail('CUSTOMER_SESSION_DENIED',401);
    const sid=randomBytes(32).toString('hex'),at=stamp(),expires=new Date(Date.now()+7*86400000).toISOString();
    if(changed(await tx.run('INSERT INTO customer_sessions(token_hash,account_id,auth_version,expires_at,created_at) VALUES(?,?,?,?,?)',
      digest(sid),row.id,Number(row.auth_version),expires,at))!==1)fail('CUSTOMER_SESSION_NOT_PERSISTED');
    return {userId:row.user_id,email:row.email,sub:row.id,sid,sv:Number(row.auth_version)};
  });
}
export async function verifyTursoCustomerSession(db,claim,now=stamp()) {
  if(!claim||typeof claim.sid!=='string'||!/^([a-f0-9]{64})$/.test(claim.sid)||
    !safeKey(claim.sub)||!safeKey(claim.userId)||!Number.isSafeInteger(claim.sv))return null;
  const row=await db.get('SELECT a.*,s.auth_version AS session_version,s.expires_at,s.revoked_at FROM customer_sessions s JOIN customer_accounts a ON a.id=s.account_id WHERE s.token_hash=?',digest(claim.sid));
  if(!row||Number(row.active)!==1||row.revoked_at||row.expires_at<=now||
    row.id!==claim.sub||row.user_id!==claim.userId||row.email!==claim.email||
    Number(row.auth_version)!==claim.sv||Number(row.session_version)!==claim.sv)return null;
  return {...claim,userId:row.user_id,email:row.email};
}
export async function revokeTursoCustomerSession(db,claim) {
  if(typeof claim?.sid!=='string'||!/^([a-f0-9]{64})$/.test(claim.sid))return;
  changed(await db.run('UPDATE customer_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL',stamp(),digest(claim.sid)));
}
export async function createTursoPasswordReset(db,id,tokenHash,expiresAt) {
  if(!/^[a-f0-9]{64}$/.test(tokenHash)||!Number.isFinite(Date.parse(expiresAt)))fail('PASSWORD_RESET_INVALID',400);
  return immediate(db,async tx=>{
    const row=await accountById(tx,id);
    if(!project(row))return false;
    await tx.run('UPDATE customer_password_resets SET consumed_at=? WHERE account_id=? AND consumed_at IS NULL',stamp(),row.id);
    if(changed(await tx.run('INSERT INTO customer_password_resets(token_hash,account_id,auth_version,expires_at,created_at) VALUES(?,?,?,?,?)',
      tokenHash,row.id,Number(row.auth_version),expiresAt,stamp()))!==1)fail('PASSWORD_RESET_NOT_PERSISTED');
    // The isolated Preview mails only Resend's explicit QA test recipient.
    // Record its provider attempt in the same transaction as the reset token.
    if(row.email==='delivered@resend.dev'){
      if(changed(await tx.run("INSERT INTO customer_password_reset_delivery(token_hash,account_id,recipient_email,status,created_at,updated_at) VALUES(?,?,?,'pending',?,?)",
        tokenHash,row.id,row.email,stamp(),stamp()))!==1)fail('PASSWORD_RESET_DELIVERY_NOT_PERSISTED');
    }
    return true;
  });
}
export async function consumeTursoPasswordReset(db,tokenHash,passwordHash,now=stamp()) {
  if(!/^[a-f0-9]{64}$/.test(tokenHash)||typeof passwordHash!=='string'||!/^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$/.test(passwordHash))return false;
  return immediate(db,async tx=>{
    const reset=await tx.get('SELECT r.*,a.active,a.auth_version AS current_version FROM customer_password_resets r JOIN customer_accounts a ON a.id=r.account_id WHERE r.token_hash=? AND r.consumed_at IS NULL AND r.expires_at>?',tokenHash,now);
    if(!reset||Number(reset.active)!==1||Number(reset.auth_version)!==Number(reset.current_version))return false;
    if(changed(await tx.run('UPDATE customer_password_resets SET consumed_at=? WHERE token_hash=? AND consumed_at IS NULL',now,tokenHash))!==1)fail('PASSWORD_RESET_CONSUMPTION_CONFLICT');
    if(changed(await tx.run('UPDATE customer_accounts SET password_hash=?,updated_at=? WHERE id=? AND active=1 AND auth_version=?',
      passwordHash,now,reset.account_id,Number(reset.auth_version)))!==1)fail('PASSWORD_RESET_ACCOUNT_CONFLICT');
    await tx.run('UPDATE customer_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL',now,reset.account_id);
    await tx.run('UPDATE customer_password_resets SET consumed_at=? WHERE account_id=? AND consumed_at IS NULL',now,reset.account_id);
    return true;
  });
}

/** Customer history authorization uses explicit immutable ownership, never email. */
export async function listTursoCustomerOrders(db,id,limit=50) {
  const account=await accountById(db,id);
  if(!project(account))fail('CUSTOMER_ACCOUNT_UNAVAILABLE',401);
  if(!Number.isSafeInteger(limit)||limit<1||limit>500)fail('CUSTOMER_ORDER_LIMIT_INVALID',400);
  const rows=await db.all('SELECT * FROM orders WHERE '+
    '(customer_id IS NOT NULL AND customer_id=?) OR '+
    '(legacy_snapshot_json IS NOT NULL AND (json_extract(legacy_snapshot_json,\'$.userId\')=? OR json_extract(legacy_snapshot_json,\'$.userId\')=?)) '+
    'ORDER BY created_at DESC,id DESC LIMIT ?',account.customer_id,account.user_id,account.id,limit);
  const result=[];
  for(const row of rows) {
    const total=Number(row.total_cents);
    if(!Number.isSafeInteger(total)||total<0||row.currency!=='USD')fail('CUSTOMER_ORDER_MONEY_INVALID');
    const lines=await db.all('SELECT * FROM order_items WHERE order_id=? ORDER BY position',row.id);
    const items=lines.map(line=>{
      const cents=line.unit_price_cents==null?null:Number(line.unit_price_cents);
      const qty=Number(line.quantity);
      if(!Number.isSafeInteger(qty)||qty<1||(cents!==null&&(!Number.isSafeInteger(cents)||cents<0)))fail('CUSTOMER_ORDER_ITEM_INVALID');
      return {productId:line.product_id||line.external_catalog_id,name:line.name_snapshot,quantity:qty,price:cents===null?null:cents/100};
    });
    result.push({id:row.id,orderNumber:row.order_number,status:row.status,paymentStatus:row.payment_status,
      items,total:total/100,fulfillment:row.fulfillment_json==null?null:decode(row.fulfillment_json),createdAt:row.created_at});
  }
  return result;
}

const ownership="((o.customer_id IS NOT NULL AND o.customer_id=?) OR "+
  "(o.legacy_snapshot_json IS NOT NULL AND (json_extract(o.legacy_snapshot_json,'$.userId')=? OR "+
  "json_extract(o.legacy_snapshot_json,'$.userId')=?)))";
export async function getTursoCustomerStats(db,id){
  const account=await accountById(db,id);
  if(!project(account))fail('CUSTOMER_ACCOUNT_UNAVAILABLE',401);
  const count=await db.get('SELECT count(*) AS n FROM orders o WHERE '+ownership,
    account.customer_id,account.user_id,account.id);
  const rewards=await readTursoAccountRecord(db,'rewards',id);
  const challenge=await readTursoAccountRecord(db,'challenges',id);
  const stats={totalOrders:Number(count.n),rewardPoints:rewards?.points??0,streakDays:challenge?.streakDays??0};
  if(Object.values(stats).some(n=>!Number.isSafeInteger(n)||n<0))fail('CUSTOMER_STATS_INVALID');
  return stats;
}
export async function getTursoCustomerFavorites(db,id){
  const account=await accountById(db,id);
  if(!project(account))fail('CUSTOMER_ACCOUNT_UNAVAILABLE',401);
  const rows=await db.all('SELECT coalesce(i.product_id,i.external_catalog_id,i.name_snapshot) AS productId,'+
    'i.name_snapshot AS name,sum(i.quantity) AS totalOrdered FROM order_items i '+
    'JOIN orders o ON o.id=i.order_id WHERE '+ownership+
    ' GROUP BY coalesce(i.product_id,i.external_catalog_id,i.name_snapshot),i.name_snapshot '+
    'ORDER BY totalOrdered DESC,productId LIMIT 10',account.customer_id,account.user_id,account.id);
  if(rows.some(row=>!Number.isSafeInteger(row.totalOrdered)||row.totalOrdered<1))fail('CUSTOMER_FAVORITES_INVALID');
  // Historical order amounts do not advertise a current product selling price.
  return rows;
}

export async function readTursoAccountRecord(db,collection,id) {
  if(!['rewards','challenges','user_preferences'].includes(collection))fail('CUSTOMER_RECORD_COLLECTION_INVALID');
  const account=await accountById(db,id);
  if(!project(account))fail('CUSTOMER_ACCOUNT_UNAVAILABLE',401);
  const rows=await db.all('SELECT payload_json FROM operational_records WHERE source_collection=? AND json_extract(payload_json,\'$.userId\')=? LIMIT 2',collection,account.user_id);
  if(rows.length>1)fail('CUSTOMER_RECORD_AMBIGUOUS');
  return rows.length?decode(rows[0].payload_json):null;
}
export async function initializeTursoAccountRecord(db,collection,id) {
  if(!['rewards','challenges'].includes(collection))fail('CUSTOMER_RECORD_COLLECTION_INVALID');
  return immediate(db,async tx=>{
    const existing=await readTursoAccountRecord(tx,collection,id);
    if(existing)return existing;
    const at=stamp();
    const payload={id:randomUUID(),userId:id,createdAt:at,updatedAt:at,...(collection==='rewards'
      ?{points:0,lifetimePoints:0,history:[]}:{streakDays:0,lastCheckIn:null,totalCheckIns:0})};
    await tx.run('INSERT INTO operational_records(source_collection,source_id,occurred_at,status,payload_json,canonical_fingerprint) VALUES(?,?,?,?,?,?)',
      collection,payload.id,at,null,JSON.stringify(payload),digest(JSON.stringify(payload)));
    return payload;
  });
}
const DEFAULT_PREFS={marketing:true,orderUpdates:true,rewards:true,challenges:true};
export async function readTursoEmailPreferences(db,id) {
  const account=await accountById(db,id);
  if(!project(account))fail('CUSTOMER_ACCOUNT_UNAVAILABLE',401);
  const row=await db.get('SELECT preferences_json FROM customer_account_preferences WHERE account_id=?',account.id);
  const legacy=row?null:await readTursoAccountRecord(db,'user_preferences',id);
  const data=row?decode(row.preferences_json):(legacy||{});
  return Object.fromEntries(Object.entries(DEFAULT_PREFS).map(([key,value])=>[key,typeof data[key]==='boolean'?data[key]:value]));
}
export async function updateTursoEmailPreferences(db,id,patch) {
  if(!patch||typeof patch!=='object'||Array.isArray(patch))fail('CUSTOMER_PREFERENCES_INVALID',400);
  for(const [key,value] of Object.entries(patch))if(!(key in DEFAULT_PREFS)||typeof value!=='boolean')fail('CUSTOMER_PREFERENCES_INVALID',400);
  return immediate(db,async tx=>{
    const account=await accountById(tx,id);
    if(!project(account))fail('CUSTOMER_ACCOUNT_UNAVAILABLE',401);
    const next={...await readTursoEmailPreferences(tx,id),...patch};
    if(changed(await tx.run('INSERT INTO customer_account_preferences(account_id,preferences_json,updated_at) VALUES(?,?,?) ON CONFLICT(account_id) DO UPDATE SET preferences_json=excluded.preferences_json,updated_at=excluded.updated_at',account.id,JSON.stringify(next),stamp()))!==1)fail('CUSTOMER_PREFERENCES_NOT_SAVED');
    return next;
  });
}

// One transaction contains the daily check-in and earned reward. No half credit.
const localDay=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function canTursoCheckIn(challenge,now=stamp()) {
  return !challenge?.lastCheckIn||localDay(challenge.lastCheckIn)<localDay(now);
}
export async function checkInTursoCustomer(db,id,now=stamp()) {
  return immediate(db,async tx=>{
    const account=await accountById(tx,id);
    if(!project(account))fail('CUSTOMER_ACCOUNT_UNAVAILABLE',401);
    const challenge=await readTursoAccountRecord(tx,'challenges',id)||{id:randomUUID(),userId:id,createdAt:now,streakDays:0,totalCheckIns:0};
    if(!canTursoCheckIn(challenge,now))fail('Already checked in today',400);
    const lastDay=challenge.lastCheckIn?localDay(challenge.lastCheckIn):null;
    const yesterday=new Date(localDay(now)+'T12:00:00Z');yesterday.setUTCDate(yesterday.getUTCDate()-1);
    const streak=lastDay===yesterday.toISOString().slice(0,10)?Number(challenge.streakDays||0)+1:1;
    if(!Number.isSafeInteger(streak)||streak<1)fail('CUSTOMER_CHALLENGE_INVALID');
    const bonus={3:10,7:50,14:100,30:200}[streak]||0,points=5+bonus;
    const milestone=bonus?streak+' Day Streak!':null;
    const rewards=await readTursoAccountRecord(tx,'rewards',id)||{id:randomUUID(),userId:id,createdAt:now,points:0,lifetimePoints:0,history:[]};
    if(!Number.isSafeInteger(rewards.points)||!Number.isSafeInteger(rewards.lifetimePoints)||!Array.isArray(rewards.history))fail('CUSTOMER_REWARDS_INVALID');
    const nextChallenge={...challenge,streakDays:streak,lastCheckIn:now,totalCheckIns:Number(challenge.totalCheckIns||0)+1,updatedAt:now};
    const nextRewards={...rewards,points:rewards.points+points,lifetimePoints:rewards.lifetimePoints+points,updatedAt:now,
      history:[...rewards.history,{type:'check_in',points,description:milestone?'Daily check-in + '+milestone:'Daily check-in',createdAt:now}]};
    for(const [collection,payload] of [['challenges',nextChallenge],['rewards',nextRewards]]) {
      const old=await tx.get('SELECT source_id FROM operational_records WHERE source_collection=? AND json_extract(payload_json,\'$.userId\')=?',collection,id);
      const json=JSON.stringify(payload);
      if(changed(await tx.run('INSERT INTO operational_records(source_collection,source_id,occurred_at,status,payload_json,canonical_fingerprint) VALUES(?,?,?,?,?,?) ON CONFLICT(source_collection,source_id) DO UPDATE SET occurred_at=excluded.occurred_at,payload_json=excluded.payload_json,canonical_fingerprint=excluded.canonical_fingerprint',
        collection,old?.source_id||payload.id,now,null,json,digest(json)))!==1)fail('CUSTOMER_CHECKIN_NOT_SAVED');
    }
    return {pointsEarned:points,milestoneReached:milestone,streak};
  });
}
