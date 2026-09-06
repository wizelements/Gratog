import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { transformDocument } from './transformers.mjs';
const require = createRequire(import.meta.url);
const { MongoClient } = require('mongodb');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 1, minPoolSize: 0 });
const report = { generatedAt: new Date().toISOString(), sourceDatabase: 'taste_of_gratitude', financial: {}, relationships: {}, statusDistributions: {} };
try {
  await client.connect(); const db = client.db('taste_of_gratitude');
  for (const collection of ['orders','marketorders','payment_records','payments']) {
    let documents = 0, targetOrderRows = 0, targetItemRows = 0, totalCents = 0n, paymentCents = 0n, legacyWithoutAmount = 0;
    const statuses = {};
    for await (const doc of db.collection(collection).find({}).sort({ _id: 1 }).batchSize(100)) {
      documents++; statuses[String(doc.status ?? 'missing')] = (statuses[String(doc.status ?? 'missing')] ?? 0) + 1;
      const result = transformDocument(collection, doc);
      for (const statement of result.statements) {
        if (statement.table === 'orders') { targetOrderRows++; totalCents += BigInt(statement.row.total_cents); }
        if (statement.table === 'order_items') targetItemRows++;
        if (statement.table === 'payments') paymentCents += BigInt(statement.row.amount_cents);
        if (statement.table === 'operational_records') legacyWithoutAmount++;
      }
    }
    report.financial[collection] = { documents, expectedOrderRows: targetOrderRows, expectedItemRows: targetItemRows, totalCents: totalCents.toString(), paymentCents: paymentCents.toString(), legacyWithoutAmount };
    report.statusDistributions[collection] = statuses;
  }
  const customerLinks = await db.collection('orders').aggregate([{ $match: { customerEmail: { $type: 'string', $ne: '' } } }, { $lookup: { from: 'customers', localField: 'customerEmail', foreignField: 'email', as: 'parent' } }, { $group: { _id: { $cond: [{ $gt: [{ $size: '$parent' }, 0] }, 'matched', 'orphan'] }, count: { $sum: 1 } } }]).toArray();
  report.relationships.ordersToCustomersByEmail = Object.fromEntries(customerLinks.map((x) => [x._id, x.count]));
  report.relationships.inventory = { documents: await db.collection('inventory').countDocuments({}), missingProductId: await db.collection('inventory').countDocuments({ $or: [{ productId: { $exists: false } }, { productId: null }, { productId: '' }] }) };
  report.relationships.webhookEventDuplicates = (await db.collection('webhook_events_processed').aggregate([{ $group: { _id: '$eventId', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: 'count' }]).toArray())[0]?.count ?? 0;
  await mkdir('migration-artifacts', { recursive: true }); await writeFile('migration-artifacts/business-baselines.json', JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ status: 'PASS', domains: Object.keys(report.financial).length, relationshipChecks: Object.keys(report.relationships).length }) + '\n');
} finally { await client.close(); }
