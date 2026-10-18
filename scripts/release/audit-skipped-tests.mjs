#!/usr/bin/env node
/**
 * Inventories the EXACT known skipped Vitest tests, not a blanket waiver.
 * Fails if any new skip is added or one is removed without updating evidence.
 * Output is an inventory, never a release-pass certificate.
 */
import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
const read=file=>readFileSync(file,'utf8');
const block=read('tests/reviews-flow.test.ts');
const reviews=(block.match(/^\s*it\(/gm)||[]).length;
const mongo=read('tests/integration/checkout-mongo-race.test.ts');
const replica=(mongo.match(/^\s*it\(/gm)||[]).length;
const hydration=read('tests/hydration-issues.test.ts');
const ssr=(hydration.match(/\bit\.skip\(/g)||[]).length;
const apiPresent=existsSync('app/api/reviews/route.ts')||existsSync('app/api/reviews/route.js');
const result={
  kind:'KNOWN_SKIP_DISPOSITION',
  observedSkipCount:reviews+replica+ssr,
  baseline:12,
  tests:[
    {suite:'tests/reviews-flow.test.ts',count:reviews,
      status:'BLOCKED',cause:'Consumer review submission/read/voting API was removed while storefront still references it',
      requiredEvidence:'Restore secure APIs and verify moderation/privacy/limits, or disable UI and approve an explicit exclusion'},
    {suite:'tests/integration/checkout-mongo-race.test.ts',count:replica,
      status:'BLOCKED',cause:'Real replica-set checkout proof requires an isolated Mongo URI named tog_checkout_race_ci',
      requiredEvidence:'Run on actual isolated Mongo replica set, including concurrent stock, refund, market link races'},
    {suite:'tests/hydration-issues.test.ts',count:0,
      status:'VERIFIED_RETIRED',cause:'WhatsNewModal is absent and active application references are forbidden by a passing replacement test',
      requiredEvidence:'tests/hydration-issues.test.ts active-reference regression'},
  ],
  noUnknownSkips:false,
  releaseEligible:false,
};
result.noUnknownSkips=reviews===7&&replica===5&&ssr===0&&
  block.includes('describe.skip(')&&mongo.includes('describe.skip')&&apiPresent===false;
if(!result.noUnknownSkips||result.observedSkipCount!==12)
  throw Error('SKIPPED_TEST_SCOPE_CHANGED_REVIEW_REQUIRED');
mkdirSync('test-results',{recursive:true});
writeFileSync('test-results/turso-skipped-test-inventory.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
