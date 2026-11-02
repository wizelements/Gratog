import {randomUUID,createHash} from 'node:crypto';

export async function persistTursoAdminAudit(db,entry,collection='audit_logs') {
  if (!['audit_logs','audit_log'].includes(collection)) throw Error('ADMIN_AUDIT_COLLECTION_INVALID');
  const payload=JSON.stringify(entry);
  const result=await db.run('INSERT INTO operational_records '+
    '(source_collection,source_id,occurred_at,status,payload_json,canonical_fingerprint) VALUES (?,?,?,?,?,?)',
    collection,randomUUID(),new Date(entry.timestamp??Date.now()).toISOString(),
    entry.success===false?'failed':'completed',payload,createHash('sha256').update(payload).digest('hex'));
  if(!Number.isSafeInteger(result?.changes)||result.changes!==1)throw Error('ADMIN_AUDIT_WRITE_UNCONFIRMED');
}

export async function readTursoAdminAudit(db,filters={},pagination={},collection='audit_logs') {
  if (!['audit_logs','audit_log'].includes(collection)) throw Error('ADMIN_AUDIT_COLLECTION_INVALID');
  const limit=Math.min(100,Math.max(1,Number(pagination.limit)||50));
  const page=Math.max(1,Number(pagination.page)||1);
  if(!Number.isInteger(limit)||!Number.isInteger(page))throw Error('ADMIN_AUDIT_PAGINATION_INVALID');
  const conditions=['source_collection=?'],args=[collection];
  for(const key of ['adminId','action','resource'])if(filters[key]!==undefined){
    if(typeof filters[key]!=='string')throw Error('ADMIN_AUDIT_FILTER_INVALID');
    conditions.push(`json_extract(payload_json,'$.${key}')=?`);args.push(filters[key]);
  }
  if(filters.email!==undefined){
    if(typeof filters.email!=='string')throw Error('ADMIN_AUDIT_FILTER_INVALID');
    conditions.push("instr(lower(coalesce(json_extract(payload_json,'$.adminEmail'),json_extract(payload_json,'$.email'),'')),lower(?))>0");args.push(filters.email);
  }
  if(filters.success!==undefined){
    if(typeof filters.success!=='boolean')throw Error('ADMIN_AUDIT_FILTER_INVALID');
    conditions.push("json_extract(payload_json,'$.success')=?");args.push(filters.success?1:0);
  }
  for(const [key,operator] of [['startDate','>='],['endDate','<=']])if(filters[key]!==undefined){
    const date=new Date(filters[key]);if(!Number.isFinite(+date))throw Error('ADMIN_AUDIT_FILTER_INVALID');
    conditions.push(`occurred_at${operator}?`);args.push(date.toISOString());
  }
  const where=conditions.join(' AND ');
  const rows=await db.all(`SELECT payload_json FROM operational_records WHERE ${where} ORDER BY occurred_at DESC,source_id LIMIT ? OFFSET ?`,...args,limit,(page-1)*limit);
  const count=await db.get(`SELECT count(*) AS n FROM operational_records WHERE ${where}`,...args);
  const total=Number(count?.n);
  if(!Array.isArray(rows)||!Number.isSafeInteger(total)||total<0)throw Error('ADMIN_AUDIT_READ_INVALID');
  return {logs:rows.map(row=>JSON.parse(row.payload_json)),total,page,pages:Math.ceil(total/limit)};
}
