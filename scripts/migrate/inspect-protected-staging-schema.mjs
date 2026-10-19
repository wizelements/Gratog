#!/usr/bin/env node
/** Protected read-only inventory against the exact isolated Turso staging DB.
 * Never print rows, credentials, connection URL, tokens or account identifiers. */
import {mkdirSync,writeFileSync} from 'node:fs';
const expected='libsql://gratog-migration-cert-20261018-swatkins.aws-us-east-1.turso.io';
const e=process.env;
if(e.GITHUB_EVENT_NAME!=='workflow_dispatch'||e.GITHUB_REF!=='refs/heads/feat/turso-completion-20261019'||
  !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA||'')||e.TURSO_STAGING_DATABASE_URL!==expected||
  !e.TURSO_STAGING_AUTH_TOKEN||e.TURSO_STAGING_AUTH_TOKEN.length<24)
  throw Error('STAGING_READ_ONLY_IDENTITY_REQUIRED');
const {connect}=await import('@tursodatabase/serverless');
const db=connect({url:expected,authToken:e.TURSO_STAGING_AUTH_TOKEN,defaultQueryTimeout:15000});
const tables=new Set((await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")).map(r=>r.name));
const required=['customers','orders','order_items','payments','square_refund_entries',
 'products','product_variations','inventory','markets','menus','menu_products','menu_tags',
 'admin_identities','admin_identity_references','customer_accounts','customer_sessions',
 'customer_password_resets','customer_password_reset_delivery',
 'inventory_staff_adjustments','menu_operations'];
const known=required.map(name=>({table:name,present:tables.has(name)}));
const count=async name=>tables.has(name)?Number((await db.get('SELECT COUNT(*) AS n FROM '+name)).n):null;
const counts={};for(const name of ['customers','orders','products','markets','customer_accounts','admin_identities'])counts[name]=await count(name);
const report={kind:'PROTECTED_STAGING_READ_ONLY_SCHEMA',githubSha:e.GITHUB_SHA,
  stagingDatabaseIdentity:'gratog-migration-cert-20261018',
  tablePresence:known,counts,unverifiedRequiredTables:known.filter(x=>!x.present).map(x=>x.table),
  mutations:0,certifiesHistoricalParity:false,certifiesProductionCutover:false};
mkdirSync('test-results',{recursive:true});
writeFileSync('test-results/protected-staging-schema-read.json',JSON.stringify(report,null,2)+'\n');
console.log('ISOLATED_STAGING_SCHEMA_READ_ONLY '+JSON.stringify({required:required.length,missing:report.unverifiedRequiredTables,counts}));
