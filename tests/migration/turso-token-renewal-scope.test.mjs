import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('../../scripts/renew-turso-certification-token.sh', import.meta.url));

function exercise({ wrongTarget = false, expired = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'turso-renewal-test-'));
  const bin = join(root, 'bin'); mkdirSync(bin);
  const token = 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000) + (expired ? -10 : 7*86400) })).toString('base64url') + '.privateTestSignature';
  const stub = `#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path');
const name=path.basename(process.argv[1]),args=process.argv.slice(2);
fs.appendFileSync(process.env.TEST_LOG,JSON.stringify({name,args})+'\\n');
if(name==='turso') {
 if(args[0]==='db'&&args[1]==='show') console.log(process.env.TEST_TARGET);
 else if(args[0]==='db'&&args[1]==='tokens') console.log(process.env.TEST_JWT);
 else process.exit(99);
} else if(args[0]==='auth') {}
else if(args[0]==='api'&&args[1]==='repos/wizelements/Gratog') console.log('true');
else if(args[0]==='api'&&args[1].includes('/actions/workflows/')) console.log('123\\tcompleted');
else if(args[0]==='secret'&&args[1]==='set') fs.writeFileSync(process.env.TEST_CAPTURE,fs.readFileSync(0));
else if(args[0]==='run'&&args[1]==='rerun') {}
else process.exit(99);
`;
  for (const name of ['gh', 'turso']) writeFileSync(join(bin, name), stub, { mode: 0o755 });
  const capture = join(root, 'capture'), log = join(root, 'calls');
  const result = spawnSync('bash', [script], { encoding:'utf8', env:{ ...process.env, PATH:bin+':'+process.env.PATH,
    TMPDIR:root, TEST_LOG:log, TEST_CAPTURE:capture, TEST_JWT:token,
    TEST_TARGET:wrongTarget?'libsql://production.example':'libsql://gratog-migration-cert-20261018-swatkins.aws-us-east-1.turso.io' } });
  const calls=existsSync(log)?readFileSync(log,'utf8').trim().split('\n').map(JSON.parse):[];
  const saved=existsSync(capture)?readFileSync(capture,'utf8'):null;
  rmSync(root,{recursive:true,force:true});
  return {result,calls,saved,token};
}

test('wrong database target aborts before minting or replacing any credential',()=>{
  const {result,calls,saved}=exercise({wrongTarget:true});
  assert.notEqual(result.status,0); assert.equal(saved,null);
  assert.equal(calls.some(c=>c.name==='turso'&&c.args.includes('tokens')),false);
});
test('an expired newly minted credential cannot replace the protected secret',()=>{
  const {result,saved,token}=exercise({expired:true});
  assert.notEqual(result.status,0); assert.equal(saved,null);
  assert.equal((result.stdout+result.stderr).includes(token),false);
});
test('valid renewal sends the token only through stdin to the exact Sandbox environment',()=>{
  const {result,calls,saved,token}=exercise();
  assert.equal(result.status,0,result.stderr); assert.equal(saved,token);
  assert.equal((result.stdout+result.stderr).includes(token),false);
  assert.deepEqual(calls.find(c=>c.name==='gh'&&c.args[0]==='secret').args,
    ['secret','set','TURSO_STAGING_AUTH_TOKEN','--repo','wizelements/Gratog','--env','square-sandbox-certification']);
  assert.deepEqual(calls.find(c=>c.name==='turso'&&c.args.includes('tokens')).args,
    ['db','tokens','create','gratog-migration-cert-20261018','--expiration','7d']);
});
