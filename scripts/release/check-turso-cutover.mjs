#!/usr/bin/env node
/**
 * Read-only independent release verifier. JSON pass flags and URLs have no
 * authority. Gate payloads must come from successful exact-SHA GitHub runs,
 * from reviewed workflow blobs, inside hash-verified GitHub artifact archives.
 * No command here changes a deployment, database, provider or credential.
 */
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const REPOSITORY='wizelements/Gratog';
const HASH=/^[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const MAX_AGE=30*60_000;
const MAX_ARCHIVE=10*1024*1024;
const MAX_PAYLOAD=512*1024;
const certified=new WeakSet();
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'
  ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
export const bindingDigest=x=>digest(JSON.stringify(canonical(x))??'undefined');
const stamp=x=>typeof x==='string'?Date.parse(x):NaN;
const fresh=(x,now)=>Number.isFinite(stamp(x))&&stamp(x)<=now+60_000&&now-stamp(x)<=MAX_AGE;
const fail=code=>{throw Error(code)};

// Reviewed workflow blobs, not paths supplied by the evidence author. Updating
// a producer requires reviewing its implementation and changing this policy.
// Existing producers do not yet emit the V2 contract: that remains a HOLD.
export const APPROVED_WORKFLOWS=Object.freeze({
  '.github/workflows/turso-integration-closure.yml':'53282c583bd003c7d5bc63d190c7f2a2ad80008a',
  '.github/workflows/turso-preview-live-certification.yml':'ce84013581cc5592640e910f34c6a9b76ac00fb2',
  '.github/workflows/turso-square-protected-certification.yml':'f95b07669fffb3f467a5769433ed0da9bafb2815',
  '.github/workflows/turso-recovery-full-regression.yml':'bf97d3504a35b81d8e4587735907d7336319f0f2',
  '.github/workflows/mongo-clone-reverse-delta.yml':'65a8df15635e18402964dcbac813577761decb6c',
});
const INTEGRATION='.github/workflows/turso-integration-closure.yml';
const PREVIEW='.github/workflows/turso-preview-live-certification.yml';
const PROTECTED='.github/workflows/turso-square-protected-certification.yml';
const REGRESSION='.github/workflows/turso-recovery-full-regression.yml';
export const GATE_PRODUCERS=Object.freeze({
  runtimeRoutes:INTEGRATION,previewIsolation:PREVIEW,providerSandbox:PROTECTED,
  signedWebhookDelivery:PREVIEW,realCustomerNotification:PREVIEW,realStaffNotification:PREVIEW,
  catalogAuthority:PROTECTED,historicalParity:PROTECTED,liveReadModel:PREVIEW,
  customerBrowserE2E:PREVIEW,skippedTests:REGRESSION,restoreDrill:PROTECTED,
  reverseDelta:PROTECTED,productionRollback:PROTECTED,operatorReview:PROTECTED,
});
export const REQUIRED_CHECKS=Object.freeze({
  runtimeRoutes:['customer_identity','admin_identity_and_revocation','catalog_variants','inventory_reservations','checkout_payments_refunds','orders_fulfillment','markets','implemented_rewards_subscriptions','notifications_webhooks','reports_exports_jobs','no_required_mongo_operations','no_mongo_fallback'],
  previewIsolation:['database_identity','scoped_credentials','square_sandbox_identity','exact_deployment_sha'],
  providerSandbox:['capture','decline','interrupted_payment','duplicate_checkout','provider_readback','completed_refund','inventory_release'],
  signedWebhookDelivery:['payment_signature','refund_signature','replay','out_of_order','stale_destination_disposition'],
  realCustomerNotification:['provider_acceptance','provider_delivery','order_correlation','no_duplicate_send'],
  realStaffNotification:['provider_acceptance','provider_delivery','order_correlation','no_duplicate_send'],
  catalogAuthority:['authoritative_source','identity_names','variants_prices_cents','square_associations','stock_visibility','tax_fulfillment','market_availability','historical_price_preservation','zero_unexplained_discrepancies'],
  historicalParity:['final_source_checkpoint','all_required_entities','semantic_row_field_parity','foreign_keys','currency_minor_units','inventory_events','timestamps','null_archive_deletion_semantics','zero_missing_extra_orphans'],
  liveReadModel:['catalog_stock','customer_history','paid_receipt','refunded_receipt','admin_reporting'],
  customerBrowserE2E:['desktop_buyer','mobile_buyer','account_lifecycle','cart_checkout','interrupted_checkout_recovery','confirmation_history','cancellation_refund','admin_auth','admin_catalog_inventory','admin_markets','admin_fulfillment_refund','admin_customer_reports','active_session_revocation'],
  skippedTests:['complete_inventory','no_unresolved_required_tests'],
  restoreDrill:['consistent_mongo_backup','archive_authentication','isolated_actual_mongo_restore','all_documents_indexes_constraints','protected_backup_and_key_retention','actual_turso_backup_restore','restored_full_row_integrity','restored_application_compatibility','restored_access_controls'],
  reverseDelta:['all_accepted_mutations_captured','orders_payments_refunds','inventory_reservations_unpaid_orders','customer_admin_mutations','catalog_market_mutations','notification_webhook_state','interrupted_recovery','idempotent_replay','provider_reconciliation','zero_unreconciled_writes'],
  productionRollback:['pinned_deployment_configuration','post_write_recovery','all_accepted_writes_preserved','database_unavailable','square_unavailable','network_timeout','transaction_failure','inventory_race','credential_expiry','restart','schema_failure','stale_session'],
  operatorReview:['independent_evidence_review','no_unresolved_material_blockers','alerts_thresholds_incident_procedure','database_payment_order_refund_inventory_alerts','backup_preservation_period','monitored_release_boundary'],
});
export const GATES=Object.entries(REQUIRED_CHECKS).map(([id])=>[id,id]);

export function schemaIdentity(root=process.cwd()){
  const dir=resolve(root,'db/migrations');
  const names=readdirSync(dir).filter(n=>/^\d{4}_[a-z0-9_]+\.sql$/.test(n)).sort();
  if(!names.length)fail('SCHEMA_FILES_MISSING');
  return {version:names.at(-1),sha256:bindingDigest(names.map(name=>({name,sha256:digest(readFileSync(resolve(dir,name)))})))};
}

function structuralErrors(e,{now,sha,expected}={}){
  if(!e||typeof e!=='object')return ['EVIDENCE_ABSENT'];
  const errors=[];
  if(e.schemaVersion!==2)errors.push('EVIDENCE_V2_REQUIRED');
  if(!SHA.test(e.commit||'')||e.commit!==sha)errors.push('COMMIT_IDENTITY_MISSING_OR_MISMATCH');
  if(e.repository!==REPOSITORY)errors.push('REPOSITORY_IDENTITY_MISMATCH');
  if(!fresh(e.attestedAt,now))errors.push('FRESH_ATTESTATION_REQUIRED');
  if(e.environment!=='production-cutover'||e.authority!=='independent_release_certification')errors.push('RELEASE_SCOPE_UNVERIFIED');
  if(!/^dpl_[a-zA-Z0-9]+$/.test(e.rollbackCandidateDeploymentId||''))errors.push('ROLLBACK_DEPLOYMENT_UNPINNED');
  if(!expected||!HASH.test(expected.sourceDatabaseSha256||'')||!HASH.test(expected.targetDatabaseSha256||'')||
     expected.sourceDatabaseSha256===expected.targetDatabaseSha256||
     !HASH.test(expected.schema?.sha256||'')||!expected.schema?.version||!HASH.test(expected.checkpointSha256||'')){
    errors.push('INDEPENDENT_DATABASE_SCHEMA_CHECKPOINT_PINS_REQUIRED');
  }else{
    if(e.binding?.sourceDatabaseSha256!==expected.sourceDatabaseSha256||e.binding?.targetDatabaseSha256!==expected.targetDatabaseSha256)errors.push('DATABASE_IDENTITY_MISMATCH');
    if(bindingDigest(e.binding?.schema)!==bindingDigest(expected.schema))errors.push('SCHEMA_IDENTITY_MISMATCH');
    if(bindingDigest(e.consistency)!==expected.checkpointSha256)errors.push('CONSISTENCY_CHECKPOINT_MISMATCH');
  }
  const c=e.consistency;
  // Initially certify a bounded global freeze only. A change-stream release
  // needs an independently reviewed lease/resume-token contract before use.
  if(!c||c.method!=='bounded-write-freeze'||!HASH.test(c.sourceSnapshotSha256||'')||
     !HASH.test(c.targetCheckpointSha256||'')||typeof c.mongoClusterTime!=='string'||
     !/^\d+:\d+$/.test(c.mongoClusterTime)||!fresh(c.frozenAt,now)||
     !Number.isFinite(stamp(c.leaseExpiresAt))||stamp(c.leaseExpiresAt)<=now||
     stamp(c.leaseExpiresAt)-stamp(c.frozenAt)>MAX_AGE||
     !Number.isFinite(stamp(c.finalSyncCompletedAt))||!Number.isFinite(stamp(c.parityVerifiedAt))||
     stamp(c.finalSyncCompletedAt)<stamp(c.frozenAt)||stamp(c.parityVerifiedAt)<stamp(c.finalSyncCompletedAt)||
     stamp(c.parityVerifiedAt)>now+60_000||
     c.writerScope!=='all_application_admin_webhook_cron_external_writers'||c.activeWriterCount!==0||
     c.unreconciledAcceptedWrites!==0)errors.push('FINAL_WRITE_FREEZE_AND_PARITY_UNVERIFIED');
  for(const [key]of GATES){
    const a=e.gates?.[key];
    if(!a||!Number.isSafeInteger(a.runId)||a.runId<=0||!Number.isSafeInteger(a.artifactId)||a.artifactId<=0||
       !HASH.test(a.archiveSha256||'')||!HASH.test(a.payloadSha256||''))errors.push('GATE_BLOCKED:'+key);
  }
  return errors;
}

// Compatibility API deliberately cannot release from a JSON document. Only
// verifyCutover can mint an in-memory proof after independent source reads.
export function assessCutover(e,{now=Date.now(),sha,expected,proof}={}){
  const errors=structuralErrors(e,{now,sha,expected});
  if(!errors.includes('EVIDENCE_ABSENT')&&!certified.has(proof))errors.push('INDEPENDENT_ARTIFACT_VERIFICATION_REQUIRED');
  return {go:errors.length===0,errors,totalGates:GATES.length};
}

function crc32(bytes){
  let n=0xffffffff;
  for(const b of bytes){n^=b;for(let k=0;k<8;k++)n=(n>>>1)^((n&1)?0xedb88320:0)}
  return (n^0xffffffff)>>>0;
}
/** Read ZIP members in memory; no archive path is ever written to disk. */
export function artifactPayload(archive,path){
  if(!Buffer.isBuffer(archive)||archive.length>MAX_ARCHIVE||archive.length<22)fail('ARTIFACT_ARCHIVE_INVALID');
  let end=-1;
  for(let n=archive.length-22;n>=Math.max(0,archive.length-65557);n--){
    if(archive.readUInt32LE(n)===0x06054b50&&n+22+archive.readUInt16LE(n+20)===archive.length){end=n;break}
  }
  if(end<0||archive.readUInt16LE(end+4)||archive.readUInt16LE(end+6))fail('ARTIFACT_ZIP_UNSUPPORTED');
  const count=archive.readUInt16LE(end+10),size=archive.readUInt32LE(end+12),offset=archive.readUInt32LE(end+16);
  if(!count||count>100||count!==archive.readUInt16LE(end+8)||offset+size!==end)fail('ARTIFACT_DIRECTORY_INVALID');
  const seen=new Set();let cursor=offset,result;
  for(let n=0;n<count;n++){
    if(cursor+46>end||archive.readUInt32LE(cursor)!==0x02014b50)fail('ARTIFACT_DIRECTORY_INVALID');
    const flags=archive.readUInt16LE(cursor+8),method=archive.readUInt16LE(cursor+10);
    const compressed=archive.readUInt32LE(cursor+20),length=archive.readUInt32LE(cursor+24);
    const nameLen=archive.readUInt16LE(cursor+28),extra=archive.readUInt16LE(cursor+30),comment=archive.readUInt16LE(cursor+32);
    const local=archive.readUInt32LE(cursor+42),mode=archive.readUInt32LE(cursor+38)>>>16;
    if(cursor+46+nameLen+extra+comment>end)fail('ARTIFACT_DIRECTORY_INVALID');
    const name=archive.subarray(cursor+46,cursor+46+nameLen).toString('utf8');
    if(!name||name.includes('\\')||name.startsWith('/')||name.split('/').some(x=>x==='..'||x==='.')||seen.has(name)||
       (mode&0xf000)===0xa000||flags&1||![0,8].includes(method)||length>MAX_PAYLOAD||compressed>MAX_ARCHIVE)fail('ARTIFACT_MEMBER_INVALID');
    seen.add(name);
    if(name===path){
      if(local+30>offset||archive.readUInt32LE(local)!==0x04034b50||archive.readUInt16LE(local+8)!==method||
         archive.readUInt16LE(local+6)!==flags)fail('ARTIFACT_LOCAL_HEADER_INVALID');
      const localName=archive.readUInt16LE(local+26),localExtra=archive.readUInt16LE(local+28);
      const start=local+30+localName+localExtra;
      if(start+compressed>offset||archive.subarray(local+30,local+30+localName).toString('utf8')!==name)fail('ARTIFACT_LOCAL_HEADER_INVALID');
      const bytes=archive.subarray(start,start+compressed);
      result=method===0?Buffer.from(bytes):inflateRawSync(bytes,{maxOutputLength:MAX_PAYLOAD});
      if(result.length!==length||crc32(result)!==archive.readUInt32LE(cursor+16))fail('ARTIFACT_MEMBER_CORRUPT');
    }
    cursor+=46+nameLen+extra+comment;
  }
  if(cursor!==end||!result)fail('ARTIFACT_PAYLOAD_MISSING');
  return result;
}

async function limitedBytes(response,limit){
  if(Number(response.headers.get('content-length'))>limit)fail('GITHUB_RESPONSE_TOO_LARGE');
  const reader=response.body.getReader();let size=0;const chunks=[];
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit)fail('GITHUB_RESPONSE_TOO_LARGE');chunks.push(Buffer.from(value))}}
  finally{await reader.cancel().catch(()=>{})}
  return Buffer.concat(chunks);
}
/** Token is sent only to api.github.com, never to an artifact redirect host. */
export function githubEvidenceSource({token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN,fetchImpl=fetch}={}){
  const request=async path=>{
    if(!token)fail('GITHUB_READ_CREDENTIAL_REQUIRED');
    return fetchImpl('https://api.github.com/repos/'+REPOSITORY+path,{redirect:'manual',signal:AbortSignal.timeout(20_000),
      headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
  };
  return {
    async json(path){const r=await request(path);if(r.status!==200)fail('GITHUB_READ_FAILED_'+r.status);return JSON.parse((await limitedBytes(r,2*1024*1024)).toString('utf8'))},
    async archive(id){
      let r=await request('/actions/artifacts/'+id+'/zip');
      if(r.status===302){
        let u;try{u=new URL(r.headers.get('location'))}catch{fail('ARTIFACT_REDIRECT_INVALID')}
        if(u.protocol!=='https:'||u.username||u.password||u.port||
           !(/^[a-z0-9.-]+\.blob\.core\.windows\.net$/.test(u.hostname)||/^[a-z0-9.-]+\.actions\.githubusercontent\.com$/.test(u.hostname)||u.hostname==='objects.githubusercontent.com'))fail('ARTIFACT_REDIRECT_NOT_TRUSTED');
        r=await fetchImpl(u.href,{redirect:'error',signal:AbortSignal.timeout(20_000)});
      }
      if(r.status!==200)fail('ARTIFACT_DOWNLOAD_FAILED_'+r.status);
      return limitedBytes(r,MAX_ARCHIVE);
    },
  };
}

export async function verifyCutover(e,{now,sha,expected,source=githubEvidenceSource()}={}){
  // Capture caller-owned JSON before awaiting independent sources.
  e=e==null?e:structuredClone(e);
  const checkedAt=now??Date.now();
  const errors=structuralErrors(e,{now:checkedAt,sha,expected}),verified=[];
  if(errors.length)return {go:false,errors,totalGates:GATES.length,verified};
  const runs=new Map(),workflowBlobs=new Map();
  for(const [gate]of GATES){
    try{
      const a=e.gates[gate];
      if(!runs.has(a.runId))runs.set(a.runId,await source.json('/actions/runs/'+a.runId));
      const run=runs.get(a.runId),path=run.path;
      if(run.id!==a.runId||run.repository?.full_name!==REPOSITORY||run.head_repository?.full_name!==REPOSITORY||
         run.head_sha!==sha||run.status!=='completed'||run.conclusion!=='success'||run.event!=='workflow_dispatch'||
         !Number.isSafeInteger(run.run_attempt)||run.run_attempt<1||!Number.isFinite(stamp(run.run_started_at))||
         !fresh(run.updated_at,checkedAt)||path!==GATE_PRODUCERS[gate]||!APPROVED_WORKFLOWS[path])fail('CI_SOURCE_NOT_CERTIFIED');
      if(!workflowBlobs.has(path))workflowBlobs.set(path,await source.json('/contents/'+path+'?ref='+sha));
      if(workflowBlobs.get(path).sha!==APPROVED_WORKFLOWS[path])fail('CI_WORKFLOW_NOT_REVIEWED');
      const metadata=await source.json('/actions/artifacts/'+a.artifactId);
      if(metadata.id!==a.artifactId||metadata.expired!==false||metadata.workflow_run?.id!==a.runId||
         metadata.workflow_run?.head_sha!==sha||metadata.name!=='turso-release-'+gate||
         metadata.digest!=='sha256:'+a.archiveSha256||!Number.isSafeInteger(metadata.size_in_bytes)||
         metadata.size_in_bytes<1||metadata.size_in_bytes>MAX_ARCHIVE||
         !Number.isFinite(stamp(metadata.created_at))||stamp(metadata.created_at)<stamp(run.run_started_at)||
         stamp(metadata.created_at)>stamp(run.updated_at)+60_000)fail('ARTIFACT_PROVENANCE_MISMATCH');
      const archive=await source.archive(a.artifactId);
      if(digest(archive)!==a.archiveSha256)fail('ARTIFACT_ARCHIVE_HASH_MISMATCH');
      const bytes=artifactPayload(archive,'release-evidence/'+gate+'.json');
      if(digest(bytes)!==a.payloadSha256)fail('ARTIFACT_PAYLOAD_HASH_MISMATCH');
      const payload=JSON.parse(bytes.toString('utf8'));
      if(payload.schemaVersion!==2||payload.kind!=='TURSO_RELEASE_GATE_EVIDENCE'||payload.gate!==gate||
         payload.repository!==REPOSITORY||payload.commit!==sha||payload.runId!==a.runId||
         payload.runAttempt!==run.run_attempt||
         payload.environment!=='production-cutover'||payload.result!=='passed'||!fresh(payload.collectedAt,checkedAt)||
         stamp(payload.collectedAt)<stamp(e.consistency.parityVerifiedAt)||
         payload.bindingSha256!==bindingDigest(e.binding)||payload.checkpointSha256!==expected.checkpointSha256||
         payload.rollbackCandidateDeploymentId!==e.rollbackCandidateDeploymentId)fail('GATE_PAYLOAD_BINDING_MISMATCH');
      if(!Array.isArray(payload.checks)||payload.checks.length!==REQUIRED_CHECKS[gate].length||
         new Set(payload.checks.map(c=>c.id)).size!==payload.checks.length||
         REQUIRED_CHECKS[gate].some(id=>!payload.checks.some(c=>c.id===id&&c.result==='passed')))fail('GATE_COVERAGE_INCOMPLETE');
      if(gate==='historicalParity'&&(['missing','extra','orphans','semanticMismatches','moneyDeltaCents','inventoryDeltaUnits'].some(k=>payload.measurements?.[k]!==0)||
         !HASH.test(payload.measurements?.sourceSemanticSha256||'')||payload.measurements.sourceSemanticSha256!==payload.measurements.targetSemanticSha256))fail('HISTORICAL_DISCREPANCY_UNRESOLVED');
      if(gate==='runtimeRoutes'&&payload.measurements?.requiredMongoOperations!==0)fail('MONGO_RUNTIME_DEPENDENCY_REMAINS');
      if(gate==='catalogAuthority'&&payload.measurements?.unexplainedMaterialDiscrepancies!==0)fail('CATALOG_DISCREPANCY_UNRESOLVED');
      if(gate==='reverseDelta'&&(payload.measurements?.acceptedWrites!==payload.measurements?.recoveredWrites||
         !Number.isSafeInteger(payload.measurements?.acceptedWrites)||payload.measurements.acceptedWrites<1||payload.measurements?.unreconciledWrites!==0))fail('POST_WRITE_RECOVERY_UNVERIFIED');
      if(gate==='reverseDelta'&&(!HASH.test(payload.measurements?.acceptedWriteSetSha256||'')||
         payload.measurements.acceptedWriteSetSha256!==payload.measurements.recoveredWriteSetSha256))fail('RECOVERED_WRITE_IDENTITIES_MISMATCH');
      if(gate==='restoreDrill'&&(!Number.isSafeInteger(payload.measurements?.verifiedRestoredDocuments)||payload.measurements.verifiedRestoredDocuments<1||
         payload.measurements.verifiedRestoredDocuments!==payload.measurements.snapshotDocuments||
         !Number.isSafeInteger(payload.measurements?.verifiedRestoredCollections)||payload.measurements.verifiedRestoredCollections<1||
         payload.measurements.verifiedRestoredCollections!==payload.measurements.snapshotCollections||
         !Number.isSafeInteger(payload.measurements?.verifiedRestoredTursoRows)||payload.measurements.verifiedRestoredTursoRows<1||
         payload.measurements.verifiedRestoredTursoRows!==payload.measurements.snapshotTursoRows||
         !HASH.test(payload.measurements?.snapshotSemanticSha256||'')||payload.measurements.snapshotSemanticSha256!==payload.measurements.restoredSemanticSha256||
         payload.measurements?.integrityMismatches!==0))fail('ACTUAL_RESTORE_UNVERIFIED');
      verified.push({gate,runId:a.runId,artifactId:a.artifactId,archiveSha256:a.archiveSha256,payloadSha256:a.payloadSha256,
        evidenceUrl:'https://github.com/'+REPOSITORY+'/actions/runs/'+a.runId});
    }catch(error){errors.push('GATE_BLOCKED:'+gate+':'+(/^[A-Z_0-9]+$/.test(error?.message||'')?error.message:'SOURCE_OR_PAYLOAD_INVALID'))}
  }
  if(errors.length)return {go:false,errors,totalGates:GATES.length,verified};
  const proof={};certified.add(proof);
  return {...assessCutover(e,{now:now??Date.now(),sha,expected,proof}),verified};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href&&!process.env.TURSO_CUTOVER_LIBRARY_TEST){
  let e=null,expected;
  try{if(process.argv[2])e=JSON.parse(readFileSync(process.argv[2],'utf8'))}catch{}
  if(e)try{expected={schema:schemaIdentity(),sourceDatabaseSha256:process.env.TURSO_CUTOVER_SOURCE_IDENTITY_SHA256,
    targetDatabaseSha256:process.env.TURSO_CUTOVER_TARGET_IDENTITY_SHA256,checkpointSha256:process.env.TURSO_CUTOVER_CHECKPOINT_SHA256}}catch{}
  const result=await verifyCutover(e,{sha:process.env.GITHUB_SHA,expected});
  console.log(JSON.stringify(result,null,2));if(!result.go)process.exitCode=1;
}
