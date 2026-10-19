#!/usr/bin/env node
// Protected manual-only branch-scope provisioning. Never print secrets.
const BRANCH='feat/turso-completion-20261019';
const PROJECT='prj_HnwKt5XyWC1Evcrv3mZLa3cdpDcG';
const TEAM='team_HLmyvqEhI158ahAD2U1p7MxM';
const STAGING_URL='libsql://gratog-migration-cert-20261018-swatkins.aws-us-east-1.turso.io';
if(process.env.GITHUB_EVENT_NAME!=='workflow_dispatch'||
  process.env.GITHUB_REF!=='refs/heads/'+BRANCH ||
  !/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA||'') ||
  !process.env.VERCEL_TOKEN ||
  !process.env.SQUARE_SANDBOX_ACCESS_TOKEN ||
  (process.env.TURSO_STAGING_AUTH_TOKEN||'').length<24){
  throw Error('ISOLATED_STAGING_PROVISION_REFUSED');
}
const base=process.env.PREVIEW_BASE_URL||'';
let u;try{u=new URL(base)}catch{}
if(!u||u.protocol!=='https:'||u.origin!==base||
  !/^gratog-[a-z0-9]+-theangelsilvers-projects\.vercel\.app$/.test(u.hostname))
  throw Error('EXACT_PREVIEW_URL_REQUIRED');
const api='https://api.vercel.com';
const auth={'Authorization':'Bearer '+process.env.VERCEL_TOKEN};
const check=await fetch(api+'/v13/deployments/'+encodeURIComponent(u.hostname)+'?teamId='+TEAM,
  {headers:auth,signal:AbortSignal.timeout(15000)});
if(!check.ok)throw Error('VERCEL_DEPLOYMENT_READBACK_'+check.status);
const d=await check.json();
if(d.projectId!==PROJECT||d.readyState!=='READY'||d.target==='production'||
  d.meta?.githubCommitRef!==BRANCH||d.meta?.githubCommitSha!==process.env.GITHUB_SHA)
  throw Error('CANDIDATE_PREVIEW_IDENTITY_MISMATCH');
const vars=[
  ['SQUARE_ACCESS_TOKEN',process.env.SQUARE_SANDBOX_ACCESS_TOKEN],
  ['TURSO_STAGING_AUTH_TOKEN',process.env.TURSO_STAGING_AUTH_TOKEN],
  ['TURSO_STAGING_DATABASE_URL',STAGING_URL],
  ['DATABASE_PROVIDER','turso'],
  ['SQUARE_ENVIRONMENT','sandbox'],
  ['SQUARE_MOCK_MODE','false'],
];
for(const [key,value] of vars){
  const response=await fetch(api+'/v10/projects/'+PROJECT+'/env?teamId='+TEAM+'&upsert=true',{
    method:'POST',headers:{...auth,'Content-Type':'application/json'},
    body:JSON.stringify({key,value,type:'encrypted',target:['preview'],gitBranch:BRANCH}),
    signal:AbortSignal.timeout(20000)
  });
  if(!response.ok)throw Error('PREVIEW_SCOPE_PROVISION_'+key+'_HTTP_'+response.status);
  console.log('PASS preview branch variable: '+key);
}
console.log('PASS staging-only variable provisioning; a new immutable Preview deploy is still mandatory');
