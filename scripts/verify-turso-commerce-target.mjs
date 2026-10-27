#!/usr/bin/env node
/** Read-only Turso staging connectivity/schema proof; never accepts Production credentials. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {connect} from '@tursodatabase/serverless';
const url='libsql://gratog-migration-cert-20261018-swatkins.aws-us-east-1.turso.io';
const proof={kind:'turso-commerce-target-readback',source:'TURSO_STAGING',sha:process.env.GITHUB_SHA||null,
 startedAt:new Date().toISOString(),pass:false,writesPerformed:false,mongoUsed:false};
try{
 const token=process.env.TURSO_STAGING_AUTH_TOKEN||'';
 if(token.length<24)throw Error('TURSO_STAGING_CREDENTIAL_UNAVAILABLE');
 const db=connect({url,authToken:token,defaultQueryTimeout:10000});
 const row=await db.get('SELECT 1 AS ready');
 if(Number(row?.ready)!==1)throw Error('TURSO_STAGING_PING_FAILED');
 proof.connected=true;
 const tables=await db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
 const names=new Set(tables.map(r=>r.name));
 const required=['products','product_variations','inventory','orders','order_items','payments','checkout_stock_claims'];
 proof.tableCount=names.size;proof.missingTables=required.filter(name=>!names.has(name));
 proof.nativeCommerceSchemaReady=proof.missingTables.length===0;
 proof.pass=proof.nativeCommerceSchemaReady;
}catch(error){
 proof.errorCode=['TURSO_STAGING_CREDENTIAL_UNAVAILABLE','TURSO_STAGING_PING_FAILED'].includes(error.message)
  ?error.message:'TURSO_STAGING_READBACK_FAILED';
}
proof.completedAt=new Date().toISOString();
mkdirSync('test-results',{recursive:true});
writeFileSync('test-results/turso-commerce-target-readback.json',JSON.stringify(proof,null,2));
console.log('TURSO_COMMERCE_TARGET_READBACK '+JSON.stringify(proof));
if(!proof.pass)process.exitCode=1;
