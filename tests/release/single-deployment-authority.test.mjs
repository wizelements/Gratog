import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const read = path => readFileSync(resolve(root, path), 'utf8');

test('a second GitHub Action cannot independently deploy production', () => {
  assert.equal(existsSync(resolve(root, '.github/workflows/deploy.yml')), false);
  const governance = read('.github/workflows/production-closure.yml');
  assert.match(governance, /branches:\s*\[main\]/);
  assert.match(governance, /Static deploy guard/);
  assert.match(governance, /Production build on Linux/);
});

test('production monitor remains independent of the Git-connected Vercel deployment', () => {
  const workflows = read('.github/workflows/production-closure.yml');
  assert.doesNotMatch(workflows, /amondnet\/vercel-action|vercel deploy --prod/);
});
