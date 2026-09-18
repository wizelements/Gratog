import { cents, fingerprint, iso, sourceId } from './migration-utils.mjs';
const json = (value) => value == null ? null : JSON.stringify(value);
const epoch = new Date(0).toISOString();
const timestamp = (doc, key = 'createdAt') => iso(doc[key] ?? doc.updatedAt ?? doc.timestamp, key) ?? epoch;
const row = (table, value) => ({ table, row: value });
const operational = (collection, doc) => [row('operational_records', { source_collection: collection, source_id: sourceId(doc._id), occurred_at: iso(doc.createdAt ?? doc.timestamp ?? doc.updatedAt, 'occurredAt'), status: doc.status ?? null, payload_json: json(doc), canonical_fingerprint: fingerprint(doc) })];

function customers(doc) {
  const id = sourceId(doc._id);
  return [row('customers', { id, email: doc.email ?? null, name: doc.name ?? null, phone: doc.phone ?? null, square_customer_id: doc.squareCustomerId ?? null, preferences_json: json(doc.preferences), total_orders: Number(doc.totalOrders ?? 0), total_spent_cents: cents(doc.totalSpent ?? 0, 'totalSpent', 'dollars'), created_at: timestamp(doc), updated_at: timestamp(doc, 'updatedAt') }), ...(doc.addresses ?? []).map((address, position) => row('customer_addresses', { id: `${id}:address:${position}`, customer_id: id, address_json: json(address), position }))];
}

const normalizedEmail = (value) => typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null;
function resolveCustomerId(doc, context = {}) {
  if (doc.customerId != null && context.customerById?.has(String(doc.customerId))) return context.customerById.get(String(doc.customerId));
  if (doc.squareCustomerId != null && context.customerBySquareId?.has(String(doc.squareCustomerId))) return context.customerBySquareId.get(String(doc.squareCustomerId));
  const email = normalizedEmail(doc.customerEmail);
  return email && context.customerByEmail?.has(email) ? context.customerByEmail.get(email) : null;
}
function resolveMarketId(doc, context = {}) {
  return doc.marketId != null ? context.marketByReference?.get(String(doc.marketId)) ?? null : null;
}
function sourceMoney(doc, field) {
  const centsField = `${field}Cents`;
  if (doc[centsField] != null) return cents(doc[centsField], centsField);
  if (doc[field] == null && field === 'total' && Array.isArray(doc.items) && doc.items.every((item) => item?.subtotal != null)) {
    return doc.items.reduce((sum, item) => sum + cents(item.subtotal, 'item.subtotal', 'dollars'), 0);
  }
  if (doc[field] == null) return null;
  return cents(doc[field], field, doc.source === 'square_sync' ? 'cents' : 'dollars');
}
function order(collection, doc, context) {
  const id = sourceId(doc._id), market = collection === 'marketorders';
  const total = sourceMoney(doc, 'total');
  if (total == null) throw new Error('MONEY_MISSING:total');
  const fulfillment = doc.deliveryInfo ?? doc.pickupInfo ?? null;
  const statements = [row('orders', { id, source_collection: collection, order_number: doc.orderNumber ?? null, square_order_id: doc.squareOrderId ?? null, customer_id: resolveCustomerId(doc, context), market_id: resolveMarketId(doc, context), customer_snapshot_json: json({ email: doc.customerEmail ?? null, name: doc.customerName ?? null, phone: doc.customerPhone ?? null }), fulfillment_json: json(doc.marketId == null ? fulfillment : { details: fulfillment, legacyMarketId: String(doc.marketId) }), status: doc.status ?? 'unknown', payment_status: doc.paymentStatus ?? null, subtotal_cents: sourceMoney(doc, 'subtotal'), tax_cents: sourceMoney(doc, 'tax'), total_cents: total, amount_paid_cents: sourceMoney(doc, 'amountPaid'), balance_due_cents: sourceMoney(doc, 'balanceDue'), currency: doc.currency ?? 'USD', created_at: timestamp(doc), updated_at: timestamp(doc, 'updatedAt') })];
  for (const [position, item] of (doc.items ?? []).entries()) { const quantity = Number(item.quantity ?? 1); const unit = item.priceCents != null ? cents(item.priceCents, 'item.priceCents') : item.price == null ? null : cents(item.price, 'item.price', doc.source === 'square_sync' ? 'cents' : 'dollars'); statements.push(row('order_items', { id: `${id}:item:${position}`, order_id: id, product_id: null, variation_id: null, external_catalog_id: item.catalogObjectId ?? item.variationId ?? item.productId ?? item.id ?? null, name_snapshot: item.name ?? item.productName ?? 'Unknown product', quantity, unit_price_cents: unit, total_cents: item.totalCents != null ? cents(item.totalCents, 'item.totalCents') : item.subtotal != null ? cents(item.subtotal, 'item.subtotal', doc.source === 'square_sync' ? 'cents' : 'dollars') : unit == null ? null : unit * quantity, position, metadata_json: json(item.metadata) })); }
  return statements;
}

