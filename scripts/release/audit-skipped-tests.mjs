#!/usr/bin/env node
/**
 * Inventories the EXACT known skipped Vitest tests, not a blanket waiver.
 * Fails if any new skip is added or one is removed without updating evidence.
 * Output is an inventory, never a release-pass certificate.
 */
import {readFileSync,mkdirSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
const read=file=>readFileSync(file,'utf8');
const block=read('tests/reviews-flow.test.ts');
const reviewActive=(block.match(/^\s*it\(/gm)||[]).length;
const reviews=block.includes('describe.skip(')?reviewActive:0;
const mongo=read('tests/integration/checkout-mongo-race.test.ts');
const replica=(mongo.match(/^\s*it\(/gm)||[]).length;
const hydration=read('tests/hydration-issues.test.ts');
const ssr=(hydration.match(/\bit\.skip\(/g)||[]).length;
const apiPresent=existsSync('app/api/reviews/route.ts')||existsSync('app/api/reviews/route.js');
const result={
  kind:'KNOWN_SKIP_DISPOSITION',
  observedSkipCount:reviews+replica+ssr,
  baseline:12,
  sourceInventoryOnly:true,
  tests:[
    {suite:'tests/reviews-flow.test.ts',count:reviews,
      activeReplacements:reviewActive,
      status:'RETIRED_WITH_ACTIVE_REGRESSIONS',cause:'Public review APIs and page were already retired; product-page controls and false submission confirmation are now removed',
      requiredEvidence:'Run all seven active retirement regressions; preserve authenticated access to historical records'},
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
function testFiles(directory) {
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const name=directory+'/'+entry.name;
    return entry.isDirectory()?testFiles(name):/\.(?:test|spec)\.(?:js|ts|mjs)$/.test(name)?[name]:[];
  });
}
const skipDeclarations=testFiles('tests').filter(file=>
  /\b(?:describe|it|test)\s*\.\s*(?:skip|todo|skipIf|runIf)\b/.test(read(file)));
result.skipDeclarationFiles=skipDeclarations;
result.noUnknownSkips=reviews===0&&reviewActive===7&&replica===5&&ssr===0&&
  !block.includes('describe.skip(')&&mongo.includes('describe.skip')&&apiPresent===false&&
  skipDeclarations.every(file=>file==='tests/integration/checkout-mongo-race.test.ts');
if(!result.noUnknownSkips||result.observedSkipCount!==5)
  throw Error('SKIPPED_TEST_SCOPE_CHANGED_REVIEW_REQUIRED');
mkdirSync('test-results',{recursive:true});
writeFileSync('test-results/turso-skipped-test-inventory.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
