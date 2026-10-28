#!/usr/bin/env node
/** Verify source transformations against the exact encrypted consistent snapshot, in memory only. */
import {readFileSync,readdirSync,writeFileSync,mkdirSync,chmodSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {serialize,deserialize} from 'bson';
import {openMongoSnapshot,sha256} from '../../lib/checkout/mongo-snapshot-archive.mjs';
import {transformDocument} from './transformers.mjs';
import {insertStatement} from './upsert-policy.mjs';
import {bindOrderReferences,bindCustomerReferences,bindReference} from './reference-context.mjs';
process.umask(0o077);
const root=process.env.TOG_SNAPSHOT_DIRECTORY;
if(!root?.includes('/Backups/Gratog/'))throw Error('CONSISTENT_SNAPSHOT_REQUIRED');
const archive=readFileSync(root+'/snapshot.togenc');
const snapshot=openMongoSnapshot(archive,readFileSync(root+'/snapshot.key'));
const source=new Map(snapshot.collections.map(c=>[c.name,c.documents.map(d=>deserialize(serialize(d)))]));
const registry=JSON.parse(readFileSync('migration-artifacts/collection-registry.json','utf8')).collections;
const active=new Set(registry.filter(c=>['MIGRATE','TRANSFORM'].includes(c.classification)).map(c=>c.collection));
const context={customerById:new Map(),customerBySquareId:new Map(),customerByEmail:new Map(),marketByReference:new Map(),orderByReference:new Map(),productSlugCounts:new Map()};
const emails=new Map();
for(const d of source.get('customers')||[]){bindCustomerReferences(context.customerById,d);if(d.squareCustomerId)bindReference(context.customerBySquareId,d.squareCustomerId,String(d._id));if(d.email){const email=d.email.toLowerCase().trim();emails.set(email,[...(emails.get(email)||[]),String(d._id)])}}
for(const [email,ids]of emails)if(ids.length===1)context.customerByEmail.set(email,ids[0]);
for(const d of source.get('markets')||[])for(const reference of [d._id,d.id,d.slug])bindReference(context.marketByReference,reference,String(d._id));
for(const name of ['orders','marketorders'])for(const d of source.get(name)||[])bindOrderReferences(context.orderByReference,d);
for(const d of source.get('unified_products')||[])if(d.slug)context.productSlugCounts.set(d.slug,(context.productSlugCounts.get(d.slug)||0)+1);
const ordered=[...new Set(['markets','customers','unified_products','menus','orders','marketorders','payment_records','payments','inventory',...[...active].sort()])].filter(name=>active.has(name)||name==='unified_products');
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
const report={kind:'CONSISTENT_SOURCE_NORMALIZATION_SQLITE',pass:false,sourceReadOnly:true,
 remoteDatabaseWritten:false,sourceArchiveSha256:sha256(archive),sourceSnapshotClusterTime:snapshot.clusterTime,
 sourceCollections:snapshot.collections.length,sourceDocuments:snapshot.collections.reduce((n,c)=>n+c.documents.length,0),
 activeCollectionCount:active.size,collections:[],rejections:[],productionCutoverAuthorized:false};
try{
 for(const file of readdirSync('db/migrations').filter(x=>x.endsWith('.sql')).sort()){
  db.exec(readFileSync('db/migrations/'+file,'utf8'));
  db.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES (?,?)').run(file,new Date().toISOString());
 }
 db.prepare('INSERT INTO migration_runs(id,source_database,source_backup_sha256,started_at,completed_at,status) VALUES (?,?,?,?,?,?)')
  .run('consistent-snapshot-'+sha256(archive).slice(0,16),'taste_of_gratitude',sha256(archive),snapshot.capturedAt,new Date().toISOString(),'completed');
 for(const name of ordered){
  const stats={name,sourceCount:(source.get(name)||[]).length,targetRows:0,rejected:0};
  for(const document of source.get(name)||[]){
   try{
    const converted=transformDocument(name,document,context);
    db.exec('BEGIN');
    try{for(const statement of converted.statements){const q=insertStatement(statement.table,statement.row);db.prepare(q.sql).run(...q.args);stats.targetRows++}
     db.prepare('INSERT INTO migration_source_records(source_collection,source_id,canonical_fingerprint,migrated_at) VALUES (?,?,?,?)').run(name,converted.sourceId,converted.fingerprint,new Date().toISOString());
     db.exec('COMMIT')}catch(error){db.exec('ROLLBACK');throw error}
   }catch(error){stats.rejected++;report.rejections.push({collection:name,reasonCode:error.code||error.message.split(':')[0]})}
  }
  report.collections.push(stats);
 }
 const foreignKeys=db.prepare('PRAGMA foreign_key_check').all();
 report.foreignKeyViolations=foreignKeys.length;
 report.customerFacingOrderReferences=db.prepare("SELECT COUNT(*) n FROM order_references WHERE reference_kind='business_id'").get().n;
 report.customerBusinessReferences=db.prepare("SELECT COUNT(*) n FROM customer_references WHERE reference_kind='business_id'").get().n;
 report.linkedHistoricalPayments=db.prepare('SELECT COUNT(*) n FROM payments WHERE order_id IS NOT NULL').get().n;
 report.unlinkedHistoricalPayments=db.prepare('SELECT COUNT(*) n FROM payments WHERE order_id IS NULL').get().n;
 const expectedBusinessReferences=['orders','marketorders'].flatMap(name=>source.get(name)||[]).filter(d=>d.id!=null&&String(d.id)!==String(d._id)).length;
 const expectedPayments=['payment_records','payments'].flatMap(name=>source.get(name)||[]).filter(d=>(d.amountCents??d.amountMoney?.amount??d.totalMoney?.amount)!=null).length;
 report.expectedCustomerFacingOrderReferences=expectedBusinessReferences;
 report.expectedHistoricalPayments=expectedPayments;
 report.pass=report.rejections.length===0&&foreignKeys.length===0&&report.customerFacingOrderReferences===expectedBusinessReferences&&report.linkedHistoricalPayments===expectedPayments&&report.unlinkedHistoricalPayments===0;
 if(report.pass&&process.env.TOG_NORMALIZED_STAGING_FILE){
  const file=process.env.TOG_NORMALIZED_STAGING_FILE;
  if(!file.startsWith(root+'/')||!file.endsWith('.sqlite'))throw Error('PRIVATE_STAGING_FILE_SCOPE_INVALID');
  db.prepare('VACUUM INTO ?').run(file);chmodSync(file,0o600);
  report.normalizedStagingFileSha256=sha256(readFileSync(file));
  report.normalizedStagingFileCreated=true;
 }
 if(!report.pass)process.exitCode=1;
}finally{db.close();mkdirSync('test-results',{recursive:true});writeFileSync('test-results/consistent-source-normalization-20261018.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
