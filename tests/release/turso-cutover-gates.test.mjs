import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {deflateRawSync} from 'node:zlib';
import {assessCutover,verifyCutover,GATES,REQUIRED_CHECKS,APPROVED_WORKFLOWS,
  GATE_PRODUCERS,digest,bindingDigest,artifactPayload,githubEvidenceSource}
  from '../../scripts/release/check-turso-cutover.mjs';

// All successful evidence in this file is synthetic transport/CI fixtures.
// No test artifact is a production attestation, and none is written to disk.
const SHA='a'.repeat(40),NOW=Date.parse('2026-10-19T03:00:00Z');
const at=seconds=>new Date(NOW+seconds*1000).toISOString();
function crc32(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0)}return(n^0xffffffff)>>>0}
function zip(path,bytes,{deflated=false}={}){
  const name=Buffer.from(path),local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);
  const compressed=deflated?deflateRawSync(bytes):bytes,method=deflated?8:0;
  local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt32LE(crc32(bytes),14);
  local.writeUInt16LE(method,8);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(name.length,26);
  central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);
  central.writeUInt16LE(method,10);central.writeUInt32LE(crc32(bytes),16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(bytes.length,24);central.writeUInt16LE(name.length,28);
  end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);
  end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(local.length+name.length+compressed.length,16);
  return Buffer.concat([local,name,compressed,central,name,end]);
}
function fixture(){
  const binding={sourceDatabaseSha256:digest('fixture-mongo-cluster'),targetDatabaseSha256:digest('fixture-turso-production'),
    schema:{version:'0015_admin_identity.sql',sha256:digest('fixture-reviewed-schema')}};
  const consistency={method:'bounded-write-freeze',sourceSnapshotSha256:digest('fixture-encrypted-snapshot'),
    targetCheckpointSha256:digest('fixture-final-target-checkpoint'),mongoClusterTime:'1792378800:1',
    frozenAt:at(-120),leaseExpiresAt:at(600),finalSyncCompletedAt:at(-90),parityVerifiedAt:at(-60),
    writerScope:'all_application_admin_webhook_cron_external_writers',activeWriterCount:0,unreconciledAcceptedWrites:0};
  const manifest={schemaVersion:2,repository:'wizelements/Gratog',commit:SHA,attestedAt:at(-5),
    environment:'production-cutover',authority:'independent_release_certification',
    rollbackCandidateDeploymentId:'dpl_fixtureOnly',binding,consistency,gates:{}};
  const expected={...structuredClone(binding),checkpointSha256:bindingDigest(consistency)};
  const runs=new Map(),metadata=new Map(),archives=new Map(),payloads=new Map(),requests=[];
  const update=(gate,edit=()=>{})=>{
    const i=GATES.findIndex(([key])=>key===gate),runId=1000+i,artifactId=2000+i;
    let payload=payloads.get(gate)||{schemaVersion:2,kind:'TURSO_RELEASE_GATE_EVIDENCE',gate,
      repository:'wizelements/Gratog',commit:SHA,runId,environment:'production-cutover',result:'passed',
      runAttempt:1,
      collectedAt:at(-20),bindingSha256:bindingDigest(binding),checkpointSha256:expected.checkpointSha256,
      rollbackCandidateDeploymentId:manifest.rollbackCandidateDeploymentId,
      checks:REQUIRED_CHECKS[gate].map(id=>({id,result:'passed'})),measurements:{
        missing:0,extra:0,orphans:0,semanticMismatches:0,moneyDeltaCents:0,inventoryDeltaUnits:0,
        requiredMongoOperations:0,unexplainedMaterialDiscrepancies:0,acceptedWrites:12,recoveredWrites:12,
        acceptedWriteSetSha256:digest('fixture-accepted-write-identities'),recoveredWriteSetSha256:digest('fixture-accepted-write-identities'),
        sourceSemanticSha256:digest('fixture-final-semantic-records'),targetSemanticSha256:digest('fixture-final-semantic-records'),
        unreconciledWrites:0,verifiedRestoredDocuments:7919,snapshotDocuments:7919,verifiedRestoredCollections:59,snapshotCollections:59,
        verifiedRestoredTursoRows:7697,snapshotTursoRows:7697,snapshotSemanticSha256:digest('fixture-backup-records'),restoredSemanticSha256:digest('fixture-backup-records'),integrityMismatches:0}};
    edit(payload);payloads.set(gate,payload);
    const bytes=Buffer.from(JSON.stringify(payload)),archive=zip('release-evidence/'+gate+'.json',bytes);
    manifest.gates[gate]={runId,artifactId,archiveSha256:digest(archive),payloadSha256:digest(bytes)};
    archives.set(artifactId,archive);
    metadata.set(artifactId,{id:artifactId,name:'turso-release-'+gate,expired:false,size_in_bytes:archive.length,created_at:at(-15),
      workflow_run:{id:runId,head_sha:SHA},digest:'sha256:'+digest(archive)});
    runs.set(runId,{id:runId,repository:{full_name:'wizelements/Gratog'},head_repository:{full_name:'wizelements/Gratog'},
      head_sha:SHA,status:'completed',conclusion:'success',event:'workflow_dispatch',updated_at:at(-10),run_started_at:at(-30),run_attempt:1,path:GATE_PRODUCERS[gate]});
  };
  for(const [gate]of GATES)update(gate);
  const source={
    async json(path){
      requests.push(path);
      if(path.startsWith('/actions/runs/'))return structuredClone(runs.get(Number(path.split('/').at(-1))));
      if(path.startsWith('/actions/artifacts/'))return structuredClone(metadata.get(Number(path.split('/').at(-1))));
      if(path.startsWith('/contents/'))return {sha:APPROVED_WORKFLOWS[path.slice('/contents/'.length).split('?')[0]]};
      throw Error('UNEXPECTED_FIXTURE_REQUEST');
    },
    async archive(id){requests.push('archive:'+id);return archives.get(id)},
  };
  return {manifest,expected,runs,metadata,archives,payloads,source,requests,update};
}
const run=f=>verifyCutover(f.manifest,{sha:SHA,now:NOW,expected:f.expected,source:f.source});
const blocked=(result,fragment)=>{assert.equal(result.go,false);assert.ok(result.errors.some(e=>e.includes(fragment)),JSON.stringify(result.errors))};

