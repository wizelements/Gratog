import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const runner=join(root,'scripts/release/inventory-turso-routing.mjs');
const run=(args=[])=>spawnSync(process.execPath,[runner,'--json',...args],{cwd:root,encoding:'utf8'});
let cached;
function report(){if(!cached){const r=run();assert.equal(r.status,0,r.stderr);cached=JSON.parse(r.stdout)}return cached}
function countRoutes(dir){
  return readdirSync(dir,{withFileTypes:true}).reduce((n,d)=>{
    const path=join(dir,d.name);
    return n+(d.isDirectory()?countRoutes(path):/^route\.(js|jsx|ts|tsx|mjs|cjs)$/.test(d.name)?1:0);
  },0);
}
test('covers every existing Next app API endpoint and the configured cron jobs',()=>{
  const r=report();
  assert.equal(r.counts.apiRoutes,countRoutes(join(root,'app/api')));
  assert.ok(r.counts.cronJobs>=1);
  assert.equal(r.entries.filter(e=>e.kind==='API_ROUTE').length,r.counts.apiRoutes);
  for(const cron of r.cronRoutes){assert.ok(cron.path?.startsWith('/api/'));assert.ok(cron.sourceRoute,'Cron route missing from source: '+cron.path)}
});
test('buyer, Square, inventory and administration are included in conversion inventory',()=>{
  const entries=new Map(report().entries.map(e=>[e.path,e]));
  for(const path of [
    'app/api/payments/route.ts',
    'app/api/webhooks/square/route.ts',
    'app/api/orders/route.ts',
    'app/api/admin/orders/route.ts',
    'app/api/admin/products/route.ts',
    'app/api/inventory/route.ts',
    'app/api/cron/cleanup-abandoned-orders/route.ts',
  ])assert.ok(entries.has(path),'Missing migration inventory entry: '+path);
});
test('static inventory never equates Turso references or no detected database import with certification',()=>{
  const r=report();
  assert.equal(r.releaseStatus,'NOT_CERTIFIED');
  assert.equal(r.productionCutoverAuthorized,false);
  assert.ok(r.limitations.some(x=>x.includes('NOT proof of Turso routing')));
});
test('strict routing inventory rejects incomplete conversion and cannot unlock cutover',()=>{
  const r=run(['--strict']);
  assert.equal(r.status,2);
  const payload=JSON.parse(r.stdout);
  assert.ok(payload.counts.mongoDependentEntries>0);
  assert.equal(payload.productionCutoverAuthorized,false);
});
