export const UPSERT_POLICIES = {
  schema_migrations: { key: ['version'], mode: 'INSERT_ONLY' },
  migration_runs: { key: ['id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['completed_at', 'status'] },
  migration_checkpoints: { key: ['migration_id', 'source_collection'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['last_source_id', 'records_read', 'records_written', 'records_rejected', 'updated_at'] },
  migration_source_records: { key: ['source_collection', 'source_id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['canonical_fingerprint', 'migrated_at'] },
  customers: { key: ['id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['email', 'name', 'phone', 'square_customer_id', 'preferences_json', 'total_orders', 'total_spent_cents', 'updated_at'] },
  customer_addresses: { key: ['id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['address_json', 'position'] },
  products: { key: ['id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['square_catalog_id', 'slug', 'name', 'description', 'active', 'metadata_json', 'updated_at'] },
  product_variations: { key: ['id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['name', 'price_cents', 'currency', 'active'] },
  markets: { key: ['id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['name', 'slug', 'address', 'city', 'state', 'zip', 'latitude', 'longitude', 'hours', 'day_of_week', 'description', 'maps_url', 'featured', 'active', 'schedule_json', 'updated_at'] },
  orders: { key: ['id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['order_number', 'square_order_id', 'customer_id', 'market_id', 'customer_snapshot_json', 'fulfillment_json', 'status', 'payment_status', 'subtotal_cents', 'tax_cents', 'total_cents', 'amount_paid_cents', 'balance_due_cents', 'currency', 'updated_at'] },
  order_items: { key: ['id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['product_id', 'variation_id', 'external_catalog_id', 'name_snapshot', 'quantity', 'unit_price_cents', 'total_cents', 'position', 'metadata_json'] },
  payments: { key: ['id'], mode: 'APPEND_ONLY' },
  inventory: { key: ['product_id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['current_stock', 'low_stock_threshold', 'active', 'source', 'updated_at'] },
  inventory_variations: { key: ['product_id', 'variation_id'], mode: 'INSERT_ONLY' },
  inventory_events: { key: ['id'], mode: 'APPEND_ONLY' },
  webhook_events: { key: ['event_id'], mode: 'APPEND_ONLY' },
  idempotency_keys: { key: ['namespace', 'key'], mode: 'APPEND_ONLY' },
  menus: { key: ['id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['market_id', 'title', 'description', 'image_url', 'thumbnail_url', 'canva_url', 'print_url', 'week_start', 'week_end', 'active', 'archived', 'updated_at'] },
  menu_products: { key: ['menu_id', 'product_id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['position'] },
  menu_tags: { key: ['menu_id', 'tag'], mode: 'INSERT_ONLY' },
  reward_accounts: { key: ['id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['customer_id', 'points', 'updated_at'] },
  reward_passports: { key: ['id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['customer_id', 'status', 'updated_at', 'metadata_json'] },
  reward_stamps: { key: ['id'], mode: 'APPEND_ONLY' },
  reward_transactions: { key: ['id'], mode: 'APPEND_ONLY' },
  operational_records: { key: ['source_collection', 'source_id'], mode: 'UPSERT_SELECTED_FIELDS', mutable: ['occurred_at', 'status', 'payload_json', 'canonical_fingerprint'] },
};

export function insertStatement(table, row) {
  const policy = UPSERT_POLICIES[table];
  if (!policy) throw new Error(`UPSERT_POLICY_MISSING:${table}`);
  const columns = Object.keys(row);
  const placeholders = columns.map(() => '?').join(',');
  const conflict = policy.key.join(',');
  let action = 'DO NOTHING';
  if (policy.mode === 'UPSERT_SELECTED_FIELDS') {
    const mutable = policy.mutable.filter((column) => columns.includes(column));
    action = mutable.length ? `DO UPDATE SET ${mutable.map((column) => `${column}=excluded.${column}`).join(',')}` : 'DO NOTHING';
  }
  return { sql: `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) ON CONFLICT(${conflict}) ${action}`, args: Object.values(row) };
}
