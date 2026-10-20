import {createHash} from 'node:crypto';
import {isActiveAdminRecord,isSessionVersion} from './admin-session-policy.mjs';
import {persistTursoAdminAudit} from './turso-admin-audit.mjs';

const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const fingerprint=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export const adminCredentialFingerprint=doc=>fingerprint({password:doc.password??null,passwordHash:doc.passwordHash??null});
export class TursoAdminLoginError extends Error {
  constructor(code){super(code);this.name='TursoAdminLoginError';this.code=code;}
}
const reject=code=>{throw new TursoAdminLoginError(code)};
function credentials(row){
  if(!row||row.is_active!==1||!['admin','super_admin'].includes(row.role)||!isSessionVersion(row.session_version))return null;
  let doc;try{doc=JSON.parse(row.payload_json)}catch{reject('ADMIN_CREDENTIAL_RECORD_INVALID')}
  if(!isActiveAdminRecord(doc)||typeof doc.passwordHash!=='string'||!/^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$/.test(doc.passwordHash))return null;
  if(String(doc._id)!==row.id||String(doc.email).trim().toLowerCase()!==row.email||
    adminCredentialFingerprint(doc)!==row.credential_fingerprint)reject('ADMIN_CREDENTIAL_IDENTITY_MISMATCH');
  return {...doc,_id:row.id,id:row.id,email:row.email,role:row.role,tokenVersion:row.session_version,
    passwordHash:doc.passwordHash,credentialFingerprint:row.credential_fingerprint};
}
const select='SELECT a.*,o.payload_json FROM admin_identities a JOIN operational_records o '+
  "ON o.source_collection='admin_users' AND o.source_id=a.id ";
export async function findTursoAdminCredentials(db,email){
  if(typeof email!=='string'||!email.trim())return null;
  return credentials(await db.get(select+'WHERE a.email=?',email.trim().toLowerCase()));
}
/** Only call after bcrypt verification. The exact password and security epoch
 * are checked again under the same write transaction as the login receipt. */
export async function establishTursoAdminLogin(db,verified,{ip='unknown',userAgent='unknown'}={}){
  if(!verified||typeof db?.transactionAsync!=='function')reject('ADMIN_LOGIN_TRANSACTION_REQUIRED');
  const operation=db.transactionAsync(async tx=>{
    const row=await tx.get(select+'WHERE a.id=?',verified.id);
    const current=credentials(row);
    if(!current||current.email!==verified.email||current.role!==verified.role||
      current.tokenVersion!==verified.tokenVersion||current.passwordHash!==verified.passwordHash||
      current.credentialFingerprint!==verified.credentialFingerprint)reject('ADMIN_LOGIN_STATE_CHANGED');
    const at=new Date().toISOString(),doc=JSON.parse(row.payload_json);
    const payload=JSON.stringify({...doc,lastLogin:at});
    const result=await tx.run('UPDATE operational_records SET payload_json=?,canonical_fingerprint=? '+
      "WHERE source_collection='admin_users' AND source_id=? AND payload_json=?",
      payload,fingerprint(JSON.parse(payload)),row.id,row.payload_json);
    if(result?.changes!==1)reject('ADMIN_LOGIN_WRITE_UNCONFIRMED');
    await persistTursoAdminAudit(tx,{timestamp:at,adminId:current.id,adminEmail:current.email,
      action:'LOGIN_SUCCESS',resource:'auth',details:{ip,userAgent},ipAddress:ip,userAgent,success:true});
    return current;
  });
  if(typeof operation?.immediate!=='function')reject('ADMIN_LOGIN_TRANSACTION_REQUIRED');
  return operation.immediate();
}
