#!/usr/bin/env node
/**
 * Real Mongo archive restore + transaction/replay certification using synthetic
 * business/provider fixtures ONLY. No secrets, network providers or production
 * source records. The surrounding CI job owns a loopback-only disposable Mongo.
 */
import {MongoClient} from 'mongodb';
import {strict as assert} from 'node:assert';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {replayIntoMongoClone,recoveryDigest,mongoDocumentDigest} from '../../lib/checkout/mongo-clone-reverse-delta.mjs';
import {recoveryFixture,syntheticProvider,fixtureFreeze} from '../../tests/migration/mongo-clone-reverse-delta-fixtures.mjs';

const container='tog-recovery-drill-ci';
const sourceName='tog_recovery_synthetic_source';
const cloneName='tog_recovery_clone_ci';
const uri=`mongodb://127.0.0.1:27027/${cloneName}?replicaSet=rs0&directConnection=true`;
const client=new MongoClient(uri,{serverSelectionTimeoutMS:15000});
const cloneId='fixture-clone-oct18';
const started=Date.now();
const report={kind:'SYNTHETIC_SOURCE_REAL_MONGO_RESTORE_AND_REPLAY',
  executedAt:new Date().toISOString(),gitSha:process.env.GITHUB_SHA||null,
  providerEvidenceKind:'synthetic-fixture',productionDatabaseAccess:false,
  certifiesProductionSourceBackup:false,certifiesProductionRollback:false,
  checks:[],passed:false};
const check=(name,details={})=>report.checks.push({name,pass:true,...details});
function command(args,input) {
  const p=spawnSync('docker',['exec',...(input?['-i']:[]),container,...args],
    {input,encoding:input?undefined:null,timeout:60000,maxBuffer:8*1024*1024});
  if(p.error || p.status!==0) throw new Error(`ISOLATED_MONGO_TOOL_FAILED:${args[0]}`);
  return p.stdout;
}
async function fingerprint(db) {
  const result={};
  for(const {name} of (await db.listCollections().toArray()).sort((a,b)=>a.name.localeCompare(b.name))) {
    if(name.startsWith('system.')) continue;
    const documents=await db.collection(name).find().sort({_id:1}).toArray();
    const indexes=(await db.collection(name).listIndexes().toArray()).map(({ns,...i})=>i)
      .sort((a,b)=>a.name.localeCompare(b.name));
    result[name]={count:documents.length,documentsSha256:recoveryDigest(documents),indexesSha256:recoveryDigest(indexes)};
  }
  return result;
}

