import {readdirSync} from 'node:fs';
import { connect } from '@tursodatabase/serverless';
const db=connect({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
const tables=await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
const indexes=await db.all("SELECT name,tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name");
const versions=await db.all('SELECT version FROM schema_migrations ORDER BY version');
let foreignKeys=0; for(const table of tables) foreignKeys+=(await db.all(`PRAGMA foreign_key_list(${String(table.name).replace(/[^a-z0-9_]/gi,'')})`)).length;
const required=['customers','orders','order_items','payments','inventory','inventory_events','webhook_events','menus','markets','migration_runs','migration_checkpoints','migration_source_records','operational_records','batch_audit_log','checkout_stock_claims','checkout_stock_claim_items','square_refund_entries','checkout_notification_outbox','checkout_notification_delivery_events','checkout_notification_deliveries','order_references','customer_references','admin_identities','admin_identity_references','customer_accounts','customer_sessions','customer_password_resets','customer_account_preferences','inventory_staff_adjustments','menu_operations'];
const names=tables.map(x=>String(x.name)); const missing=required.filter(x=>!names.includes(x));
const expectedVersions=readdirSync('db/migrations').filter(name=>/^\d{4}_.*\.sql$/.test(name)).sort();
// Historical prerequisites: 0013_notification_delivery.sql, 0014_legacy_commerce_references.sql,
// 0015_admin_identity.sql, 0016_admin_session_epoch.sql remain mandatory.
const missingVersions=expectedVersions.filter(version=>!versions.some(row=>String(row.version)===version));
const adminColumns=await db.all('PRAGMA table_info(admin_identities)');
const adminTriggers=await db.all("SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name='admin_identities'");
const adminEpochVerified=['session_version','credential_fingerprint'].every(name=>adminColumns.some(row=>row.name===name)) && ['admin_session_version_monotonic','admin_security_change_rotates_sessions'].every(name=>adminTriggers.some(row=>row.name===name));
const report={status:tables.length>=47&&versions.length>=16&&adminEpochVerified&&!missing.length&&!missingVersions.length?'PASS':'FAIL',adminEpochVerified,tables:tables.length,indexes:indexes.length,foreignKeys,schemaVersions:versions.map(x=>x.version),missing,missingVersions};
console.log(JSON.stringify(report));await db.close();if(report.status!=='PASS')process.exit(1);
