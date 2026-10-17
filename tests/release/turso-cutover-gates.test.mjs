import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCutover,GATES} from '../../scripts/release/check-turso-cutover.mjs';
const SHA='a'.repeat(40);
function fakeAllPass(){
 return {
  commit:SHA,attestedAt:new Date().toISOString(),environment:'production-cutover',
  authority:'independent_release_certification',rollbackCandidateDeploymentId:'dpl_knownstable',
  sourceReadOnly:true,livePaymentsUnmodified:true,
  gates:Object.fromEntries(GATES.map(([key])=>[key,{pass:true,evidenceUrls:['https://github.com/evidence/'+key]}]))
 };
}
test('a missing real release attestation ALWAYS blocks production cutover',()=>{
 const x=assessCutover(null,{sha:SHA});
 assert.equal(x.go,false);
 assert.deepEqual(x.errors,['EVIDENCE_ABSENT']);
});
test('historical Square provider-only proof cannot substitute for website webhook or email delivery',()=>{
 const e=fakeAllPass();
 delete e.gates.signedWebhookDelivery;
 delete e.gates.realCustomerNotification;
 delete e.gates.realStaffNotification;
 const x=assessCutover(e,{sha:SHA});
 assert.equal(x.go,false);
 for(const part of ['signedWebhookDelivery','realCustomerNotification','realStaffNotification'])
   assert.ok(x.errors.includes('GATE_BLOCKED:'+part));
});
test('rejects stale snapshot and a mismatch with the exact promoted source commit',()=>{
 const e=fakeAllPass();
 e.attestedAt='2026-09-01T00:00:00Z';
 const x=assessCutover(e,{sha:'b'.repeat(40)});
 assert.equal(x.go,false);
 assert.ok(x.errors.includes('FRESH_ATTESTATION_REQUIRED'));
 assert.ok(x.errors.includes('COMMIT_IDENTITY_MISSING_OR_MISMATCH'));
});
test('catalog conflict, no real restore drill, or incomplete native application blocks promotion',()=>{
 const e=fakeAllPass();
 for(const key of ['catalogAuthority','restoreDrill','runtimeRoutes'])e.gates[key]={pass:false,evidenceUrls:[]};
 const x=assessCutover(e,{sha:SHA});
 assert.equal(x.go,false);
 assert.ok(x.errors.includes('GATE_BLOCKED:catalogAuthority'));
 assert.ok(x.errors.includes('GATE_BLOCKED:restoreDrill'));
 assert.ok(x.errors.includes('GATE_BLOCKED:runtimeRoutes'));
});
test('only a fully evidenced exact SHA with fresh attestation can satisfy the mechanical preflight',()=>{
 const e=fakeAllPass(),x=assessCutover(e,{sha:SHA});
 assert.equal(x.go,true);
 assert.equal(x.totalGates,15);
});
