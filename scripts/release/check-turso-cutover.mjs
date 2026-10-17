#!/usr/bin/env node
/**
 * Deliberately fail-closed release preflight. A successful test on the
 * historical staging data is not authorization to flip production.
 * This script reads evidence metadata only; it never mutates deployments.
 */
import {readFileSync} from 'node:fs';

export const GATES=[
  ['runtimeRoutes','Actual buyer routes (orders, payments, market preorders, refunds, receipts, admin/rewards) all use one Turso authority'],
  ['previewIsolation','Preview credentials are restricted to staging, never Production'],
  ['providerSandbox','Real Square Sandbox charge/refund and provider readback integrated with the app'],
  ['signedWebhookDelivery','Real signed Square event received by deployed Preview and reconciled'],
  ['realCustomerNotification','Test customer notification accepted and delivered with provider message ID'],
  ['realStaffNotification','Test staff notification accepted and delivered with provider message ID'],
  ['catalogAuthority','Live Square catalog variation identities, name, cents, availability reconciled'],
  ['historicalParity','Snapshot plus final delta parity matches source at write freeze'],
  ['liveReadModel','Preview buyer order history, catalog, stock and paid/refunded receipt read Turso'],
  ['customerBrowserE2E','Desktop and mobile browser buyer checkout/refund run on exact Turso Preview SHA'],
  ['skippedTests','All known skipped tests have explicit passing substitutes or documented accepted exclusions'],
  ['restoreDrill','Actual Mongo backup/PITR and isolated restore independently verified'],
  ['reverseDelta','Post-cutover rollback Mongo catch-up plan tested with zero unreconciled writes'],
  ['productionRollback','Rollback to pinned stable Vercel deployment verified without data loss'],
  ['operatorReview','Cutover independently approved with monitored rollback window']
];
export function assessCutover(evidence,{now=Date.now(),sha}={}){
 const errors=[];
 if(!evidence||typeof evidence!=='object')return {go:false,errors:['EVIDENCE_ABSENT']};
 if(!/^[a-f0-9]{40}$/.test(evidence.commit||'') || evidence.commit!==sha)
   errors.push('COMMIT_IDENTITY_MISSING_OR_MISMATCH');
 const at=Date.parse(evidence.attestedAt||'');
 if(!Number.isFinite(at)||at>now+60_000 || now-at>30*60_000)
   errors.push('FRESH_ATTESTATION_REQUIRED');
 if(evidence.environment!=='production-cutover' || evidence.authority!=='independent_release_certification')
   errors.push('RELEASE_SCOPE_UNVERIFIED');
 if(!evidence.rollbackCandidateDeploymentId || !/^dpl_[a-zA-Z0-9]+$/.test(evidence.rollbackCandidateDeploymentId))
   errors.push('ROLLBACK_DEPLOYMENT_UNPINNED');
 if(evidence.sourceReadOnly !== true || evidence.livePaymentsUnmodified!==true)
   errors.push('SOURCE_OR_PAYMENT_SAFETY_UNVERIFIED');
 for(const [key] of GATES){
   const item=evidence.gates?.[key];
   if(!item || item.pass!==true ||
      !Array.isArray(item.evidenceUrls) || item.evidenceUrls.length===0 ||
      !item.evidenceUrls.every(url=>typeof url==='string' && url.startsWith('https://') && url.length>12)){
     errors.push('GATE_BLOCKED:'+key);
   }
 }
 return {go:errors.length===0,errors,totalGates:GATES.length};
}

if(process.argv[1]?.endsWith('check-turso-cutover.mjs') && !process.env.TURSO_CUTOVER_LIBRARY_TEST) {
 const file=process.argv[2];
 let evidence=null;
 if(file)try{evidence=JSON.parse(readFileSync(file,'utf8'))}catch{}
 const result=assessCutover(evidence,{sha:process.env.GITHUB_SHA});
 console.log(JSON.stringify(result,null,2));
 if(!result.go)process.exitCode=1;
}
