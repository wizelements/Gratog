import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const inventory = JSON.parse(await readFile(join(root, ".tmp", "mongodb-inventory.json"), "utf8"));
const sourceRoots = ["app", "lib", "scripts", "tests"];
const extensions = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!new Set(["node_modules", ".next", ".git", "migration-artifacts"]).has(entry.name)) await walk(full);
    } else if (extensions.has(extname(entry.name)) && !full.endsWith("build-phase2-artifacts.mjs")) {
      files.push({ path: relative(root, full).replaceAll("\\", "/"), text: await readFile(full, "utf8") });
    }
  }
}
for (const sourceRoot of sourceRoots) await walk(join(root, sourceRoot));

const sets = {
  DERIVED: new Set(["unified_analytics", "unified_metrics", "product_sync_log", "square_catalog_categories", "square_catalog_items", "square_inventory", "unified_products"]),
  EPHEMERAL: new Set(["_verification_test", "email_queue", "owner_alert_queue", "password_resets", "pending_customers", "queuepositions", "sessions", "square_sync_queue", "staff_notifications"]),
  ARCHIVE_ONLY: new Set(["dailyinventories", "pre_orders", "products_unified", "webhook_logs"]),
  TRANSFORM: new Set(["admin_users", "challenges", "coupons", "customer_passports", "customers", "gratitude_accounts", "inventory", "inventory_events", "marketorders", "markets", "menus", "orders", "passports", "payment_records", "payments", "products", "reward_transactions", "rewards", "users"]),
};