try {
  await client.connect();
  const source=client.db(sourceName), clone=client.db(cloneName);
  // Refuse to clobber any preexisting namespace, even on the disposable server.
  assert.equal((await source.listCollections().toArray()).length,0,'SOURCE_NOT_EMPTY');
  assert.equal((await clone.listCollections().toArray()).length,0,'CLONE_NOT_EMPTY');
  await source.collection('orders').insertOne({id:'fixture-historical',squarePaymentId:'fixture-historical-payment',
    totalCents:499,currency:'USD',status:'FULFILLED',paymentStatus:'PAID',
    createdAt:'2026-10-17T00:00:00.000Z',updatedAt:'2026-10-17T00:00:00.000Z'});
  await source.collection('orders').insertMany([{legacyOnly:'A',totalCents:0},{legacyOnly:'B',totalCents:0}]);
  await source.collection('orders').createIndex({id:1},{name:'legacy_nonunique_business_id'});
  await source.collection('payment_records').insertOne({squarePaymentId:'fixture-historical-payment',
    status:'COMPLETED',amountCents:499,currency:'USD',metadata:{orderId:'fixture-historical'}});
  await source.collection('payment_records').createIndex({squarePaymentId:1},{unique:true});
  await source.collection('inventory').insertMany([
    {productId:'fixture-product-a',currentStock:10},{productId:'fixture-product-b',currentStock:5}]);
  await source.collection('inventory').createIndex({productId:1},{unique:true});
  const sourceBefore=await fingerprint(source);
  const historicalHash=mongoDocumentDigest(await source.collection('orders').findOne({id:'fixture-historical'}));
  // Only this script writes the fixture source. No source writes occur after
  // this watermark, so the archive is consistent by enforced test quiescence.
  const archive=command(['mongodump','--quiet',`--db=${sourceName}`,'--archive','--gzip']);
  const snapshotSha256=createHash('sha256').update(archive).digest('hex');
  command(['mongorestore','--quiet','--archive','--gzip',`--nsFrom=${sourceName}.*`,`--nsTo=${cloneName}.*`],archive);
  assert.deepEqual(await fingerprint(source),sourceBefore);
  assert.deepEqual(await fingerprint(clone),sourceBefore);
  check('actual_mongodump_archive_restored_with_documents_and_unique_indexes',
    {snapshotSha256,archiveBytes:archive.length,collections:Object.keys(sourceBefore).length});
  report.sourceBaseline=sourceBefore;
  await clone.collection('recovery_clone_control').insertOne({_id:'isolated_restore_clone',
    cloneId,databaseName:cloneName,kind:'disposable_restore_clone',snapshotSha256,
    snapshotWatermark:fixtureFreeze,applicationWritersDisabled:true,restoredAndVerified:true});
  const bundle=recoveryFixture(snapshotSha256), providerReadback=syntheticProvider(bundle);
  const args={client,db:clone,uri,cloneId,bundle,providerReadback};
  await assert.rejects(()=>replayIntoMongoClone({...args,cloneId:'unowned-clone'}),/CLONE_OWNERSHIP/);
  check('unowned_clone_rejected');
  const beforeUnknown=await fingerprint(clone);
  await assert.rejects(()=>replayIntoMongoClone({...args,providerReadback:{...providerReadback,
    payment:async id=>({...await providerReadback.payment(id),status:'PENDING'})}}),/SQUARE_CAPTURE_READBACK/);
  assert.deepEqual(await fingerprint(clone),beforeUnknown);
  check('unknown_provider_outcome_blocks_before_database_mutation');
  await assert.rejects(()=>replayIntoMongoClone({...args,fault:async point=>{
    if(point==='after_inventory') throw new Error('INJECTED_INVENTORY_FAILURE');
  }}),/INJECTED_INVENTORY_FAILURE/);
  assert.equal(await clone.collection('orders').countDocuments(),3);
  assert.equal(await clone.collection('payment_records').countDocuments(),1);
  assert.equal(await clone.collection('square_refund_entries').countDocuments(),0);
  assert.equal(await clone.collection('inventory_events').countDocuments(),0);
  assert.equal(await clone.collection('recovery_applications').countDocuments(),0);
  assert.equal((await clone.collection('inventory').findOne({productId:'fixture-product-a'})).currentStock,10);
  check('failure_after_stock_write_rolls_back_order_payment_refund_stock_and_operation_marker');
  await assert.rejects(()=>replayIntoMongoClone({...args,fault:async (point,{position})=>{
    if(point==='after_commit' && position===0) throw new Error('INJECTED_LOST_ACKNOWLEDGEMENT');
  }}),/INJECTED_LOST_ACKNOWLEDGEMENT/);
  assert.equal(await clone.collection('recovery_applications').countDocuments(),1);
  const resumed=await replayIntoMongoClone(args);
  assert.equal(resumed.applied,2); assert.equal(resumed.replayed,1);
  assert.equal(resumed.capturedCents,4796); assert.equal(resumed.refundedCents,1699);
  check('resume_after_committed_order_without_acknowledgement',resumed);
  const repeats=await Promise.all([replayIntoMongoClone(args),replayIntoMongoClone(args)]);
  for(const r of repeats) { assert.equal(r.applied,0); assert.equal(r.replayed,3); }
  assert.equal(await clone.collection('orders').countDocuments(),6);
  assert.equal(await clone.collection('payment_records').countDocuments(),4);
  assert.equal(await clone.collection('square_refund_entries').countDocuments(),2);
  assert.equal(await clone.collection('inventory_events').countDocuments(),4);
  assert.equal(await clone.collection('checkout_notification_outbox').countDocuments({status:'reconciliation_hold'}),6);
  assert.equal(await clone.collection('webhook_events_processed').countDocuments({status:'success'}),5);
  assert.equal((await clone.collection('inventory').findOne({productId:'fixture-product-a'})).currentStock,9);
  assert.equal((await clone.collection('inventory').findOne({productId:'fixture-product-b'})).currentStock,3);
  check('concurrent_repeated_replay_has_no_duplicate_finance_stock_or_notification_effect');
  const reused=structuredClone(bundle);reused.records[0].order.status='CANCELED';
  await assert.rejects(()=>replayIntoMongoClone({...args,bundle:reused}),/RECOVERY_RUN_ID_REUSED/);
  check('reused_recovery_id_with_changed_payload_rejected');
  // Completed-run replay must still independently detect changed stored cents.
  await clone.collection('payment_records').updateOne({squarePaymentId:bundle.records[0].payment.squarePaymentId},{$set:{amountCents:1}});
  await assert.rejects(()=>replayIntoMongoClone(args),/RECOVERY_PAYMENT_READBACK_MISMATCH/);
  await clone.collection('payment_records').updateOne({squarePaymentId:bundle.records[0].payment.squarePaymentId},{$set:{amountCents:1199}});
  check('durable_applied_marker_does_not_hide_corrupt_payment_readback');
  await replayIntoMongoClone(args);
  assert.equal(mongoDocumentDigest(await clone.collection('orders').findOne({id:'fixture-historical'})),historicalHash);
  assert.deepEqual(await fingerprint(source),sourceBefore);
  check('historical_order_and_quiesced_source_remain_exactly_intact');
  report.passed=true;
} catch(error) {
  report.error=error.code||error.message;
  process.exitCode=1;
} finally {
  await client.close();
  report.durationMs=Date.now()-started;
  mkdirSync('test-results',{recursive:true});
  writeFileSync('test-results/mongo-clone-reverse-delta-proof.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
