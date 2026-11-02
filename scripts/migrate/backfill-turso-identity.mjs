#!/usr/bin/env node
/** Isolated native identity backfill from a consistent, read-only MongoDB snapshot.
 * Never switches production or bypasses the final release verifier.
 */
import mongoPkg from 'mongodb';
import {connect} from '@tursodatabase/serverless';
import {transformDocument} from './transformers.mjs';
import {bindCustomerReferences} from './reference-context.mjs';
import {insertStatement,UPSERT_POLICIES} from './upsert-policy.mjs';

const {MongoClient}=mongoPkg;
const e=process.env;
const target='libsql://gratog-migration-cert-20261018-swatkins.aws-us-east-1.turso.io';
if(!process.argv.includes('--apply') || e.TURSO_TARGET_ENV!=='staging'||
   e.TURSO_DATABASE_URL!==target||!e.TURSO_AUTH_TOKEN||
   e.TURSO_APPROVED_STAGING_NAME!=='gratog-migration-cert-20261018'||
   e.TOG_SOURCE_READ_ONLY!=='true'||!e.MONGODB_URI)
  throw Error('IDENTITY_BACKFILL_STAGING_AND_READ_ONLY_SOURCE_REQUIRED');

const mongo=new MongoClient(e.MONGODB_URI,{maxPoolSize:1,serverSelectionTimeoutMS:20000});
const turso=connect({url:target,authToken:e.TURSO_AUTH_TOKEN,defaultQueryTimeout:20000});
const acceptedTables=new Set(['customer_accounts','admin_identities','admin_identity_references']);
const report={kind:'STAGING_NATIVE_IDENTITY_BACKFILL',sourceReadOnly:true,
  onlyIsolatedTursoWrites:true,sourceSnapshotConsistent:false,
  sourceUsers:0,sourceAdministrators:0,verifiedUsers:0,
  verifiedAdministrators:0,verifiedReferences:0,
  rejected:0,pass:false,productionCutoverAuthorized:false};
let session;
try{
  const latest=await turso.get("SELECT run_id,source_documents,source_collections,status FROM mongo_shadow_mirror_runs ORDER BY verified_at DESC LIMIT 1");
  if(latest?.status!=='verified'||Number(latest.source_collections)!==59||
     Number(latest.source_documents)<8000)
    throw Error('COMPLETE_SOURCE_SHADOW_MIRROR_REQUIRED');
  await mongo.connect();
  const db=mongo.db('taste_of_gratitude');
  session=mongo.startSession({snapshot:true});
  const customers=await db.collection('customers').find({},{session,projection:{_id:1,id:1,email:1}}).toArray();
  const context={customerById:new Map()};
  for(const c of customers)bindCustomerReferences(context.customerById,c);
  const entries=[],statements=[];
  for(const kind of ['users','admin_users']){
    const docs=await db.collection(kind).find({},{session}).sort({_id:1}).toArray();
    if(kind==='users')report.sourceUsers=docs.length;
    else report.sourceAdministrators=docs.length;
    for(const doc of docs){
      const result=transformDocument(kind,doc,context);
      for(const st of result.statements){
        if(!acceptedTables.has(st.table))continue;
        entries.push(st);
        statements.push(insertStatement(st.table,st.row));
      }
      statements.push(insertStatement('migration_source_records',{
        source_collection:kind,source_id:result.sourceId,
        canonical_fingerprint:result.fingerprint,migrated_at:new Date().toISOString()
      }));
    }
  }
  if(!session.snapshotTime)throw Error('SOURCE_SNAPSHOT_TIMESTAMP_MISSING');
  report.sourceSnapshotConsistent=true;
  if(report.sourceUsers<1||report.sourceAdministrators<1)
    throw Error('SOURCE_IDENTITIES_UNEXPECTEDLY_EMPTY');
  const expectedUsers=entries.filter(e=>e.table==='customer_accounts').length;
  const expectedAdmins=entries.filter(e=>e.table==='admin_identities').length;
  if(expectedUsers!==report.sourceUsers||expectedAdmins!==report.sourceAdministrators)
    throw Error('IDENTITY_TRANSFORM_INCOMPLETE');
  await turso.batch(statements,'immediate');
  for(const st of entries){
    const table=st.table, keys=UPSERT_POLICIES[table].key;
    const columns=Object.keys(st.row);
    const where=keys.map(k=>k+'=?').join(' AND ');
    const fields=columns.join(',');
    const row=await turso.get('SELECT '+fields+' FROM '+table+' WHERE '+where,keys.map(k=>st.row[k]));
    if(!row)throw Error('NATIVE_IDENTITY_ROW_MISSING_'+table);
    for(const field of columns){
      const wanted=st.row[field],actual=row[field];
      if((wanted==null&&actual==null)||String(wanted)===String(actual))continue;
      if(table==='admin_identities'&&field==='session_version'&&Number(actual)>Number(wanted))continue;
      throw Error('NATIVE_IDENTITY_FIELD_MISMATCH_'+table);
    }
    if(table==='customer_accounts')report.verifiedUsers++;
    if(table==='admin_identities')report.verifiedAdministrators++;
    if(table==='admin_identity_references')report.verifiedReferences++;
  }
  const check=report.verifiedUsers===expectedUsers&&report.verifiedAdministrators===expectedAdmins;
  if(!check)throw Error('IDENTITY_BACKFILL_UNVERIFIED');
  report.pass=true;
  console.log('IDENTITY_NATIVE_BACKFILL_VERIFIED '+JSON.stringify(report));
}catch(e){
  report.rejected++;
  console.error('IDENTITY_BACKFILL_FAILED '+JSON.stringify({code:String(e?.code||e?.message||'UNKNOWN').replace(/[^A-Za-z0-9_]/g,'_').slice(0,85),
    users:report.sourceUsers,admins:report.sourceAdministrators,
    verifiedUsers:report.verifiedUsers,verifiedAdministrators:report.verifiedAdministrators}));
  process.exitCode=1;
}finally{
  if(session)await session.endSession().catch(()=>{});
  await mongo.close().catch(()=>{});
}
