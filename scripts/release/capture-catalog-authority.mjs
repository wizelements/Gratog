#!/usr/bin/env node
/** Read-only catalog evidence: no writes to Mongo, Square, Turso or business data. */
import { MongoClient } from 'mongodb';
import { EJSON } from 'bson';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const output = process.env.CATALOG_AUDIT_OUTPUT;
const report = { kind: 'AUTHENTICATED_CATALOG_SOURCE_READBACK_V1', sourceReadOnly: true,
  capturedAt: new Date().toISOString(), pass: false, requests: [], productionCutoverAuthorized: false };
let mongo, session;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Keys are explicitly projected. Customer/order/payment documents and tokens are never output.
const productProjection = Object.fromEntries(['id','squareId','name','slug','description','price','priceCents',
  'currency','category','intelligentCategory','variations','squareIsArchived','isArchived','squareEcomAvailable',
  'squareEcomVisibility','ecomVisibility','ecomAvailable','activeWeeklyMenu','weeklyStatus','inventoryStatus',
  'stock','currentStock','inStock','soldOut','available','source','syncedAt','updatedAt','taxIds',
  'modifierListInfo','marketExclusive','marketPickupOnly','fulfillmentType','squareData'].map(k => [k, 1]));
const inventoryProjection = Object.fromEntries(['productId','squareId','variationIds','currentStock',
  'isActive','lowStockThreshold','source','updatedAt'].map(k => [k, 1]));
productProjection._id = 0; inventoryProjection._id = 0;

try {
  if (!output || process.env.CATALOG_AUDIT_SOURCE !== 'taste_of_gratitude') throw Error('CATALOG_SCOPE_UNVERIFIED');
  if (!process.env.MONGODB_URI) throw Error('MONGO_CATALOG_CREDENTIAL_UNAVAILABLE');
  mongo = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 1, minPoolSize: 0, serverSelectionTimeoutMS: 15000,
    readPreference: 'primary' });
  await mongo.connect();
  const db = mongo.db('taste_of_gratitude');
  session = mongo.startSession({ snapshot: true, causalConsistency: false });
  const collections = {}; let clusterTime;
  for (const [name, projection] of [['unified_products', productProjection], ['square_catalog_items', productProjection],
    ['inventory', inventoryProjection]]) {
    collections[name] = await db.collection(name).find({}, { projection, session, maxTimeMS: 30000 }).toArray();
    const timestamp = session.snapshotTime && EJSON.stringify(session.snapshotTime, { relaxed: false });
    if (!timestamp || (clusterTime && timestamp !== clusterTime)) throw Error('MONGO_CATALOG_SNAPSHOT_INCONSISTENT');
    clusterTime = timestamp;
  }
  report.mongo = { database: 'taste_of_gratitude', readOnlySnapshot: true, clusterTime, collections,
    collectionDigests: Object.fromEntries(Object.entries(collections).map(([n, rows]) => [n, digest(rows)])) };
  await session.endSession(); session = null;
  await mongo.close(); mongo = null;
  if (!process.env.SQUARE_ACCESS_TOKEN) throw Error('SQUARE_CATALOG_CREDENTIAL_UNAVAILABLE');
  if (process.env.SQUARE_ENVIRONMENT !== 'production') throw Error('SQUARE_PRODUCTION_ENVIRONMENT_REQUIRED');
  const token = process.env.SQUARE_ACCESS_TOKEN.trim();
  const expectedApplication = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || process.env.SQUARE_APPLICATION_ID;
  const expectedLocation = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || process.env.SQUARE_LOCATION_ID;
  if (!expectedApplication || !expectedLocation) throw Error('SQUARE_PUBLIC_IDENTITIES_UNAVAILABLE');
  const square = async (path, body) => {
    const method = body === undefined ? 'GET' : 'POST';
    const permitted = (method === 'GET' && (path.startsWith('/v2/catalog/list?') || path === '/v2/locations')) ||
      (method === 'POST' && ['/oauth2/token/status', '/v2/inventory/counts/batch-retrieve'].includes(path));
    if (!permitted) throw Error('READ_ONLY_SQUARE_ENDPOINT_REQUIRED');
    const response = await fetch('https://connect.squareup.com' + path, {
      method, headers: { Authorization: 'Bearer ' + token, 'Square-Version': '2025-10-16', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(25000),
    });
    const result = await response.json();
    report.requests.push({ endpoint: path.split('?')[0], method, status: response.status,
      requestId: response.headers.get('x-request-id') || response.headers.get('square-request-id') || null,
      errorCodes: (result.errors || []).map(e => e.code) });
    if (!response.ok || result.errors?.length) throw Error('SQUARE_READBACK_FAILED');
    return result;
  };
  const identity = await square('/oauth2/token/status', {});
  const locations = await square('/v2/locations');
  const location = locations.locations?.find(l => l.id === expectedLocation);
  if (identity.client_id !== expectedApplication || !location || location.merchant_id !== identity.merchant_id ||
      location.status !== 'ACTIVE' || location.currency !== 'USD') throw Error('SQUARE_ACCOUNT_IDENTITY_MISMATCH');
  const objects = []; let cursor; const seen = new Set(); let catalogPages = 0;
  do {
    const result = await square('/v2/catalog/list?types=ITEM,ITEM_VARIATION,CATEGORY,TAX,MODIFIER_LIST' +
      (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    objects.push(...(result.objects || [])); catalogPages++; cursor = result.cursor;
    if (cursor && seen.has(cursor)) throw Error('SQUARE_CATALOG_CURSOR_LOOP');
    if (cursor) seen.add(cursor);
  } while (cursor);
  const counts = []; const inventorySeen = new Set(); let inventoryPages = 0;
  do {
    const result = await square('/v2/inventory/counts/batch-retrieve', {
      location_ids: [expectedLocation], ...(cursor ? { cursor } : {}), limit: 1000,
    });
    counts.push(...(result.counts || [])); inventoryPages++; cursor = result.cursor;
    if (cursor && inventorySeen.has(cursor)) throw Error('SQUARE_INVENTORY_CURSOR_LOOP');
    if (cursor) inventorySeen.add(cursor);
  } while (cursor);
  report.square = { environment: 'production', apiVersion: '2025-10-16', applicationId: identity.client_id,
    merchantId: identity.merchant_id, locationId: location.id, locationStatus: location.status,
    currency: location.currency, catalogPages, inventoryPages, paginationComplete: true,
    objects, inventoryCounts: counts, objectsSha256: digest(objects), inventorySha256: digest(counts) };

  report.pass = true;
} catch (error) {
  report.errorCode = /^[A-Z_]+$/.test(error?.message || '') ? error.message : error?.codeName || error?.name || 'UNKNOWN';
  process.exitCode = 1;
} finally {
  if (session) await session.endSession();
  if (mongo) await mongo.close();
  if (output) {
    const path = resolve(output); await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(path, JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  }
  console.log(JSON.stringify({ kind: report.kind, pass: report.pass, errorCode: report.errorCode,
    capturedAt: report.capturedAt, square: report.square && { applicationId: report.square.applicationId,
      merchantId: report.square.merchantId, locationId: report.square.locationId,
      catalogPages: report.square.catalogPages, inventoryPages: report.square.inventoryPages,
      catalogItems: report.square.objects.filter(o => o.type === 'ITEM').length,
      inventoryCounts: report.square.inventoryCounts.length },
    mongoCounts: report.mongo && Object.fromEntries(Object.entries(report.mongo.collections).map(([k,v]) => [k,v.length])),
    requestStatus: report.requests.map(r => ({ ...r })), productionCutoverAuthorized: false }));
}
