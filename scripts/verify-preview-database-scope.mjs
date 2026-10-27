#!/usr/bin/env node
/**
 * Read-only, short-lived Preview isolation witness. No URI, credential, database
 * name, host, document or raw provider error is written to logs.
 * Baseline was independently obtained through the authenticated project CLI.
 */
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const BASELINE={
  "cluster": "e4761215702ceed6de382cb9318796d2b0e84cc8fa84918e4eb9a38ef915cd6f",
  "namespace": "78d63a63295b31bd1357807c76842d45858e2da4dd07d7f2c7312d71dc461471",
  "principal": "a0f11b76b6541059bf30ed26a2de6d6dca46126cf64f542bf0485e24980b3f70",
  "databaseName": "4aa83b8121fccf4f34c042401a53a1b44ce4e981f15d585485405f06b6415831",
  "capturedAt": "2026-10-27T15:36:27.532Z",
  "projectId": "prj_HnwKt5XyWC1Evcrv3mZLa3cdpDcG"
};
const hash=s=>createHash('sha256').update(s).digest('hex');
const READ_ACTIONS=new Set(['find','listCollections','listIndexes','collStats','dbStats','dbHash',
 'listDatabases','changeStream','killCursors','planCacheRead','indexStats','inprog','serverStatus',
 'getLog','hostInfo','connectionStatus','getParameter','replSetGetStatus','replSetGetConfig',
 'ping','usersInfo','rolesInfo','viewUser','viewRole','getShardMap','getShardVersion']);
export function analyzeScope({uri,actualDatabase,authInfo,baseline=BASELINE,now=Date.now()}){
 const u=new URL(uri.trim());
 const cluster=u.protocol+'//'+u.host.toLowerCase();
 const configuredDb=decodeURIComponent(u.pathname.slice(1))||'test';
 const privileges=authInfo?.authenticatedUserPrivileges;
 const proof={
  baselineFresh:Number.isFinite(Date.parse(baseline.capturedAt))&&now>=Date.parse(baseline.capturedAt)&&now-Date.parse(baseline.capturedAt)<86400000,
  sameConfiguredCluster:hash(cluster)===baseline.cluster,
  sameConfiguredNamespace:hash(cluster+'/'+configuredDb)===baseline.namespace,
  sameConfiguredPrincipal:hash(cluster+'|'+decodeURIComponent(u.username))===baseline.principal,
  actualDatabaseMatchesConfigured:actualDatabase===configuredDb,
  actualDatabaseNamespaceDistinct:hash(cluster+'/'+actualDatabase)!==baseline.namespace,
  privilegesInspectable:Array.isArray(privileges),
  authenticatedPrincipalCount:authInfo?.authenticatedUsers?.length||0,
 };
 // Unknown privilege actions are treated as writes. An absent privilege listing
 // cannot certify database isolation.
 const writes=(privileges||[]).filter(p=>(p.actions||[]).some(a=>!READ_ACTIONS.has(a)));
 proof.writePrivilegesOutsidePreviewDatabase=writes.some(p=>p.resource?.anyResource===true||
  p.resource?.cluster===true||p.resource?.db!==actualDatabase);
 proof.productionWritePrivilegeDetected=proof.sameConfiguredCluster&&writes.some(p=>
  p.resource?.anyResource===true||p.resource?.cluster===true||p.resource?.db===''||
  hash(p.resource?.db||'')===baseline.databaseName);
 proof.pass=proof.baselineFresh&&proof.actualDatabaseMatchesConfigured&&
  proof.actualDatabaseNamespaceDistinct&&proof.privilegesInspectable&&
  proof.authenticatedPrincipalCount>0&&!proof.writePrivilegesOutsidePreviewDatabase&&
  !proof.productionWritePrivilegeDetected;
 return proof;
}
export async function diagnose(){
 const proof={kind:'preview-database-isolation',deploymentEnvironment:process.env.VERCEL_ENV,
  gitBranch:process.env.VERCEL_GIT_COMMIT_REF,gitSha:process.env.VERCEL_GIT_COMMIT_SHA,
  pass:false,writesPerformed:false};
 let client;
 try{
  if(process.env.VERCEL_ENV!=='preview')throw Error('PREVIEW_REQUIRED');
  const {MongoClient}=await import('mongodb');
  const uri=process.env.MONGODB_URI||'';
  // Emit configuration comparisons before connecting, to retain evidence if
  // connection authorization itself fails.
  Object.assign(proof,analyzeScope({uri,actualDatabase:decodeURIComponent(new URL(uri.trim()).pathname.slice(1))||'test'}));
  client=new MongoClient(uri,{serverSelectionTimeoutMS:10000,connectTimeoutMS:10000,maxPoolSize:1});
  await client.connect();
  const db=client.db();
  await db.command({ping:1,maxTimeMS:5000});
  proof.databaseConnected=true;
  const status=await db.command({connectionStatus:1,showPrivileges:true,maxTimeMS:5000});
  Object.assign(proof,analyzeScope({uri,actualDatabase:db.databaseName,authInfo:status.authInfo}));
 }catch(error){
  proof.pass=false;
  proof.errorCode=typeof error.codeName==='string'?error.codeName:
   error.message==='PREVIEW_REQUIRED'?'PREVIEW_REQUIRED':'DATABASE_SCOPE_DIAGNOSTIC_FAILED';
 }finally{if(client)await client.close().catch(()=>{});}
 console.log('PREVIEW_DATABASE_SCOPE_PROOF '+JSON.stringify(proof));
 return proof;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 await diagnose();
}
