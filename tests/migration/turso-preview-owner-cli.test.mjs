import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scope, previewEnvironment } from '../../scripts/provision-turso-lemonade-preview.mjs';

const setup=fileURLToPath(new URL('../../scripts/provision-turso-lemonade-preview.mjs',import.meta.url));
const producer=fileURLToPath(new URL('../../scripts/certify-integrated-preview-provision.mjs',import.meta.url));
const sha='a'.repeat(40),secret='private-cli-error-never-print';

// Run the real standalone script and encrypted handoff producer. Every provider
// command and fetch is local, with an explicit rejection of unexpected requests.
async function cliFixture() {
  const config=JSON.parse(readFileSync(process.env.TOG_TEST_CONFIG,'utf8'));
  const args=process.argv.slice(2),exe=basename(process.argv[1]);
  const log=entry=>appendFileSync(config.events,JSON.stringify(entry)+'\n');
  log({source:exe,args});
  let stdin='';for await(const chunk of process.stdin)stdin+=chunk;
  const output=value=>process.stdout.write(typeof value==='string'?value:JSON.stringify(value));
  if(exe==='turso') {
    if(args.join(' ')==='db show '+config.scope.database+' --http-url') {
      if(config.stderr)process.stderr.write(config.stderr);
      output(config.url);process.exitCode=config.exitCode||0;return;
    }
    if(args.join(' ')==='db tokens create '+config.scope.database+' --expiration 7d')return output(config.token);
  }
  if(exe==='gh') {
    if(args.join(' ')==='auth status')return;
    if(args[0]==='api') {
      const path=args[1];
      if(path==='repos/'+config.scope.repo)return output({permissions:{admin:true}});
      if(path==='user')return output({login:'fixture-owner'});
      if(path.startsWith('repos/'+config.scope.repo+'/branches/'))return output({commit:{sha:config.sha}});
      if(path.includes('/actions/workflows/'))return output({workflow_runs:[{id:42,head_sha:config.sha,actor:{login:'fixture-owner'},created_at:new Date().toISOString()}]});
    }
    if(args[0]==='secret') {
      if(stdin!==config.token)throw Error('UNEXPECTED_SECRET_INPUT');
      log({source:'secret-published',viaStdin:true});return;
    }
    if(args[0]==='workflow'&&args[1]==='run') {
      const publicKey=args.find(a=>a.startsWith('recipient_public_key_b64=')).split('=').slice(1).join('=');
      const result=spawnSync(process.execPath,[config.producer],{cwd:config.root,encoding:'utf8',env:{...process.env,
        GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/'+config.scope.branch,GITHUB_SHA:config.sha,
        SQUARE_SANDBOX_ACCESS_TOKEN:config.square,TURSO_STAGING_AUTH_TOKEN:config.token,RECIPIENT_PUBLIC_KEY_B64:publicKey}});
      if(result.status!==0)throw Error('FIXTURE_HANDOFF_FAILED');return;
    }
    if(args[0]==='run'&&args[1]==='watch')return;
    if(args[0]==='run'&&args[1]==='download') {
      copyFileSync(join(config.root,'test-results/integrated-preview-staging-sealed.json'),
        join(args[args.indexOf('--dir')+1],'integrated-preview-staging-sealed.json'));return;
    }
  }
  if(exe==='vercel') {
    if(args[0]==='whoami')return output('fixture-owner');
    if(args[0]==='api') {
      if(args[1].startsWith('/v9/projects/'))return output({id:config.scope.project,accountId:config.scope.team});
      if(args[1].startsWith('/v10/projects/')&&args.includes('--input')) {
        const entry=JSON.parse(readFileSync(args[args.indexOf('--input')+1],'utf8'));
        if(!entry||Array.isArray(entry)||entry.gitBranch!==config.scope.branch||
          !Array.isArray(entry.target)||entry.target.length!==1||entry.target[0]!=='preview')
          throw Error('EXPANDED_PREVIEW_SCOPE');
        log({source:'preview-configured',key:entry.key});
        const metadata=JSON.parse(readFileSync(config.metadata,'utf8'));
        metadata.envs=metadata.envs.filter(e=>e.key!==entry.key);
        metadata.envs.push({...entry,value:entry.type==='sensitive'?undefined:entry.value});
        writeFileSync(config.metadata,JSON.stringify(metadata));
        return output({created:[{key:entry.key}]});
      }
      if(args[1].startsWith('/v10/projects/'))return output(readFileSync(config.metadata,'utf8'));
    }
  }
  throw Error('UNEXPECTED_FIXTURE_COMMAND');
}
function fetchFixture() {
  const config=JSON.parse(readFileSync(process.env.TOG_TEST_CONFIG,'utf8'));
  globalThis.fetch=async(url,options)=>{
    const endpoint=new URL(url);
    appendFileSync(config.events,JSON.stringify({source:'fetch',host:endpoint.hostname,path:endpoint.pathname})+'\n');
    if(endpoint.hostname===config.scope.host&&endpoint.pathname==='/v3/pipeline') {
      const requests=JSON.parse(options.body).requests;
      if(options.headers.Authorization!=='Bearer '+config.token||requests[0].stmt.sql!=="SELECT name FROM sqlite_master WHERE type='table'"||options.redirect!=='error')throw Error('UNEXPECTED_DATABASE_REQUEST');
      return new Response(JSON.stringify({results:[{type:'ok',response:{result:{rows:
        ['products','product_variations','inventory','orders','order_items','payments','checkout_stock_claims'].map(value=>[{value}])}}}]}),{status:config.schemaStatus||200});
    }
    if(endpoint.hostname==='connect.squareupsandbox.com'&&options.headers.Authorization==='Bearer '+config.square) {
      if(endpoint.pathname==='/oauth2/token/status')return Response.json({client_id:config.scope.app,merchant_id:config.scope.merchant});
      if(endpoint.pathname==='/v2/locations')return Response.json({locations:[{id:config.scope.location,merchant_id:config.scope.merchant,status:'ACTIVE',currency:'USD'}]});
    }
    throw Error('UNEXPECTED_NETWORK_REQUEST');
  };
}
function run(overrides={}) {
  const root=mkdtempSync(join(tmpdir(),'turso-owner-cli-'));
  try {
    const bin=join(root,'bin'),privateTmp=join(root,'private');mkdirSync(bin);mkdirSync(privateTmp);
    const token='header.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+7*86400})).toString('base64url')+'.signature';
    const config={root,scope,sha,producer,token,square:'unit-test-square-token-never-live',
      url:'https://'+scope.database+'-'+scope.organization+'.turso.io\n',
      events:join(root,'events.jsonl'),metadata:join(root,'metadata.json'),...overrides};
    writeFileSync(config.events,'');
    writeFileSync(config.metadata,JSON.stringify({envs:[]}));
    const configFile=join(root,'config.json');writeFileSync(configFile,JSON.stringify(config));
    const imports="import {readFileSync,writeFileSync,appendFileSync,copyFileSync} from 'node:fs';\nimport {join,basename} from 'node:path';\nimport {spawnSync} from 'node:child_process';\n";
    for(const exe of ['gh','turso','vercel'])writeFileSync(join(bin,exe),'#!'+process.execPath+'\n'+imports+'await ('+cliFixture.toString()+')();\n',{mode:0o700});
    const hook=join(root,'fetch.mjs');writeFileSync(hook,imports+'('+fetchFixture.toString()+')();\n');
    const result=spawnSync(process.execPath,['--import',hook,setup,sha],{encoding:'utf8',timeout:30000,
      env:{...process.env,PATH:bin,TMPDIR:privateTmp,TOG_TEST_CONFIG:configFile}});
    const events=readFileSync(config.events,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
    const output=result.stdout+result.stderr;
    for(const value of [token,config.square,secret])assert.equal(output.includes(value),false,'secret appeared in child output');
    assert.deepEqual(readdirSync(privateTmp),[],'private setup directory was not cleaned');
    return {result,events,output};
  } finally {rmSync(root,{recursive:true,force:true});}
}
function assertNoConfigurationWrites(events) {
  assert.equal(events.some(e=>['secret-published','preview-configured'].includes(e.source)),false);
  assert.equal(events.some(e=>e.source==='gh'&&['secret','workflow'].includes(e.args[0])),false);
}
test('standalone recovery validates the pinned schema before publishing a token and configures only the Preview branch',()=>{
  const {result,events,output}=run();
  assert.equal(result.status,0,output);
  const proof=output.split('\n').find(line=>line.startsWith('{'));
  assert.equal(JSON.parse(proof).pass,true);
  assert.equal(JSON.parse(proof).productionEnvironmentChanged,false);
  const schema=events.findIndex(e=>e.source==='fetch'&&e.host===scope.host);
  const publish=events.findIndex(e=>e.source==='secret-published');
  assert.ok(schema>=0&&publish>schema);
  const writes=events.filter(e=>e.source==='preview-configured');
  assert.equal(writes.length,previewEnvironment('private-square','private-turso','private-order','private-session').length);
  assert.equal(new Set(writes.map(e=>e.key)).size,writes.length);
});
test('exit-zero login instructions fail with an actionable diagnostic before token or configuration writes',()=>{
  const {result,events,output}=run({url:'You are not logged in, please login with turso auth login. '+secret});
  assert.equal(result.status,1);assert.match(output,/TURSO_LOGIN_REQUIRED/);assert.match(output,/Run turso auth login/);
  assertNoConfigurationWrites(events);assert.equal(events.filter(e=>e.source==='turso').length,1);
});
test('nonzero token, permission, and database errors are classified without forwarding secret-bearing stderr',()=>{
  for(const [stderr,code] of [
    ['token in TURSO_API_TOKEN env var is invalid','TURSO_API_TOKEN_INVALID'],
    ['Error: forbidden HTTP 403','TURSO_ACCESS_DENIED'],
    ['database '+scope.database+' not found','TURSO_DATABASE_NOT_FOUND'],
  ]) {
    const {result,events,output}=run({url:'',stderr:stderr+' '+secret,exitCode:1});
    assert.equal(result.status,1);assert.ok(output.includes(code),output);assertNoConfigurationWrites(events);
  }
});
test('wrong databases and malformed URL output fail before minting a token',()=>{
  for(const [url,code] of [['https://gratog-production-swatkins.turso.io','TURSO_DATABASE_SCOPE_INVALID'],
    ['status '+secret+'\nhttps://'+scope.host,'TURSO_DATABASE_URL_INVALID']]) {
    const {result,events,output}=run({url});
    assert.equal(result.status,1);assert.ok(output.includes(code),output);assertNoConfigurationWrites(events);
    assert.equal(events.filter(e=>e.source==='turso').length,1);
  }
});
test('a CLI alias cannot publish credentials unless the token actually reads the pinned database',()=>{
  const {result,events,output}=run({schemaStatus:401});
  assert.equal(result.status,1);assert.match(output,/TURSO_READ_FAILED/);assertNoConfigurationWrites(events);
  assert.equal(events.filter(e=>e.source==='fetch').length,1);
  assert.equal(events.find(e=>e.source==='fetch').host,scope.host);
});
