#!/usr/bin/env node
/** Compare every normalized table, row and field using a database-scoped read-only token. */
import {DatabaseSync} from 'node:sqlite';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {connect} from '@tursodatabase/serverless';
const expected='libsql://gratog-migration-cert-20261018-swatkins.aws-us-east-1.turso.io';
const file=process.env.TOG_NORMALIZED_STAGING_FILE;
if(process.env.TURSO_STAGING_DATABASE_URL!==expected||!process.env.TURSO_STAGING_AUTH_TOKEN||
 !file?.includes('/Backups/Gratog/')||!file.endsWith('.sqlite'))throw Error('IMPORTED_STAGING_PARITY_SCOPE_INVALID');
const local=new DatabaseSync(file,{readOnly:true});
const remote=connect({url:expected,authToken:process.env.TURSO_STAGING_AUTH_TOKEN,defaultQueryTimeout:20000});
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?
 Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):
 typeof value==='bigint'&&value<=BigInt(Number.MAX_SAFE_INTEGER)&&value>=BigInt(Number.MIN_SAFE_INTEGER)?Number(value):value;
const digest=rows=>createHash('sha256').update(rows.map(row=>JSON.stringify(canonical(row))).sort().join('\n')).digest('hex');
const report={kind:'COMPLETE_IMPORTED_STAGING_ROW_FIELD_PARITY',pass:false,readOnly:true,productionDatabaseWritten:false,tables:[],errors:[]};
try{
 const names=local.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row=>row.name);
 let next=0;
 await Promise.all(Array.from({length:4},async()=>{
  while(next<names.length){
   const name=names[next++];if(!/^[a-z][a-z0-9_]+$/.test(name))throw Error('UNEXPECTED_SCHEMA_IDENTIFIER');
   try{
    const expectedRows=local.prepare('SELECT * FROM '+name).all();
    const actualRows=await remote.all('SELECT * FROM '+name);
    const sourceHash=digest(expectedRows),destinationHash=digest(actualRows);
    report.tables.push({name,sourceRows:expectedRows.length,destinationRows:actualRows.length,sourceHash,destinationHash,pass:sourceHash===destinationHash&&expectedRows.length===actualRows.length});
   }catch(error){report.errors.push({name,code:error.name})}
  }
 }));
 report.tables.sort((a,b)=>a.name.localeCompare(b.name));
 report.pass=report.errors.length===0&&report.tables.length===names.length&&report.tables.every(row=>row.pass);
 report.tableCount=names.length;report.totalVerifiedRows=report.tables.reduce((n,row)=>n+row.sourceRows,0);report.verifiedAt=new Date().toISOString();
 if(!report.pass)process.exitCode=1;
}finally{local.close();writeFileSync('test-results/complete-staging-field-parity-20261018.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:report.pass,tables:report.tableCount,totalVerifiedRows:report.totalVerifiedRows,mismatchedTables:report.tables.filter(row=>!row.pass).map(row=>row.name),errors:report.errors}));}
