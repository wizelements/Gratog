#!/usr/bin/env node
/** Restore only into a dedicated loopback clone. No production credential is accepted. */
import {MongoClient} from 'mongodb';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {openMongoSnapshot,sha256,documentSetDigest,canonicalBson} from '../../lib/checkout/mongo-snapshot-archive.mjs';
const root=resolve(process.env.TOG_SNAPSHOT_DIRECTORY||'');
const database='tog_recovery_clone_prod_20261018';
const uri='mongodb://127.0.0.1:27027/'+database+'?replicaSet=togRecovery&directConnection=true';
const report={kind:'PRODUCTION_DERIVED_ISOLATED_MONGO_RESTORE',sourceReadOnly:true,
 sourceCredentialPresent:Boolean(process.env.MONGODB_URI),pass:false,productionCutoverAuthorized:false,
 finalWriteFreezePerformed:false,reverseDeltaVerified:false};
if(!root.endsWith('/tog-production-restore-20261018')||process.env.MONGODB_URI||
 !/^[a-f0-9]{64}$/.test(process.env.TOG_EXPECTED_ARCHIVE_SHA256||''))throw Error('RESTORE_SCOPE_INVALID');
const options=index=>{
 const {v,ns,background,...rest}=index;return rest;
};
const indexDigest=indexes=>canonicalBson(indexes.map(options).sort((a,b)=>a.name.localeCompare(b.name)));
const client=new MongoClient(uri,{serverSelectionTimeoutMS:15000,maxPoolSize:2});
try{
 const archive=readFileSync(join(root,'snapshot.togenc'));
 assert.equal(sha256(archive),process.env.TOG_EXPECTED_ARCHIVE_SHA256,'ARCHIVE_TRANSPORT_HASH_MISMATCH');
 const snapshot=openMongoSnapshot(archive,readFileSync(join(root,'snapshot.key')));
 // Direct connection permits safe replica initiation before a writable primary exists.
 await client.connect();
 let hello=await client.db('admin').command({hello:1});
 if(!hello.setName){await client.db('admin').command({replSetInitiate:{_id:'togRecovery',members:[{_id:0,host:'127.0.0.1:27027'}]}})}
 for(let attempt=0;attempt<50;attempt++){
  hello=await client.db('admin').command({hello:1});
  if(hello.isWritablePrimary)break;
  await new Promise(resolve=>setTimeout(resolve,300));
 }
 assert.equal(hello.isWritablePrimary,true,'CLONE_PRIMARY_REQUIRED');
 const db=client.db(database);
 assert.equal((await db.listCollections().toArray()).length,0,'RESTORE_CLONE_MUST_BE_EMPTY');
 let indexCount=0;
 for(const collection of snapshot.collections){
  await db.createCollection(collection.name,collection.options);
  const extra=collection.indexes.filter(index=>index.name!=='_id_').map(options);
  if(extra.length)await db.collection(collection.name).createIndexes(extra);
  if(collection.documents.length)await db.collection(collection.name).insertMany(collection.documents,{ordered:true,writeConcern:{w:'majority'}});
  const restored=await db.collection(collection.name).find({}).toArray();
  assert.equal(restored.length,collection.documents.length,'RESTORE_DOCUMENT_COUNT_MISMATCH');
  assert.equal(documentSetDigest(restored),collection.digest,'RESTORE_DOCUMENT_FINGERPRINT_MISMATCH');
  assert.equal(indexDigest(await db.collection(collection.name).indexes()),indexDigest(collection.indexes),'RESTORE_INDEX_CONSTRAINT_MISMATCH');
  const validation=await db.command({validate:collection.name,full:true});
  assert.equal(validation.valid,true,'RESTORE_MONGO_VALIDATION_FAILED');
  indexCount+=collection.indexes.length;
 }
 const freezeWatermark=new Date(JSON.parse(snapshot.clusterTime).$timestamp.t*1000).toISOString();
 await db.collection('recovery_clone_control').insertOne({_id:'isolated_restore_clone',
  cloneId:'production-derived-restore-20261018',databaseName:database,kind:'disposable_restore_clone',
  snapshotSha256:sha256(archive),snapshotWatermark:freezeWatermark,
  applicationWritersDisabled:true,restoredAndVerified:true,sourceIsProductionDerived:true,
  finalProductionWriteFreezePerformed:false});
 Object.assign(report,{pass:true,archiveSha256:sha256(archive),snapshotClusterTime:snapshot.clusterTime,
  snapshotWatermark:freezeWatermark,capturedAt:snapshot.capturedAt,restoredAt:new Date().toISOString(),
  collectionCount:snapshot.collections.length,documentCount:snapshot.collections.reduce((n,c)=>n+c.documents.length,0),
  verifiedIndexCount:indexCount,allDocumentFingerprintsMatch:true,allCollectionValidationsPassed:true,
  allIndexConstraintsMatch:true,cloneDatabase:database,cloneApplicationWritersDisabled:true});
}catch(error){report.errorCode=error?.codeName||error?.code||error?.message?.split('\n')[0]?.slice(0,140)||error?.name;process.exitCode=1;}
finally{
 await client.close();mkdirSync('test-results',{recursive:true});
 writeFileSync('test-results/mongo-production-restore-20261018.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}