function product(doc, context = {}) {
  const id = String(doc.id ?? doc.squareId ?? '');
  if (!id) throw new Error('EXTERNAL_ID_MISSING:productId');
  if (!doc.name) throw new Error('FIELD_MISSING:name');
  const sourceSlug = doc.slug ?? null;
  const slug = sourceSlug && (context.productSlugCounts?.get(sourceSlug) ?? 0) > 1 ? `${sourceSlug}-${id.toLowerCase().slice(-8)}` : sourceSlug;
  const images = Array.isArray(doc.images) && doc.images.length
    ? doc.images
    : doc.image ? [doc.image] : [];
  const metadata = {
    category: doc.intelligentCategory ?? doc.category ?? null,
    images,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    source: doc.source ?? 'square_catalog',
    sourceSlug,
    squareVisibility: doc.squareEcomVisibility ?? null,
    benefitStory: typeof doc.benefitStory === 'string' ? doc.benefitStory : null,
    ingredients: Array.isArray(doc.ingredients) ? doc.ingredients : [],
    benefits: Array.isArray(doc.benefits)
      ? doc.benefits
      : Array.isArray(doc.healthBenefitLabels) ? doc.healthBenefitLabels : [],
    ingredientIcons: Array.isArray(doc.ingredientIcons) ? doc.ingredientIcons : [],
  };
  const statements = [row('products', { id, square_catalog_id: String(doc.squareId ?? doc.id), slug, name: doc.name, description: doc.description ?? null, active: doc.squareIsArchived === true || doc.isArchived === true ? 0 : 1, metadata_json: json(metadata), created_at: iso(doc.createdAt, 'createdAt'), updated_at: iso(doc.updatedAt ?? doc.syncedAt, 'updatedAt') })];
  for (const variation of Array.isArray(doc.variations) ? doc.variations : []) {
    if (!variation?.id) throw new Error('EXTERNAL_ID_MISSING:variationId');
    const price = variation.priceCents != null ? cents(variation.priceCents, 'variation.priceCents') : variation.price == null ? null : cents(variation.price, 'variation.price', 'dollars');
    statements.push(row('product_variations', { id: String(variation.id), product_id: id, square_variation_id: String(variation.id), name: variation.name ?? null, price_cents: price, currency: variation.currency ?? doc.currency ?? 'USD', active: variation.isArchived === true ? 0 : 1 }));
  }
  return statements;
}

