import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { scope, previewEnvironment, validateToken, decodeHandoff, verifyAppliedOverrides, verifyTursoDatabaseUrl, tursoCliFailure } from '../../scripts/provision-turso-lemonade-preview.mjs';
const producer=fileURLToPath(new URL('../../scripts/certify-integrated-preview-provision.mjs',import.meta.url));
const sha='a'.repeat(40);
const jwt=(exp)=>'header.'+Buffer.from(JSON.stringify({exp})).toString('base64url')+'.signature';

test('Turso URL verification accepts only exact certification endpoints across CLI URL formats',()=>{
  for(const host of [scope.host,scope.database+'-'+scope.organization+'.turso.io']) {
    for(const protocol of ['https','libsql','turso']) {
      for(const url of [protocol+'://'+host,protocol+'://'+host+'/',protocol.toUpperCase()+'://'+host.toUpperCase()]) {
        assert.equal(verifyTursoDatabaseUrl('\u001b[32m'+url+'\u001b[0m\r\n'),'https://'+scope.host);
      }
    }
  }
});
test('URL normalization cannot admit another database, organization, destination, or embedded secret',()=>{
  const host=scope.host;
  for(const url of [
    'https://gratog-production-swatkins.aws-us-east-1.turso.io',
    'https://'+host.replace('-swatkins.','-other.'),'https://'+host+'.attacker.example',
    'https://'+host+'.','http://'+host,'file://'+host,'https://'+host+':443',
    'https://private-token@'+host,'https://'+host+'/other/..','https://'+host+'?private-token',
    'https://'+host+'#private-token','https://'+host.replace('gratog','%67ratog'),
    'https://'+host+'\\@attacker.example','https://'+host+'\nhttps://'+host,
    'status message\nhttps://'+host,'https://'+host+'/ private-token',
  ]) assert.throws(()=>verifyTursoDatabaseUrl(url),/TURSO_DATABASE_(SCOPE|URL)_INVALID/);
});
test('Turso login text is not mistaken for a successful database URL and raw errors never become diagnostics',()=>{
  const secret='private-provider-token-do-not-print';
  for(const text of ['You are not logged in, please login with turso auth login before running other commands.','No user logged in.']) {
    assert.throws(()=>verifyTursoDatabaseUrl('\u001b[31m'+text+'\u001b[0m'),/TURSO_LOGIN_REQUIRED/);
  }
  for(const [text,code] of [
    ['token in TURSO_API_TOKEN env var is invalid','TURSO_API_TOKEN_INVALID'],
    ['HTTP 401 unauthorized','TURSO_LOGIN_REQUIRED'],['HTTP 403 forbidden','TURSO_ACCESS_DENIED'],
    ['database '+scope.database+' not found','TURSO_DATABASE_NOT_FOUND'],['unknown failure','TURSO_CLI_ACTION_FAILED'],
  ]) {
    assert.equal(tursoCliFailure('',text+' '+secret),code);
    assert.equal(tursoCliFailure(text+' '+secret).includes(secret),false);
  }
});

