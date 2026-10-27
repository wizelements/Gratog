#!/usr/bin/env node
/**
 * Snapshot-consistent, lossless MongoDB -> isolated Turso EJSON shadow.
 *
 * Writes ONLY staging shadow tables; never alters MongoDB or normalized
 * checkout tables. BSON Extended JSON preserves ObjectId, dates, binary,
 * integer types, nulls, nesting, and the original full document.
 * The final release still requires a write freeze + delta sync + native
 * domain table parity and independent recovery certification.
 */
import {createHash, randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import mongodb from 'mongodb';
import {EJSON} from 'bson';
const {MongoClient} = mongodb;
import {connect} from '@tursodatabase/serverless';

const TARGET='libsql://gratog-migration-cert-20261018-swatkins.aws-us-east-1.turso.io';
const e=process.env;
const allowed=process.argv.includes('--apply');
if (!allowed || e.TURSO_TARGET_ENV!=='staging' ||
    e.TURSO_DATABASE_URL!==TARGET ||
    e.TURSO_APPROVED_STAGING_NAME!=='gratog-migration-cert-20261018' ||
    !e.TURSO_AUTH_TOKEN || e.TURSO_AUTH_TOKEN.length<24 ||
    !e.MONGODB_URI || e.TOG_SOURCE_READ_ONLY!=='true')
  throw Error('MIRROR_GUARD_REQUIRES_EXACT_STAGING_AND_READ_ONLY_SOURCE');
const hash=x=>createHash('sha256').update(x).digest('hex');
const ejson=x=>EJSON.stringify(x,{relaxed:false});
const chunkSize=25;
const runId=randomUUID();
const started=new Date().toISOString();
const mongo=new MongoClient(e.MONGODB_URI,{maxPoolSize:2,serverSelectionTimeoutMS:20000});
const remote=connect({url:TARGET,authToken:e.TURSO_AUTH_TOKEN,defaultQueryTimeout:20000});
const report={kind:'LOSSLESS_MONGO_SNAPSHOT_TURSO_SHADOW',runId,startedAt:started,
  collectionCount:0,sourceDocuments:0,sourceIndexes:0,
  verifiedDocuments:0,verifiedIndexes:0,missing:0,hashMismatches:0,
  immutableSourceSnapshot:false,readOnlyMongo:true,onlyIsolatedTursoShadowWrites:true,
  completed:false,productionCutoverAuthorized:false};
const expectedDocs=new Map(),expectedIndexes=new Map();
let session;
let runStarted=false;
let batch=[];
async function flush(){
  if (!batch.length)return;
  const statements=batch;batch=[];
  for(let n=0;n<4;n++){
    try{await remote.batch(statements,'immediate');return}
    catch(err){if(n===3)throw err;await new Promise(r=>setTimeout(r,350*Math.pow(2,n)))}
  }
}
function enqueue(sql,args){batch.push({sql,args});if(batch.length>=chunkSize)return flush()}
const docSQL=`INSERT INTO mongo_shadow_documents
  (collection_name,source_id_ejson,document_ejson,content_sha256,mirror_run_id)
  VALUES (?,?,?,?,?)
  ON CONFLICT(collection_name,source_id_ejson) DO UPDATE SET
    document_ejson=excluded.document_ejson,content_sha256=excluded.content_sha256,
    mirror_run_id=excluded.mirror_run_id`;
const indexSQL=`INSERT INTO mongo_shadow_index_specs
  (collection_name,index_name,index_ejson,content_sha256,mirror_run_id)
  VALUES (?,?,?,?,?)
  ON CONFLICT(collection_name,index_name) DO UPDATE SET
    index_ejson=excluded.index_ejson,content_sha256=excluded.content_sha256,
    mirror_run_id=excluded.mirror_run_id`;
try {
  await mongo.connect();
  const source=mongo.db('taste_of_gratitude');
  const names=(await source.listCollections({}, {nameOnly:true}).toArray())
    .map(x=>x.name).sort();
  if(names.length<50)throw Error('SOURCE_COLLECTION_INVENTORY_UNEXPECTED');
  const hasSchema=await remote.get("SELECT count(*) n FROM sqlite_master WHERE type='table' AND name='mongo_shadow_documents'");
  if(Number(hasSchema?.n)!==1)throw Error('LOSSLESS_SHADOW_SCHEMA_NOT_APPLIED');
  await remote.run(`INSERT INTO mongo_shadow_mirror_runs
    (run_id,status,started_at) VALUES (?,'copying',?)`,[runId,started]);
  runStarted=true;
  session=mongo.startSession({snapshot:true});
  for(const name of names){
    const collection=source.collection(name);
    let collectionCount=0;
    const cursor=collection.find({}, {session,batchSize:75}).sort({_id:1});
    for await(const document of cursor){
      if(document._id===undefined)throw Error('SOURCE_DOCUMENT_ID_REQUIRED');
      const sourceId=ejson(document._id),payload=ejson(document),digest=hash(payload);
      const key=JSON.stringify([name,sourceId]);
      if(expectedDocs.has(key))throw Error('DUPLICATE_SNAPSHOT_DOCUMENT');
      expectedDocs.set(key,digest);
      await enqueue(docSQL,[name,sourceId,payload,digest,runId]);
      collectionCount++;report.sourceDocuments++;
    }
    // MongoDB exposes index definitions through listIndexes; preserve their
    // exact EJSON spec for migration review, without claiming SQLite has
    // equivalent index/query semantics.
    const indexes=await collection.listIndexes().toArray();
    for(const spec of indexes){
      const value=ejson(spec),nameOfIndex=String(spec.name||'');
      if(!nameOfIndex)throw Error('SOURCE_INDEX_WITHOUT_NAME');
      const key=JSON.stringify([name,nameOfIndex]),digest=hash(value);
      expectedIndexes.set(key,digest);
      await enqueue(indexSQL,[name,nameOfIndex,value,digest,runId]);
      report.sourceIndexes++;
    }
    report.collectionCount++;
    if(report.collectionCount%10===0)
      console.log('MIRROR_PROGRESS '+JSON.stringify({collections:report.collectionCount,documents:report.sourceDocuments}));
  }
  await flush();
  if(!session.snapshotTime)throw Error('SOURCE_SNAPSHOT_TIMESTAMP_UNAVAILABLE');
  report.immutableSourceSnapshot=true;
  const snapshotTime=ejson(session.snapshotTime);
  await session.endSession();session=null;
  // Verify ACTUAL remote EJSON payload bytes, not simply the imported counts
  // or the stored digest field supplied by the importer.
  const rows=await remote.all('SELECT collection_name,source_id_ejson,document_ejson,content_sha256 FROM mongo_shadow_documents WHERE mirror_run_id=?',[runId]);
  for(const row of rows){
    const key=JSON.stringify([row.collection_name,row.source_id_ejson]);
    const expected=expectedDocs.get(key);
    if(!expected){report.hashMismatches++;continue}
    const actual=hash(row.document_ejson);
    if(actual!==row.content_sha256||actual!==expected)report.hashMismatches++;
    else report.verifiedDocuments++;
  }
  report.missing=expectedDocs.size-report.verifiedDocuments;
  const indexRows=await remote.all('SELECT collection_name,index_name,index_ejson,content_sha256 FROM mongo_shadow_index_specs WHERE mirror_run_id=?',[runId]);
  for(const row of indexRows){
    const key=JSON.stringify([row.collection_name,row.index_name]);
    const expected=expectedIndexes.get(key);
    const actual=hash(row.index_ejson);
    if(actual===expected&&actual===row.content_sha256)report.verifiedIndexes++;
  }
  if(report.hashMismatches||report.missing||report.verifiedIndexes!==expectedIndexes.size ||
     report.verifiedDocuments!==report.sourceDocuments)
    throw Error('LOSSLESS_SHADOW_REMOTE_PARITY_FAILED');
  // Deletions are scoped strictly to shadow tables, and only AFTER complete
  // read-back validation of the single snapshot. No normalized table changes.
  await remote.run('DELETE FROM mongo_shadow_documents WHERE mirror_run_id<>?',[runId]);
  await remote.run('DELETE FROM mongo_shadow_index_specs WHERE mirror_run_id<>?',[runId]);
  const finalCounts=await remote.get('SELECT COUNT(*) n FROM mongo_shadow_documents');
  const finalIndexes=await remote.get('SELECT COUNT(*) n FROM mongo_shadow_index_specs');
  if(Number(finalCounts.n)!==expectedDocs.size || Number(finalIndexes.n)!==expectedIndexes.size)
    throw Error('LOSSLESS_SHADOW_POST_PRUNE_PARITY_FAILED');
  await remote.run(`UPDATE mongo_shadow_mirror_runs SET status='verified',
    source_cluster_time=?,source_collections=?,source_documents=?,target_documents=?,
    source_indexes=?,target_indexes=?,verified_at=? WHERE run_id=?`,
    [snapshotTime,report.collectionCount,report.sourceDocuments,report.verifiedDocuments,
    report.sourceIndexes,report.verifiedIndexes,new Date().toISOString(),runId]);
  report.completed=true;
  report.finishedAt=new Date().toISOString();
  console.log('LOSSLESS_SHADOW_VERIFIED '+JSON.stringify(report));
}catch(err){
  if(runStarted)await remote.run("UPDATE mongo_shadow_mirror_runs SET status='failed' WHERE run_id=?",[runId]).catch(()=>{});
  console.error('LOSSLESS_SHADOW_FAILED '+JSON.stringify({runId,error:err?.code||err?.message?.slice(0,120)||'UNKNOWN',progress:report.collectionCount,docsRead:report.sourceDocuments,docsVerified:report.verifiedDocuments}));
  process.exitCode=1;
}finally{
  if(session)await session.endSession().catch(()=>{});
  await mongo.close().catch(()=>{});
}