function inventory(doc) { const productId = doc.productId ?? doc.squareId; if (!productId) throw new Error('RELATIONSHIP_MISSING:productId'); return [row('inventory', { product_id: String(productId), current_stock: Number(doc.currentStock ?? 0), low_stock_threshold: Number(doc.lowStockThreshold ?? 0), active: doc.isActive === false ? 0 : 1, source: doc.source ?? 'mongo', updated_at: timestamp(doc, 'updatedAt') }), ...(doc.variationIds ?? []).map((variationId) => row('inventory_variations', { product_id: String(productId), variation_id: String(variationId) }))]; }
function market(doc) { return [row('markets', { id: sourceId(doc._id), name: doc.name, slug: doc.slug ?? null, address: doc.address ?? null, city: doc.city ?? null, state: doc.state ?? null, zip: doc.zip ?? null, latitude: doc.lat ?? null, longitude: doc.lng ?? null, hours: doc.hours ?? null, day_of_week: doc.dayOfWeek ?? null, description: doc.description ?? null, maps_url: doc.mapsUrl ?? null, featured: doc.featured ? 1 : 0, active: doc.isActive === false ? 0 : 1, schedule_json: json(doc.schedule), created_at: iso(doc.createdAt, 'createdAt'), updated_at: iso(doc.updatedAt, 'updatedAt') })]; }
function menu(doc) { const id = sourceId(doc._id); return [row('menus', { id, market_id: doc.marketId || null, title: doc.title, description: doc.description ?? null, image_url: doc.imageUrl, thumbnail_url: doc.thumbnailUrl ?? null, canva_url: doc.canvaUrl ?? null, print_url: doc.printUrl ?? null, week_start: timestamp(doc, 'weekStart'), week_end: timestamp(doc, 'weekEnd'), active: doc.isActive ? 1 : 0, archived: doc.isArchived ? 1 : 0, created_at: timestamp(doc), updated_at: timestamp(doc, 'updatedAt') }), ...(doc.linkedProducts ?? []).map((productId, position) => row('menu_products', { menu_id: id, product_id: String(productId), position })), ...(doc.seasonalTags ?? []).map((tag) => row('menu_tags', { menu_id: id, tag: String(tag) }))]; }
function payment(collection, doc, context = {}) { const amount = doc.amountCents ?? doc.amountMoney?.amount ?? doc.totalMoney?.amount; if (amount == null) return operational(collection, doc); const orderReference = doc.orderId ?? doc.metadata?.orderId ?? null; return [row('payments', { id: sourceId(doc._id), order_id: orderReference == null ? null : context.orderByReference?.get(String(orderReference)) ?? null, square_payment_id: doc.squarePaymentId ?? doc.id ?? null, idempotency_key: doc.idempotencyKey ?? null, status: doc.status ?? 'unknown', amount_cents: cents(amount, 'amountCents'), currency: doc.currency ?? doc.amountMoney?.currency ?? doc.totalMoney?.currency ?? 'USD', receipt_url: doc.receiptUrl ?? null, provider_metadata_json: json({ receiptNumber: doc.receiptNumber, cardBrand: doc.cardBrand, cardLast4: doc.cardLast4, legacyOrderId: orderReference == null ? null : String(orderReference) }), created_at: iso(doc.createdAt, 'createdAt'), updated_at: iso(doc.updatedAt, 'updatedAt') })]; }
function webhook(doc) { if (!doc.eventId) throw new Error('EXTERNAL_ID_MISSING:eventId'); return [row('webhook_events', { event_id: doc.eventId, provider: 'square', event_type: doc.eventType ?? 'unknown', status: doc.status ?? 'unknown', attempt_count: Number(doc.attemptCount ?? 1), first_attempt_at: iso(doc.firstAttemptAt, 'firstAttemptAt'), last_attempt_at: iso(doc.lastAttemptAt, 'lastAttemptAt'), processed_at: iso(doc.processedAt, 'processedAt'), result_json: json(doc.result) })]; }

const operationalNames = ['admin_users','audit_log','audit_logs','challenges','contact_messages','coupons','customer_passports','email_logs','email_sends','gratitude_accounts','idempotency_keys','inventory_events','lead_intents','learning_enrollments','learning_modules','market_counters','market_schedules','newsletter_subscribers','passport_idempotency','passports','product_reviews','products','quiz_results','reward_transactions','rewards','scheduled_emails','square_sync_metadata','users'];
const handlers = Object.fromEntries(operationalNames.map((name) => [name, (doc) => operational(name, doc)]));
Object.assign(handlers, { customers, inventory, markets: market, menus: menu, marketorders: (doc, context) => order('marketorders', doc, context), orders: (doc, context) => order('orders', doc, context), payment_records: (doc, context) => payment('payment_records', doc, context), payments: (doc, context) => payment('payments', doc, context), square_catalog_items: product, unified_products: product, webhook_events_processed: webhook });
// Square catalog and unified-product projections have explicit handlers for
// pilot/rebuild use, but are classified DERIVED and are not part of the 37
// active MIGRATE/TRANSFORM collection contract.
export const FINAL_TRANSFORMER_COLLECTIONS = Object.freeze(
  Object.keys(handlers).filter((name) => !['square_catalog_items', 'unified_products'].includes(name)).sort(),
);
export function transformDocument(collection, doc, context = {}) { const handler = handlers[collection]; if (!handler) throw new Error(`FINAL_TRANSFORMER_MISSING:${collection}`); return { sourceCollection: collection, sourceId: sourceId(doc._id), fingerprint: fingerprint(doc), statements: handler(doc, context) }; }
