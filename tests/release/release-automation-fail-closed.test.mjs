import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflow = readFileSync('.github/workflows/tog-verified-release-gate.yml', 'utf8');

test('replaced manually disabled legacy workflow with active-name candidate', () => {
  assert.equal(existsSync('.github/workflows/release-automation.yml'), false);
  assert.equal(existsSync('.github/workflows/tog-verified-release-gate.yml'), true);
});

test('release gate runs on every main PR and main push', () => {
  assert.match(workflow, /pull_request:\s*\n\s+branches: \[main\]/);
  assert.match(workflow, /push:\s*\n\s+branches: \[main\]/);
});

test('the gate never converts failed checks into a successful summary', () => {
  assert.doesNotMatch(workflow, /\|\|\s*echo\b/);
  assert.doesNotMatch(workflow, /All systems ready for deployment/i);
  assert.match(workflow, /name: TypeScript must pass\s*\n\s+run: npm run typecheck:ci/);
  assert.match(workflow, /name: Vitest suite must pass\s*\n\s+run: npx vitest run --reporter=dot/);
  assert.match(workflow, /name: Linux production build must pass\s*\n\s+run: npm run build/);
});

test('a verified manifest never asserts CI is a production release approval', () => {
  assert.match(workflow, /CI_VERIFIED_NOT_PRODUCTION/);
  assert.match(workflow, /productionCertified: false/);
  assert.match(workflow, /independentReview: 'PENDING'/);
  assert.match(workflow, /merchantSellabilityReadback: 'PENDING'/);
  assert.doesNotMatch(workflow, /"security": true/);
  assert.match(workflow, /needs: \[verify\]/);
});
