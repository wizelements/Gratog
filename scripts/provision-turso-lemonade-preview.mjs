#!/usr/bin/env node
/** Owner-CLI recovery. Only the exact Turso certification DB and Vercel Preview branch are writable. */
import { spawn } from 'node:child_process';
import { generateKeyPairSync, privateDecrypt, createDecipheriv, constants, randomBytes } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const scope = Object.freeze({ repo: 'wizelements/Gratog', branch: 'feat/turso-lemonade-certification-20261027',
  environment: 'square-sandbox-certification', database: 'gratog-migration-cert-20261018',
  host: 'gratog-migration-cert-20261018-swatkins.aws-us-east-1.turso.io',
  team: 'team_HLmyvqEhI158ahAD2U1p7MxM', project: 'prj_HnwKt5XyWC1Evcrv3mZLa3cdpDcG',
  merchant: 'MLQBBQPC574GR', location: 'LYSFJ7XXCPQG5', app: 'sandbox-sq0idb-yygbGJe58k9ZsmpZhJ6kjA' });
const requiredTables = ['products','product_variations','inventory','orders','order_items','payments','checkout_stock_claims'];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let stage = 'preflight';
const say = text => console.log('TURSO_PREVIEW_RECOVERY: ' + text);

export function validateToken(token, now = Date.now()/1000) {
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw Error('TOKEN_FORMAT_INVALID');
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url'));
  if (!Number.isSafeInteger(claims.exp) || claims.exp <= now+3600 || claims.exp > now+8*86400) throw Error('TOKEN_EXPIRATION_INVALID');
}
export function decodeHandoff(artifact, privateKey, sha) {
  if (artifact?.kind !== 'GRATOG_ISOLATED_SANDBOX_SEALED_HANDOFF_V1' || artifact.branch !== scope.branch ||
      artifact.sha !== sha || artifact.alg !== 'RSA-OAEP-SHA256/AES-256-GCM') throw Error('HANDOFF_SCOPE_INVALID');
  const key = privateDecrypt({key:privateKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(artifact.key,'base64'));
  try {
    const iv=Buffer.from(artifact.iv,'base64'),tag=Buffer.from(artifact.tag,'base64'),ciphertext=Buffer.from(artifact.payload,'base64');
    if(key.length!==32||iv.length!==12||tag.length!==16||ciphertext.length>65536)throw Error('HANDOFF_FORMAT_INVALID');
    const decipher=createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(tag);
    const clear=Buffer.concat([decipher.update(ciphertext),decipher.final()]);
    try {
      const value=JSON.parse(clear.toString('utf8'));
      if(value.branch!==scope.branch||value.sha!==sha||typeof value.SQUARE_ACCESS_TOKEN!=='string'||value.SQUARE_ACCESS_TOKEN.length<24)
        throw Error('HANDOFF_CONTENT_INVALID');
      return value;
    } finally {clear.fill(0);}
  } finally {key.fill(0);}
}
export function previewEnvironment(squareToken, tursoToken, orderSecret, sessionSecret) {
  const values = { DATABASE_PROVIDER:'turso', TURSO_STAGING_DATABASE_URL:'libsql://'+scope.host,
    TURSO_STAGING_AUTH_TOKEN:tursoToken,SQUARE_ENVIRONMENT:'sandbox',SQUARE_MOCK_MODE:'false',
    SQUARE_ACCESS_TOKEN:squareToken,SQUARE_LOCATION_ID:scope.location,SQUARE_APPLICATION_ID:scope.app,
    NEXT_PUBLIC_SQUARE_APPLICATION_ID:scope.app,NEXT_PUBLIC_SQUARE_LOCATION_ID:scope.location,
    NEXT_PUBLIC_SQUARE_ENVIRONMENT:'sandbox',ORDER_ACCESS_TOKEN_SECRET:orderSecret,JWT_SECRET:sessionSecret };
  const sensitive=new Set(['TURSO_STAGING_AUTH_TOKEN','SQUARE_ACCESS_TOKEN','ORDER_ACCESS_TOKEN_SECRET','JWT_SECRET']);
  return Object.entries(values).map(([key,value])=>({key,value,type:sensitive.has(key)?'sensitive':'plain',
    target:['preview'],gitBranch:scope.branch,comment:'Isolated Turso lemonade certification Preview'}));
}
function command(executable, args, input, timeout=120000) {
  return new Promise((resolve,reject)=>{
    const environment={...process.env,VERCEL_TELEMETRY_DISABLED:'1',NO_COLOR:'1',GH_PAGER:'cat'};
    delete environment.DEBUG;delete environment.VERCEL_DEBUG;delete environment.NODE_DEBUG;
    const child=spawn(executable,args,{env:environment,stdio:['pipe','pipe','pipe']});
    const out=[];let bytes=0,settled=false;
    const timer=setTimeout(()=>{child.kill('SIGTERM');reject(Error('CLI_TIMEOUT'));},timeout);
    child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>8*1024*1024)child.kill('SIGTERM');else out.push(chunk);});
    child.stderr.on('data',()=>{}); // Never forward raw provider or CLI errors containing request details.
    child.on('error',()=>{clearTimeout(timer);if(!settled){settled=true;reject(Error('CLI_UNAVAILABLE'));}});
    child.on('close',code=>{clearTimeout(timer);if(!settled){settled=true;code===0&&bytes<=8*1024*1024?
      resolve(Buffer.concat(out).toString('utf8')):reject(Error('CLI_ACTION_FAILED'));}});
    child.stdin.on('error',()=>{});child.stdin.end(input||'');
  });
}
const ghJson=async path=>JSON.parse(await command('gh',['api',path]));
const vercelJson=async(path,bodyFile)=>{
  const output=await command('vercel',['api',path,'--raw','--scope',scope.team,
    ...(bodyFile?['--method','POST','--input',bodyFile]:[])]);
  return output.trim()?JSON.parse(output):{};
};

