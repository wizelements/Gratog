import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { MongoClient } = require('mongodb');

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
const mongo = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 1, minPoolSize: 0 });
const type = (value) => value === null ? 'null' : Array.isArray(value) ? 'array' : value instanceof Date ? 'date' : typeof value;
const tally = (values) => Object.fromEntries([...values.reduce((m, v) => m.set(type(v), (m.get(type(v)) ?? 0) + 1), new Map())].sort());
try {
  await mongo.connect();
  const db = mongo.db('taste_of_gratitude');
  const report = { catalog: {}, orders: {}, linkage: {} };
  for (const name of ['square_catalog_items', 'unified_products']) {
    const docs = await db.collection(name).find({}, { projection: { _id: 0, id: 1, squareId: 1, name: 1, slug: 1, price: 1, priceCents: 1, variations: 1, createdAt: 1, updatedAt: 1 } }).limit(100).toArray();
    const variations = docs.flatMap((doc) => Array.isArray(doc.variations) ? doc.variations : []);
    report.catalog[name] = {
      documents: await db.collection(name).countDocuments(),
      idTypes: tally(docs.map((d) => d.id)),
      squareIdTypes: tally(docs.map((d) => d.squareId)),
      priceTypes: tally(docs.map((d) => d.price)),
      priceCentsTypes: tally(docs.map((d) => d.priceCents)),
      variationCount: variations.length,
      variationIdTypes: tally(variations.map((v) => v?.id)),
      variationPriceTypes: tally(variations.map((v) => v?.price)),
      variationPriceCentsTypes: tally(variations.map((v) => v?.priceCents)),
      variationAmountTypes: tally(variations.map((v) => v?.priceMoney?.amount ?? v?.price_money?.amount)),
      duplicateSlugGroups: (await db.collection(name).aggregate([{ $match: { slug: { $type: 'string', $ne: '' } } }, { $group: { _id: '$slug', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: 'count' }]).next())?.count ?? 0,
    };
  }
  for (const name of ['orders', 'marketorders']) {
    const docs = await db.collection(name).find({}, { projection: { _id: 0, total: 1, totalCents: 1, subtotal: 1, tax: 1, amountPaid: 1, balanceDue: 1, customerId: 1, squareCustomerId: 1, customerEmail: 1, items: 1 } }).toArray();
    report.orders[name] = {
      documents: docs.length,
      totalTypes: tally(docs.map((d) => d.total)),
      totalCentsTypes: tally(docs.map((d) => d.totalCents)),
      subtotalTypes: tally(docs.map((d) => d.subtotal)),
      taxTypes: tally(docs.map((d) => d.tax)),
      amountPaidTypes: tally(docs.map((d) => d.amountPaid)),
      balanceDueTypes: tally(docs.map((d) => d.balanceDue)),
      itemCount: docs.reduce((n, d) => n + (Array.isArray(d.items) ? d.items.length : 0), 0),
      missingTotalAndTotalCents: docs.filter((d) => d.total == null && d.totalCents == null).length,
      missingTotalFieldNames: Object.fromEntries([...docs.filter((d) => d.total == null && d.totalCents == null).flatMap(Object.keys).reduce((m, key) => m.set(key, (m.get(key) ?? 0) + 1), new Map())].sort()),
      missingTotalItemPriceTypes: tally(docs.filter((d) => d.total == null && d.totalCents == null).flatMap((d) => Array.isArray(d.items) ? d.items.map((i) => i?.price) : [])),
      missingTotalItemPriceCentsTypes: tally(docs.filter((d) => d.total == null && d.totalCents == null).flatMap((d) => Array.isArray(d.items) ? d.items.map((i) => i?.priceCents) : [])),
      missingTotalItemPriceAtPurchaseTypes: tally(docs.filter((d) => d.total == null && d.totalCents == null).flatMap((d) => Array.isArray(d.items) ? d.items.map((i) => i?.priceAtPurchase) : [])),
      missingTotalItemFieldNames: Object.fromEntries([...docs.filter((d) => d.total == null && d.totalCents == null).flatMap((d) => Array.isArray(d.items) ? d.items.flatMap(Object.keys) : []).reduce((m, key) => m.set(key, (m.get(key) ?? 0) + 1), new Map())].sort()),
      missingTotalPriceEqualsPriceAtPurchase: docs.filter((d) => d.total == null && d.totalCents == null).flatMap((d) => Array.isArray(d.items) ? d.items : []).filter((i) => i?.price != null && i.price === i.priceAtPurchase).length,
    };
  }
  const customers = await db.collection('customers').find({}, { projection: { _id: 1, email: 1, squareCustomerId: 1 } }).toArray();
  const customerIds = new Set(customers.map((d) => String(d._id)));
  const squareIds = new Set(customers.map((d) => d.squareCustomerId).filter(Boolean).map(String));
  const emailCounts = new Map();
  for (const d of customers) if (typeof d.email === 'string' && d.email.trim()) { const e = d.email.trim().toLowerCase(); emailCounts.set(e, (emailCounts.get(e) ?? 0) + 1); }
  const link = { explicitId: 0, squareId: 0, uniqueEmail: 0, guestOrUnlinked: 0, ambiguousEmail: 0 };
  for await (const d of db.collection('orders').find({}, { projection: { customerId: 1, squareCustomerId: 1, customerEmail: 1 } })) {
    if (d.customerId != null && customerIds.has(String(d.customerId))) link.explicitId++;
    else if (d.squareCustomerId != null && squareIds.has(String(d.squareCustomerId))) link.squareId++;
    else if (typeof d.customerEmail === 'string' && emailCounts.get(d.customerEmail.trim().toLowerCase()) === 1) link.uniqueEmail++;
    else if (typeof d.customerEmail === 'string' && (emailCounts.get(d.customerEmail.trim().toLowerCase()) ?? 0) > 1) link.ambiguousEmail++;
    else link.guestOrUnlinked++;
  }
  report.linkage = link;
  const inventoryLinks = await db.collection('inventory').aggregate([
    { $lookup: { from: 'unified_products', localField: 'productId', foreignField: 'id', as: 'unified' } },
    { $lookup: { from: 'square_catalog_items', localField: 'productId', foreignField: 'id', as: 'square' } },
    { $group: { _id: null, documents: { $sum: 1 }, unifiedMatches: { $sum: { $cond: [{ $gt: [{ $size: '$unified' }, 0] }, 1, 0] } }, squareMatches: { $sum: { $cond: [{ $gt: [{ $size: '$square' }, 0] }, 1, 0] } }, missingBoth: { $sum: { $cond: [{ $and: [{ $eq: [{ $size: '$unified' }, 0] }, { $eq: [{ $size: '$square' }, 0] }] }, 1, 0] } } } },
  ]).next();
  report.catalog.inventoryRelationships = inventoryLinks ?? { documents: 0, unifiedMatches: 0, squareMatches: 0, missingBoth: 0 };
  const marketLinks = await db.collection('marketorders').aggregate([
    { $lookup: { from: 'markets', localField: 'marketId', foreignField: '_id', as: 'byMongoId' } },
    { $lookup: { from: 'markets', localField: 'marketId', foreignField: 'id', as: 'byBusinessId' } },
    { $lookup: { from: 'markets', localField: 'marketId', foreignField: 'slug', as: 'bySlug' } },
    { $group: { _id: null, documents: { $sum: 1 }, mongoIdMatches: { $sum: { $cond: [{ $gt: [{ $size: '$byMongoId' }, 0] }, 1, 0] } }, businessIdMatches: { $sum: { $cond: [{ $gt: [{ $size: '$byBusinessId' }, 0] }, 1, 0] } }, slugMatches: { $sum: { $cond: [{ $gt: [{ $size: '$bySlug' }, 0] }, 1, 0] } } } },
  ]).next();
  report.linkage.marketOrders = marketLinks;
  for (const paymentCollection of ['payment_records', 'payments']) {
    report.linkage[paymentCollection] = await db.collection(paymentCollection).aggregate([
      { $set: { _paymentOrderRef: { $ifNull: ['$orderId', '$metadata.orderId'] } } },
      { $lookup: { from: 'orders', localField: '_paymentOrderRef', foreignField: '_id', as: 'byMongoId' } },
      { $lookup: { from: 'orders', localField: '_paymentOrderRef', foreignField: 'squareOrderId', as: 'bySquareId' } },
      { $group: { _id: null, documents: { $sum: 1 }, mongoIdMatches: { $sum: { $cond: [{ $and: [{ $ne: ['$_paymentOrderRef', null] }, { $gt: [{ $size: '$byMongoId' }, 0] }] }, 1, 0] } }, squareIdMatches: { $sum: { $cond: [{ $and: [{ $ne: ['$_paymentOrderRef', null] }, { $gt: [{ $size: '$bySquareId' }, 0] }] }, 1, 0] } }, missingOrderId: { $sum: { $cond: [{ $eq: ['$_paymentOrderRef', null] }, 1, 0] } } } },
    ]).next();
  }
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} finally { await mongo.close(); }
