#!/usr/bin/env node
/** Consistent read-only production snapshot; encrypt before writing any customer data. */
import {MongoClient} from 'mongodb';
import {EJSON} from 'bson';
import {mkdirSync,writeFileSync,chmodSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {join,resolve} from 'node:path';
import {canonicalBson,documentSetDigest,sealMongoSnapshot,openMongoSnapshot,sha256} from '../../lib/checkout/mongo-snapshot-archive.mjs';
const output=resolve(process.env.TOG_SNAPSHOT_OUTPUT||'');
if(!process.env.MONGODB_URI||!process.env.TOG_SNAPSHOT_OUTPUT||!output.includes('/Backups/Gratog/'))throw Error('SNAPSHOT_SCOPE_INVALID');
const report={kind:'PRODUCTION_DERIVED_CONSISTENT_ENCRYPTED_SNAPSHOT',sourceReadOnly:true,
 snapshotConsistent:false,restoreVerified:false,productionCutoverAuthorized:false,pass:false};
const client=new MongoClient(process.env.MONGODB_URI,{maxPoolSize:1,minPoolSize:0,serverSelectionTimeoutMS:15000});
let session;
try{
 await client.connect();
 const db=client.db('taste_of_gratitude');
 const definitions=(await db.listCollections({}, {nameOnly:false}).toArray()).sort((a,b)=>a.name.localeCompare(b.name));
 if(definitions.some(c=>c.type!=='collection'||c.name.startsWith('system.')))throw Error('SOURCE_COLLECTION_TYPE_REQUIRES_REVIEW');
 const meta=[];
 for(const def of definitions)meta.push({name:def.name,options:def.options||{},indexes:await db.collection(def.name).indexes()});
 session=client.startSession({snapshot:true,causalConsistency:false});
 const collections=[];let clusterTime;
 for(const def of meta){
  const documents=await db.collection(def.name).find({},{session,batchSize:200,maxTimeMS:30000}).toArray();
  const at=session.snapshotTime;
  if(!at)throw Error('SNAPSHOT_TIMESTAMP_UNAVAILABLE');
  const timestamp=EJSON.stringify(at,{relaxed:false});
  if(clusterTime&&clusterTime!==timestamp)throw Error('SNAPSHOT_TIMESTAMP_CHANGED');
  clusterTime=timestamp;
  collections.push({...def,documents,digest:documentSetDigest(documents)});
 }
 await session.endSession();session=null;
 const after=(await db.listCollections({}, {nameOnly:false}).toArray()).sort((a,b)=>a.name.localeCompare(b.name));
 if(canonicalBson(definitions.map(({name,type,options})=>({name,type,options})))!==canonicalBson(after.map(({name,type,options})=>({name,type,options}))))throw Error('SOURCE_SCHEMA_CHANGED_DURING_SNAPSHOT');
 for(const def of meta)if(canonicalBson(def.indexes)!==canonicalBson(await db.collection(def.name).indexes()))throw Error('SOURCE_INDEXES_CHANGED_DURING_SNAPSHOT');
 const snapshot={format:'TOG_MONGO_SNAPSHOT_V1',database:'taste_of_gratitude',capturedAt:new Date().toISOString(),clusterTime,collections};
 const key=randomBytes(32),archive=sealMongoSnapshot(snapshot,key);
 const decoded=openMongoSnapshot(archive,key);
 if(canonicalBson(decoded)!==canonicalBson(snapshot))throw Error('SNAPSHOT_LOCAL_ROUNDTRIP_MISMATCH');
 mkdirSync(output,{recursive:true,mode:0o700});chmodSync(output,0o700);
 writeFileSync(join(output,'snapshot.togenc'),archive,{mode:0o600,flag:'wx'});
 writeFileSync(join(output,'snapshot.key'),key,{mode:0o600,flag:'wx'});
 Object.assign(report,{pass:true,snapshotConsistent:true,capturedAt:snapshot.capturedAt,
   snapshotClusterTime:clusterTime,archiveSha256:sha256(archive),archiveBytes:archive.length,
   collections:collections.map(c=>({name:c.name,count:c.documents.length,digest:c.digest,indexCount:c.indexes.length})),
   collectionCount:collections.length,documentCount:collections.reduce((n,c)=>n+c.documents.length,0)});
}catch(error){report.errorCode=typeof error?.codeName==='string'?error.codeName:/^[A-Z_]+$/.test(error?.message||'')?error.message:error?.name||'UNKNOWN';process.exitCode=1;}
finally{
 if(session)await session.endSession();await client.close();
 mkdirSync('test-results',{recursive:true});writeFileSync('test-results/mongo-production-snapshot-20261018.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}