async function verifyTursoSchema(token) {
  const sql="SELECT name FROM sqlite_master WHERE type='table'";
  const body=JSON.stringify({requests:[{type:'execute',stmt:{sql,args:[],named_args:[],want_rows:true}},{type:'close'}]});
  let response;
  for(const version of [3,2]) {
    response=await fetch('https://'+scope.host+'/v'+version+'/pipeline',{method:'POST',redirect:'error',
      signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body});
    if(response.status!==404)break;
  }
  if(response.status!==200)throw Error('TURSO_READ_FAILED');
  const data=await response.json(), result=data.results?.[0];
  if(result?.type!=='ok')throw Error('TURSO_SCHEMA_READ_FAILED');
  const names=new Set((result.response?.result?.rows||[]).map(row=>row[0]?.value));
  if(requiredTables.some(name=>!names.has(name)))throw Error('TURSO_SCHEMA_INCOMPLETE');
}
async function verifySquare(token) {
  const headers={Authorization:'Bearer '+token,'Square-Version':'2026-09-16','Content-Type':'application/json'};
  const first=await fetch('https://connect.squareupsandbox.com/oauth2/token/status',{method:'POST',headers,
    body:'{}',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(first.status!==200)throw Error('SQUARE_TOKEN_READ_FAILED');
  const app=await first.json();
  if(app.client_id!==scope.app||app.merchant_id!==scope.merchant)throw Error('SQUARE_APPLICATION_SCOPE_INVALID');
  const response=await fetch('https://connect.squareupsandbox.com/v2/locations',{headers,
    redirect:'error',signal:AbortSignal.timeout(15000)});
  if(response.status!==200)throw Error('SQUARE_LOCATION_READ_FAILED');
  const data=await response.json();
  if(!data.locations?.some(l=>l.id===scope.location&&l.merchant_id===scope.merchant&&l.status==='ACTIVE'&&l.currency==='USD'))
    throw Error('SQUARE_MERCHANT_SCOPE_INVALID');
}

export async function recover(sha) {
  if(!/^[a-f0-9]{40}$/.test(sha||''))throw Error('PINNED_SOURCE_SHA_REQUIRED');
  const base=process.env.TMPDIR||(process.env.PREFIX?join(process.env.PREFIX,'tmp'):tmpdir());
  mkdirSync(base,{recursive:true});const work=mkdtempSync(join(base,'tog-preview-private-'));
  try {
    stage='github_owner_access';await command('gh',['auth','status']);
    const repository=await ghJson('repos/'+scope.repo);
    if(repository.permissions?.admin!==true)throw Error('REPOSITORY_ADMIN_REQUIRED');
    const actor=await ghJson('user');
    const branch=await ghJson('repos/'+scope.repo+'/branches/'+encodeURIComponent(scope.branch));
    if(branch.commit?.sha!==sha)throw Error('SOURCE_HEAD_CHANGED');
    stage='vercel_owner_access';await command('vercel',['whoami']);
    const project=await vercelJson('/v9/projects/'+scope.project+'?teamId='+scope.team);
    if(project.id!==scope.project||project.accountId!==scope.team)throw Error('VERCEL_PROJECT_SCOPE_INVALID');
    stage='turso_database_scope';const url=(await command('turso',['db','show',scope.database,'--url'])).trim();
    if(!['libsql://'+scope.host,'https://'+scope.host].includes(url))throw Error('TURSO_DATABASE_SCOPE_INVALID');
    stage='renew_turso_token';const token=(await command('turso',['db','tokens','create',scope.database,'--expiration','7d'])).trim();
    validateToken(token);
    await command('gh',['secret','set','TURSO_STAGING_AUTH_TOKEN','--repo',scope.repo,'--env',scope.environment],token);
    say('Certification database token renewed without printing it.');
    stage='verify_turso_schema';await verifyTursoSchema(token);
    say('The fixed Turso certification database is readable and contains the required commerce tables.');
    stage='sealed_sandbox_handoff';
    const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:3072});
    const publicB64=Buffer.from(publicKey.export({type:'spki',format:'pem'})).toString('base64');
    const started=Date.now();
    await command('gh',['workflow','run','turso-square-protected-certification.yml','--repo',scope.repo,'--ref',scope.branch,
      '-f','preview_base_url=https://gratog-git-feat-turso-lemonade-7ebabe-theangelsilvers-projects.vercel.app',
      '-f','provision_only=true','-f','recipient_public_key_b64='+publicB64]);
    let run;
    for(let attempt=0;attempt<30&&!run;attempt++) {
      const listing=await ghJson('repos/'+scope.repo+'/actions/workflows/turso-square-protected-certification.yml/runs?event=workflow_dispatch&branch='+encodeURIComponent(scope.branch)+'&per_page=10');
      const matches=(listing.workflow_runs||[]).filter(r=>r.head_sha===sha&&r.actor?.login===actor.login&&Date.parse(r.created_at)>=started-5000);
      if(matches.length>1)throw Error('HANDOFF_RUN_AMBIGUOUS');
      run=matches[0];if(!run)await delay(2000);
    }
    if(!run)throw Error('HANDOFF_RUN_NOT_FOUND');
    say('Waiting for the protected, encrypted Sandbox credential handoff.');
    await command('gh',['run','watch',String(run.id),'--repo',scope.repo,'--exit-status'],undefined,600000);
    await command('gh',['run','download',String(run.id),'--repo',scope.repo,
      '--name','integrated-turso-staging-sealed-'+run.id,'--dir',work]);
    const handoff=decodeHandoff(JSON.parse(readFileSync(join(work,'integrated-preview-staging-sealed.json'),'utf8')),privateKey,sha);
    if(handoff.TURSO_STAGING_AUTH_TOKEN!==token)throw Error('HANDOFF_TOKEN_CHANGED');
    stage='square_sandbox_scope';await verifySquare(handoff.SQUARE_ACCESS_TOKEN);
    say('Square Sandbox application, merchant, and location independently verified.');
    stage='configure_exact_preview_branch';
    const entries=previewEnvironment(handoff.SQUARE_ACCESS_TOKEN,token,randomBytes(32).toString('hex'),randomBytes(32).toString('hex'));
    const bodyFile=join(work,'preview-environment.json');writeFileSync(bodyFile,JSON.stringify(entries),{mode:0o600});
    const unchanged=await ghJson('repos/'+scope.repo+'/branches/'+encodeURIComponent(scope.branch));
    if(unchanged.commit?.sha!==sha)throw Error('SOURCE_HEAD_CHANGED');
    await vercelJson('/v10/projects/'+scope.project+'/env?teamId='+scope.team+'&upsert=true',bodyFile);
    const listing=await vercelJson('/v10/projects/'+scope.project+'/env?teamId='+scope.team+'&gitBranch='+encodeURIComponent(scope.branch)+'&decrypt=false');
    const present=new Set((listing.envs||[]).filter(v=>v.gitBranch===scope.branch&&v.target?.includes('preview')).map(v=>v.key));
    if(entries.some(entry=>!present.has(entry.key)))throw Error('PREVIEW_OVERRIDE_READBACK_FAILED');
    console.log(JSON.stringify({kind:'turso-lemonade-preview-owner-setup',pass:true,branch:scope.branch,sha,
      databaseSchemaReadable:true,squareSandboxScopeVerified:true,previewBranchConfigurationVerified:true,
      configuredKeys:entries.map(e=>e.key),productionEnvironmentChanged:false,stockChanged:false,
      buyerCheckoutCertified:false,secretsPrinted:false}));
    say('Owner setup complete. Return this nonsecret result to ChatGPT for deployment and live certification.');
  } finally {rmSync(work,{recursive:true,force:true});}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url) {
  recover(process.argv[2]).catch(error=>{
    const allowed=new Set(['PINNED_SOURCE_SHA_REQUIRED','REPOSITORY_ADMIN_REQUIRED','SOURCE_HEAD_CHANGED','VERCEL_PROJECT_SCOPE_INVALID',
      'TURSO_DATABASE_SCOPE_INVALID','TOKEN_FORMAT_INVALID','TOKEN_EXPIRATION_INVALID','TURSO_READ_FAILED','TURSO_SCHEMA_INCOMPLETE',
      'TURSO_SCHEMA_READ_FAILED','SQUARE_TOKEN_READ_FAILED','SQUARE_LOCATION_READ_FAILED','SQUARE_APPLICATION_SCOPE_INVALID',
      'SQUARE_MERCHANT_SCOPE_INVALID','HANDOFF_SCOPE_INVALID','HANDOFF_FORMAT_INVALID','HANDOFF_CONTENT_INVALID',
      'HANDOFF_RUN_AMBIGUOUS','HANDOFF_RUN_NOT_FOUND','HANDOFF_TOKEN_CHANGED','PREVIEW_OVERRIDE_READBACK_FAILED']);
    console.error('TURSO_PREVIEW_RECOVERY_FAILED '+JSON.stringify({stage,code:allowed.has(error.message)?error.message:'OWNER_ACCESS_OR_SETUP_REQUIRED',secretsPrinted:false}));
    process.exitCode=1;
  });
}
