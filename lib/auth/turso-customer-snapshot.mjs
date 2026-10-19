/**
 * Fail-closed account reads from the already-migrated users snapshot.
 * No Mongo fallback, token signing, email disclosure or password-hash output.
 * This is a Preview-only migration bridge; it does not authorize cutover.
 */
export class TursoCustomerIdentityError extends Error {
  constructor(code) { super(code); this.name='TursoCustomerIdentityError'; }
}
const validEmail=x=>typeof x==='string'&&x.trim().length>0&&x.trim().length<=254&&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.trim());
const cleanEmail=x=>validEmail(x)?x.trim().toLowerCase():null;
const validReference=x=>typeof x==='string'&&x.length>0&&x.length<=250&&
  !/[\x00-\x1f]/.test(x);
const isRevoked=x=>x.isActive===false||x.active===false||x.disabled===true||
  x.deleted===true||x.status==='disabled'||x.status==='revoked';
const safeUser=(doc,sourceId)=>{
  const id=validReference(doc.id)?doc.id:sourceId;
  if(!validReference(id)||!cleanEmail(doc.email)||isRevoked(doc))return null;
  return {id,email:cleanEmail(doc.email),name:typeof doc.name==='string'?doc.name:'',
    phone:typeof doc.phone==='string'?doc.phone:null,
    joinedAt:doc.joinedAt||doc.createdAt||null};
};
async function readUnique(db,sql,reference){
  const rows=await db.all(sql,reference);
  if(!Array.isArray(rows)||rows.length>1)
    throw new TursoCustomerIdentityError('TURSO_CUSTOMER_AMBIGUOUS');
  if(!rows.length)return null;
  let doc;
  try {doc=JSON.parse(rows[0].payload_json);}
  catch {throw new TursoCustomerIdentityError('TURSO_CUSTOMER_SNAPSHOT_INVALID');}
  if(!doc||typeof doc!=='object'||Array.isArray(doc))
    throw new TursoCustomerIdentityError('TURSO_CUSTOMER_SNAPSHOT_INVALID');
  return {doc,sourceId:rows[0].source_id};
}
const byEmail="SELECT source_id,payload_json FROM operational_records "+
  "WHERE source_collection='users' AND lower(trim(json_extract(payload_json,'$.email')))=? LIMIT 2";
const byId="SELECT source_id,payload_json FROM operational_records "+
  "WHERE source_collection='users' AND (source_id=? OR json_extract(payload_json,'$.id')=?) LIMIT 2";
/** Caller must verify bcrypt password before signing JWT. */
export async function getTursoCustomerForLogin(db,email){
  const normalized=cleanEmail(email);
  if(!normalized)return null;
  const record=await readUnique(db,byEmail,normalized);
  if(!record)return null;
  const user=safeUser(record.doc,record.sourceId);
  const hash=record.doc.passwordHash;
  if(!user||user.email!==normalized ||
    typeof hash!=='string'||!(/^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$/.test(hash)))
    return null;
  return {...user,passwordHash:hash};
}
/** Use ONLY after JWT cryptographic verification, never a bare cookie ID. */
export async function getTursoCustomerSession(db,claim){
  if(!claim||!validReference(claim.userId)||!cleanEmail(claim.email))
    return null;
  const rows=await db.all(byId,claim.userId,claim.userId);
  if(!Array.isArray(rows)||rows.length>1)
    throw new TursoCustomerIdentityError('TURSO_CUSTOMER_AMBIGUOUS');
  if(!rows.length)return null;
  let doc;
  try{doc=JSON.parse(rows[0].payload_json)}
  catch{throw new TursoCustomerIdentityError('TURSO_CUSTOMER_SNAPSHOT_INVALID')}
  const user=doc&&typeof doc==='object'&&!Array.isArray(doc)?
    safeUser(doc,rows[0].source_id):null;
  if(!user||user.id!==claim.userId||user.email!==cleanEmail(claim.email))return null;
  return user;
}