test('missing real release evidence remains HOLD without any network read',async()=>{
  const f=fixture();const r=await verifyCutover(null,{sha:SHA,now:NOW,source:f.source});
  assert.deepEqual(r.errors,['EVIDENCE_ABSENT']);assert.equal(r.go,false);assert.equal(f.requests.length,0);
});
test('legacy pass booleans and arbitrary HTTPS URLs have no release authority',async()=>{
  const f=fixture();f.manifest.schemaVersion=1;
  f.manifest.gates=Object.fromEntries(GATES.map(([k])=>[k,{pass:true,evidenceUrls:['https://example.invalid/forged']} ]));
  blocked(await run(f),'EVIDENCE_V2_REQUIRED');assert.equal(f.requests.length,0);
});
test('synchronous compatibility API cannot approve self-reported V2 metadata',()=>{
  const f=fixture();blocked(assessCutover(f.manifest,{sha:SHA,now:NOW,expected:f.expected,proof:{}}),'INDEPENDENT_ARTIFACT_VERIFICATION_REQUIRED');
});
test('complete hash-verified fixture payloads with independently read CI provenance pass',async()=>{
  const f=fixture(),r=await run(f);assert.equal(r.go,true,JSON.stringify(r.errors));assert.equal(r.verified.length,GATES.length);
  assert.ok(r.verified.every(v=>v.evidenceUrl.startsWith('https://github.com/wizelements/Gratog/actions/runs/')));
});
test('release SHA must match the independently selected candidate',async()=>{
  const f=fixture();f.manifest.commit='b'.repeat(40);blocked(await run(f),'COMMIT_IDENTITY_MISSING_OR_MISMATCH');assert.equal(f.requests.length,0);
});
test('old schema and unpinned databases cannot borrow newer migration evidence',async()=>{
  const f=fixture();f.manifest.binding.schema.version='0014_legacy_commerce_references.sql';blocked(await run(f),'SCHEMA_IDENTITY_MISMATCH');
  const g=fixture();delete g.expected.targetDatabaseSha256;blocked(await run(g),'INDEPENDENT_DATABASE_SCHEMA_CHECKPOINT_PINS_REQUIRED');
});
test('database identity and consistency checkpoint are independently pinned',async()=>{
  const f=fixture();f.manifest.binding.targetDatabaseSha256=digest('fixture-different-database');blocked(await run(f),'DATABASE_IDENTITY_MISMATCH');
  const g=fixture();g.manifest.consistency.sourceSnapshotSha256=digest('fixture-other-snapshot');blocked(await run(g),'CONSISTENCY_CHECKPOINT_MISMATCH');
});
test('absent, expired or partial writer freeze cannot pass final consistency',async()=>{
  for(const change of [c=>{c.activeWriterCount=1},c=>{c.writerScope='only_http_checkout'},c=>{c.leaseExpiresAt=at(-1)},c=>{c.unreconciledAcceptedWrites=1},c=>{c.finalSyncCompletedAt=at(-180)}]){
    const f=fixture();change(f.manifest.consistency);f.expected.checkpointSha256=bindingDigest(f.manifest.consistency);
    blocked(await run(f),'FINAL_WRITE_FREEZE_AND_PARITY_UNVERIFIED');
  }
});
test('stale manifest and stale run conclusions cannot certify a fresh release',async()=>{
  const f=fixture();f.manifest.attestedAt=at(-1900);blocked(await run(f),'FRESH_ATTESTATION_REQUIRED');
  const g=fixture();g.runs.get(g.manifest.gates.providerSandbox.runId).updated_at=at(-1900);blocked(await run(g),'CI_SOURCE_NOT_CERTIFIED');
});
test('failed, wrong-SHA and untrusted-repository CI sources are rejected',async()=>{
  for(const change of [r=>{r.conclusion='failure'},r=>{r.head_sha='b'.repeat(40)},r=>{r.head_repository.full_name='attacker/Gratog'},r=>{r.event='pull_request'}]){
    const f=fixture();change(f.runs.get(f.manifest.gates.providerSandbox.runId));blocked(await run(f),'CI_SOURCE_NOT_CERTIFIED');
  }
});
test('a fixture or different workflow cannot certify another gate',async()=>{
  const f=fixture();f.runs.get(f.manifest.gates.restoreDrill.runId).path='.github/workflows/mongo-clone-reverse-delta.yml';
  blocked(await run(f),'CI_SOURCE_NOT_CERTIFIED');
});
test('changing a producer workflow requires explicit independent policy review',async()=>{
  const f=fixture(),base=f.source.json;
  f.source.json=async path=>path.startsWith('/contents/')?{sha:'0'.repeat(40)}:base(path);
  blocked(await run(f),'CI_WORKFLOW_NOT_REVIEWED');
});
test('expired or unrelated artifact metadata cannot authorize release',async()=>{
  for(const change of [m=>{m.expired=true},m=>{m.workflow_run.id++},m=>{m.workflow_run.head_sha='b'.repeat(40)},m=>{m.digest='sha256:'+'0'.repeat(64)},m=>{m.created_at=at(-300)}]){
    const f=fixture();change(f.metadata.get(f.manifest.gates.restoreDrill.artifactId));blocked(await run(f),'ARTIFACT_PROVENANCE_MISMATCH');
  }
});
test('tampered downloaded archive and payload digest mismatch are rejected',async()=>{
  const f=fixture(),id=f.manifest.gates.restoreDrill.artifactId;const altered=Buffer.from(f.archives.get(id));altered[40]^=1;f.archives.set(id,altered);
  blocked(await run(f),'ARTIFACT_ARCHIVE_HASH_MISMATCH');
  const g=fixture();g.manifest.gates.restoreDrill.payloadSha256='0'.repeat(64);blocked(await run(g),'ARTIFACT_PAYLOAD_HASH_MISMATCH');
});
test('hash-valid payload with stale SHA schema binding or checkpoint remains blocked',async()=>{
  for(const change of [p=>{p.commit='b'.repeat(40)},p=>{p.bindingSha256=digest('old-schema')},p=>{p.checkpointSha256=digest('old-checkpoint')}]){
    const f=fixture();f.update('historicalParity',change);blocked(await run(f),'GATE_PAYLOAD_BINDING_MISMATCH');
  }
});
test('incomplete browser, revocation or mutation coverage is a mandatory failure',async()=>{
  for(const gate of ['customerBrowserE2E','runtimeRoutes','reverseDelta']){
    const f=fixture();f.update(gate,p=>p.checks.pop());blocked(await run(f),'GATE_COVERAGE_INCOMPLETE');
  }
});
test('duplicates and passing substitutes cannot replace a missing required check',async()=>{
  const f=fixture();f.update('restoreDrill',p=>{p.checks[1]=p.checks[0]});blocked(await run(f),'GATE_COVERAGE_INCOMPLETE');
});
test('financial discrepancies and absent actual restore/recovery counts block release',async()=>{
  const cases=[['historicalParity',p=>{p.measurements.moneyDeltaCents=1},'HISTORICAL_DISCREPANCY_UNRESOLVED'],
    ['catalogAuthority',p=>{p.measurements.unexplainedMaterialDiscrepancies=1},'CATALOG_DISCREPANCY_UNRESOLVED'],
    ['runtimeRoutes',p=>{p.measurements.requiredMongoOperations=1},'MONGO_RUNTIME_DEPENDENCY_REMAINS'],
    ['reverseDelta',p=>{p.measurements.recoveredWrites=11},'POST_WRITE_RECOVERY_UNVERIFIED'],
    ['reverseDelta',p=>{p.measurements.acceptedWrites=0;p.measurements.recoveredWrites=0},'POST_WRITE_RECOVERY_UNVERIFIED'],
    ['reverseDelta',p=>{p.measurements.recoveredWriteSetSha256=digest('different-writes')},'RECOVERED_WRITE_IDENTITIES_MISMATCH'],
    ['restoreDrill',p=>{p.measurements.verifiedRestoredDocuments=0},'ACTUAL_RESTORE_UNVERIFIED'],
    ['restoreDrill',p=>{p.measurements.verifiedRestoredTursoRows=1},'ACTUAL_RESTORE_UNVERIFIED'],
    ['restoreDrill',p=>{p.measurements.restoredSemanticSha256=digest('different-restored-records')},'ACTUAL_RESTORE_UNVERIFIED']];
  for(const [gate,edit,error]of cases){const f=fixture();f.update(gate,edit);blocked(await run(f),error)}
});
test('archive parser rejects traversal and corrupted member content without writing files',()=>{
  assert.throws(()=>artifactPayload(zip('../release.json',Buffer.from('{}')),'../release.json'),/ARTIFACT_MEMBER_INVALID/);
  const bytes=zip('release-evidence/gate.json',Buffer.from('{}'));bytes[30+'release-evidence/gate.json'.length]^=1;
  assert.throws(()=>artifactPayload(bytes,'release-evidence/gate.json'),/ARTIFACT_MEMBER_CORRUPT/);
});
test('bounded ZIP reader supports real deflated JSON members',()=>{
  const bytes=Buffer.from(JSON.stringify({kind:'fixture',records:Array.from({length:20},()=>({value:'repeated fixture text'}))}));
  assert.deepEqual(artifactPayload(zip('release-evidence/gate.json',bytes,{deflated:true}),'release-evidence/gate.json'),bytes);
});
test('GitHub bearer token is never forwarded to signed artifact storage',async()=>{
  const calls=[],token='fixture-not-a-real-token';
  const source=githubEvidenceSource({token,fetchImpl:async(url,options)=>{
    calls.push({url,options});return calls.length===1?new Response(null,{status:302,headers:{location:'https://fixture.blob.core.windows.net/archive?sig=fixture'}}):new Response(Buffer.from('fixture-archive'));
  }});
  assert.equal((await source.archive(1)).toString(),'fixture-archive');
  assert.equal(calls[0].options.headers.Authorization,'Bearer '+token);assert.equal(calls[1].options.headers,undefined);
});
test('untrusted artifact redirects and missing credentials fail closed',async()=>{
  const source=githubEvidenceSource({token:'fixture',fetchImpl:async()=>new Response(null,{status:302,headers:{location:'https://attacker.invalid/archive'}})});
  await assert.rejects(()=>source.archive(1),/ARTIFACT_REDIRECT_NOT_TRUSTED/);
  await assert.rejects(()=>githubEvidenceSource({token:''}).json('/actions/runs/1'),/GITHUB_READ_CREDENTIAL_REQUIRED/);
});
test('CLI without genuine evidence returns HOLD and a nonzero exit code',()=>{
  const script=fileURLToPath(new URL('../../scripts/release/check-turso-cutover.mjs',import.meta.url));
  const r=spawnSync(process.execPath,[script],{encoding:'utf8',env:{...process.env,TURSO_CUTOVER_LIBRARY_TEST:''}});
  assert.equal(r.status,1,r.stderr);assert.equal(JSON.parse(r.stdout).go,false);assert.ok(JSON.parse(r.stdout).errors.includes('EVIDENCE_ABSENT'));
});