test('configuration restricts all keys to the exact Preview branch and keeps private values off public keys',()=>{
  const entries=previewEnvironment('private-square','private-turso','private-order','private-session');
  for(const entry of entries){assert.deepEqual(entry.target,['preview']);assert.equal(entry.gitBranch,scope.branch);}
  const sensitive=entries.filter(e=>e.type==='sensitive').map(e=>e.key).sort();
  assert.deepEqual(sensitive,['JWT_SECRET','ORDER_ACCESS_TOKEN_SECRET','SQUARE_ACCESS_TOKEN','TURSO_STAGING_AUTH_TOKEN']);
  for(const entry of entries.filter(e=>e.key.startsWith('NEXT_PUBLIC_')))assert.equal(entry.value.startsWith('private-'),false);
  assert.equal(entries.find(e=>e.key==='DATABASE_PROVIDER').value,'turso');
  assert.equal(entries.find(e=>e.key==='SQUARE_ENVIRONMENT').value,'sandbox');
  assert.equal(entries.find(e=>e.key==='TURSO_STAGING_DATABASE_URL').value,'libsql://'+scope.host);
});
test('only fresh bounded credentials may be installed',()=>{
  assert.doesNotThrow(()=>validateToken(jwt(7*86400+100),100));
  for(const token of [jwt(99),jwt(100+60),jwt(100+9*86400),'not-a-token'])assert.throws(()=>validateToken(token,100));
});
test('partial API failures, wrong public values, and expanded environment scopes cannot pass configuration readback',()=>{
  const entries=previewEnvironment('private-square','private-turso','private-order','private-session');
  const metadata={envs:entries.map(e=>({...e,...(e.type==='sensitive'?{value:undefined}:{})}))};
  assert.doesNotThrow(()=>verifyAppliedOverrides(entries,{},metadata));
  assert.throws(()=>verifyAppliedOverrides(entries,{failed:[{key:'DATABASE_PROVIDER'}]},metadata));
  assert.throws(()=>verifyAppliedOverrides(entries,{}, {envs:metadata.envs.map(e=>e.key==='DATABASE_PROVIDER'?{...e,value:'mongodb'}:e)}));
  assert.throws(()=>verifyAppliedOverrides(entries,{}, {envs:metadata.envs.map(e=>({...e,target:['preview','production']}))}));
  assert.throws(()=>verifyAppliedOverrides(entries,{}, {envs:metadata.envs.map(e=>e.key==='SQUARE_ACCESS_TOKEN'?{...e,type:'plain'}:e)}));
});

function seal(branch=scope.branch){
  const work=mkdtempSync(join(tmpdir(),'turso-handoff-test-'));
  const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:3072});
  const square='unit-test-square-token-never-live',turso=jwt(Math.floor(Date.now()/1000)+7*86400);
  const result=spawnSync(process.execPath,[producer],{cwd:work,encoding:'utf8',env:{...process.env,
    GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/'+branch,GITHUB_SHA:sha,
    SQUARE_SANDBOX_ACCESS_TOKEN:square,TURSO_STAGING_AUTH_TOKEN:turso,
    RECIPIENT_PUBLIC_KEY_B64:Buffer.from(publicKey.export({type:'spki',format:'pem'})).toString('base64')}});
  const path=join(work,'test-results/integrated-preview-staging-sealed.json');
  const raw=existsSync(path)?readFileSync(path,'utf8'):null;
  rmSync(work,{recursive:true,force:true});
  return{result,raw,artifact:raw?JSON.parse(raw):null,privateKey,square,turso};
}
test('the actual protected producer and owner decryptor exchange only encrypted credentials',()=>{
  const {result,artifact,raw,privateKey,square,turso}=seal();
  assert.equal(result.status,0,result.stderr);
  const decoded=decodeHandoff(artifact,privateKey,sha);
  assert.equal(decoded.SQUARE_ACCESS_TOKEN,square);assert.equal(decoded.TURSO_STAGING_AUTH_TOKEN,turso);
  assert.equal((result.stdout+result.stderr+raw).includes(square),false);
  assert.equal((result.stdout+result.stderr+raw).includes(turso),false);
  assert.throws(()=>decodeHandoff({...artifact,sha:'b'.repeat(40)},privateKey,sha));
  assert.throws(()=>decodeHandoff({...artifact,branch:'main'},privateKey,sha));
  const tag=Buffer.from(artifact.tag,'base64');tag[0]^=1;
  assert.throws(()=>decodeHandoff({...artifact,tag:tag.toString('base64')},privateKey,sha));
  const other=generateKeyPairSync('rsa',{modulusLength:3072});
  assert.throws(()=>decodeHandoff(artifact,other.privateKey,sha));
});
test('the protected producer rejects production and unapproved branches before writing any artifact',()=>{
  for(const branch of ['main','unapproved-preview']){
    const {result,artifact,square,turso}=seal(branch);
    assert.notEqual(result.status,0);assert.equal(artifact,null);
    assert.equal((result.stdout+result.stderr).includes(square),false);
    assert.equal((result.stdout+result.stderr).includes(turso),false);
  }
});