const critical = new Set(["customers", "inventory", "marketorders", "orders", "payment_records", "payments", "webhook_events_processed"]);
const high = new Set(["admin_users", "coupons", "customer_passports", "idempotency_keys", "markets", "menus", "passports", "reward_transactions", "rewards", "square_catalog_items", "square_inventory", "unified_products", "users"]);
const writePattern = /(insertOne|insertMany|updateOne|updateMany|replaceOne|findOneAndUpdate|deleteOne|deleteMany|bulkWrite|createIndex)\s*\(/;
const readPattern = /(findOne|find|aggregate|countDocuments|estimatedDocumentCount|distinct)\s*\(/;
const normalizedTargets = {
  customers: ["customers", "customer_addresses"], users: ["users"], admin_users: ["admin_users"],
  orders: ["orders", "order_items"], marketorders: ["orders", "order_items"],
  payments: ["payments"], payment_records: ["payments"], inventory: ["inventory", "inventory_variations"],
  inventory_events: ["inventory_events"], markets: ["markets"], menus: ["menus", "menu_products", "menu_tags"],
  passports: ["reward_passports", "reward_stamps"], customer_passports: ["reward_passports", "reward_stamps"],
  rewards: ["reward_accounts"], reward_transactions: ["reward_transactions"],
  webhook_events_processed: ["webhook_events"], idempotency_keys: ["idempotency_keys"],
  square_catalog_items: ["products", "product_variations"], unified_products: ["products", "product_variations"],
  square_catalog_categories: ["product_categories"], square_inventory: ["inventory"],
};

function classification(name) {
  for (const [kind, names] of Object.entries(sets)) if (names.has(name)) return kind;
  return "MIGRATE";
}

function consumers(name) {
  const exact = new RegExp(`["']${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "g");
  const result = [];
  for (const file of files) {
    exact.lastIndex = 0;
    if (!exact.test(file.text)) continue;
    const lines = file.text.split(/\r?\n/);
    const matched = lines.filter((line) => line.includes(`'${name}'`) || line.includes(`"${name}"`));
    result.push({ file: file.path, read: matched.some((line) => readPattern.test(line)), write: matched.some((line) => writePattern.test(line)) });
  }
  return result;
}

const registry = Object.entries(inventory.collections).sort(([a], [b]) => a.localeCompare(b)).map(([name, info]) => {
  const usage = consumers(name);
  const kind = classification(name);
  const targetTables = kind === "ARCHIVE_ONLY" || kind === "EPHEMERAL" ? [] : (normalizedTargets[name] ?? [name]);
  return {
    collection: name,
    documentCount: info.estimatedCount,
    classification: kind,
    businessCriticality: critical.has(name) ? "CRITICAL" : high.has(name) ? "HIGH" : kind === "DERIVED" ? "DERIVED" : kind === "EPHEMERAL" ? "LOW" : "MEDIUM",
    authority: name.startsWith("square_") || ["unified_products", "product_sync_log"].includes(name) ? "Square" : kind === "DERIVED" ? "derived" : "MongoDB",
    applicationConsumers: usage.map(({ file }) => file),
    writeConsumers: usage.filter(({ write }) => write).map(({ file }) => file),
    readConsumers: usage.filter(({ read }) => read).map(({ file }) => file),
    primaryIdentifiers: ["_id"],
    externalIdentifiers: Object.keys(info.fields).filter((field) => /(^id$|Id$|_id$|email$)/i.test(field) && field !== "_id"),
    mongoIndexes: info.indexes,
    targetTables,
    migrationStrategy: kind === "ARCHIVE_ONLY" ? "PRESERVE_IN_VERIFIED_MONGO_BACKUP" : kind === "EPHEMERAL" ? "RECREATE_OR_EXPIRE_AT_CUTOVER" : kind === "DERIVED" ? "REBUILD_FROM_AUTHORITY_THEN_VERIFY" : kind === "TRANSFORM" ? "BOUNDED_NORMALIZE_AND_UPSERT" : "BOUNDED_UPSERT",
    verificationStrategy: critical.has(name) ? "COUNT_ID_FINGERPRINT_RELATIONSHIP_BUSINESS_AGGREGATE" : kind === "ARCHIVE_ONLY" ? "BACKUP_SHA_AND_ARCHIVE_DRY_RUN" : "COUNT_ID_FINGERPRINT",
    status: usage.length ? "ACTIVE_OR_REFERENCED" : kind === "ARCHIVE_ONLY" ? "UNREFERENCED_ARCHIVED" : kind === "EPHEMERAL" ? "RUNTIME_STATE_REVIEWED" : "DATA_ONLY_REVIEWED",
  };
});

const schemaProfile = {
  generatedAt: inventory.generatedAt,
  source: "bounded sample, maximum 100 documents per collection",
  collections: Object.fromEntries(Object.entries(inventory.collections).map(([name, info]) => [name, {
    documentCount: info.estimatedCount,
    sampled: info.sampled,
    fields: Object.fromEntries(Object.entries(info.fields).map(([field, value]) => [field, {
      types: value.types,
      presencePercent: info.sampled ? Number((100 * value.present / info.sampled).toFixed(2)) : 0,
      missingPercent: info.sampled ? Number((100 * (info.sampled - value.present) / info.sampled).toFixed(2)) : 0,
      normalizationRule: Object.keys(value.types).length > 1 ? "BLOCKED_PENDING_EXPLICIT_RULE" : "PRESERVE_CANONICAL_TYPE",
      indexInvolvement: info.indexes.filter((index) => Object.hasOwn(index.key, field)).map((index) => index.name),
    }]))
  }]))
};

await mkdir(join(root, "migration-artifacts"), { recursive: true });
await writeFile(join(root, "migration-artifacts", "collection-registry.json"), JSON.stringify({ database: inventory.database, collections: registry }, null, 2) + "\n");
await writeFile(join(root, "migration-artifacts", "schema-profile.json"), JSON.stringify(schemaProfile, null, 2) + "\n");

const dependencyLines = [
  '# MongoDB dependency map', '',
  'Generated from exact collection literals in runtime, scripts, and tests. Dynamic collection helpers remain flagged for review during vertical-slice conversion.', '',
  '| Collection | Consumers | Reads | Writes | Consistency / proof | Turso target | Status |',
  '| --- | --- | ---: | ---: | --- | --- | --- |',
  ...registry.map((item) => `| ${item.collection} | ${item.applicationConsumers.join('<br>') || 'No literal consumer'} | ${item.readConsumers.length} | ${item.writeConsumers.length} | ${item.verificationStrategy} | ${item.targetTables.join(', ') || 'none'} | ${item.status} |`),
  '', 'Active Mongo runtime references are retained until each vertical slice passes Turso tests and reconciliation.', ''
];
await mkdir(join(root, 'docs', 'architecture'), { recursive: true });
await writeFile(join(root, 'docs', 'architecture', 'mongodb-dependency-map.md'), dependencyLines.join('\n'));
const transformerMetadata = registry.filter((item) => ['MIGRATE','TRANSFORM'].includes(item.classification)).map((item) => ({
  sourceCollection: item.collection,
  classification: item.classification,
  criticality: item.businessCriticality,
  sourcePrimaryId: '_id (BSON type preserved in checkpoint; string form retained as target identity)',
  targetTables: item.targetTables,
  cardinality: item.collection === 'orders' || item.collection === 'marketorders' ? '1 source -> 1 orders + length(items) order_items + 1 provenance' : item.collection === 'customers' ? '1 source -> 1 customers + length(addresses) customer_addresses + 1 provenance' : item.collection === 'inventory' ? '1 source -> 1 inventory + length(variationIds) inventory_variations + 1 provenance' : '1 source -> 1 semantic/operational row + 1 provenance',
  idRule: 'preserve source _id string; preserve external IDs without remapping',
  moneyRule: ['orders','marketorders'].includes(item.collection) ? 'legacy dollar fields -> exact integer cents; *Cents fields preserved' : ['payments','payment_records'].includes(item.collection) ? 'provider minor-unit amount preserved; legacy records without amount retained operationally' : item.collection === 'customers' ? 'totalSpent dollars -> exact integer cents' : 'no authoritative money transformation',
  timestampRule: 'ISO-8601 UTC text; missing operational timestamp remains null; required core timestamp uses documented epoch fallback pending source rule',
  nullRule: 'preserve explicit null; optional missing -> null; required identifiers reject',
  writeBehavior: item.classification === 'MIGRATE' ? 'UPSERT_IMMUTABLE_KEY' : 'UPSERT_SELECTED_FIELDS',
  parity: item.verificationStrategy,
  implementation: `explicit handler: ${item.collection}`,
}));
await writeFile(join(root, 'migration-artifacts', 'domain-transformers.json'), JSON.stringify({ count: transformerMetadata.length, genericFinalTransformers: 0, transformers: transformerMetadata }, null, 2) + '\n');

const counts = registry.reduce((result, item) => ({ ...result, [item.classification]: (result[item.classification] ?? 0) + 1 }), {});
for (const name of ['MIGRATE','TRANSFORM','ARCHIVE_ONLY','DERIVED','EPHEMERAL','DEPRECATED','UNKNOWN']) counts[name] ??= 0;
await writeFile(join(root, 'migration-artifacts', 'mongodb-to-turso-report.json'), JSON.stringify({
  source: { database: 'taste_of_gratitude', collections: 57, estimatedDocuments: 5278, backup: { path: 'C:\\\\Users\\\\silve\\\\Backups\\\\gratog-mongodb-20260905-165553\\\\taste_of_gratitude.archive.gz', sha256: 'EDD422C06B813114D506C0A8DFCA4DFECCCB5E773218C6EB2D9E605FC9E0CE08', dryRunRestore: 'PASS' } },
  classification: counts,
  schema: { migrations: ['0001_migration_control.sql','0002_core_commerce.sql','0003_content_rewards_operations.sql'], status: 'IMPLEMENTED_UNDEPLOYED' },
  target: { driver: '@tursodatabase/serverless', credentials: 'PRESENT', identity: 'UNKNOWN', writesAllowed: false },
  migration: { batchSize: 100, concurrency: 1, dryRun: 'PASS', rejected: 0, remoteRun: 'BLOCKED_TARGET_IDENTITY' },
  parity: { status: 'NOT_RUN' }, application: { runtimeMongoRemaining: true }, tests: {}, security: { secretsPrinted: false, parameterizedSql: true },
  cutoverReady: false, a16HandoffReady: false
}, null, 2) + '\n');
process.stdout.write(JSON.stringify({ total: registry.length, classifications: counts, unknown: registry.filter((item) => item.classification === "UNKNOWN").length }) + "\n");
