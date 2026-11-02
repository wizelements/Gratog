PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  phone TEXT,
  square_customer_id TEXT UNIQUE,
  preferences_json TEXT CHECK (preferences_json IS NULL OR json_valid(preferences_json)),
  total_orders INTEGER NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
  total_spent_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique_nonnull ON customers(lower(email)) WHERE email IS NOT NULL AND email <> '';

CREATE TABLE IF NOT EXISTS customer_addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address_json TEXT NOT NULL CHECK (json_valid(address_json)),
  position INTEGER NOT NULL CHECK (position >= 0),
  UNIQUE(customer_id, position)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  square_catalog_id TEXT UNIQUE,
  slug TEXT,
  name TEXT NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  metadata_json TEXT CHECK (metadata_json IS NULL OR json_valid(metadata_json)),
  created_at TEXT,
  updated_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique_nonnull ON products(slug) WHERE slug IS NOT NULL AND slug <> '';

CREATE TABLE IF NOT EXISTS product_variations (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  square_variation_id TEXT UNIQUE,
  name TEXT,
  price_cents INTEGER,
  currency TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TABLE IF NOT EXISTS markets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  latitude REAL,
  longitude REAL,
  hours TEXT,
  day_of_week INTEGER,
  description TEXT,
  maps_url TEXT,
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  schedule_json TEXT CHECK (schedule_json IS NULL OR json_valid(schedule_json)),
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS markets_active_name ON markets(active, name);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  source_collection TEXT NOT NULL CHECK (source_collection IN ('orders','marketorders')),
  order_number TEXT,
  square_order_id TEXT,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  market_id TEXT REFERENCES markets(id) ON DELETE SET NULL,
  customer_snapshot_json TEXT CHECK (customer_snapshot_json IS NULL OR json_valid(customer_snapshot_json)),
  fulfillment_json TEXT CHECK (fulfillment_json IS NULL OR json_valid(fulfillment_json)),
  status TEXT NOT NULL,
  payment_status TEXT,
  subtotal_cents INTEGER,
  tax_cents INTEGER,
  total_cents INTEGER NOT NULL,
  amount_paid_cents INTEGER,
  balance_due_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS orders_square_id_unique_nonnull ON orders(square_order_id) WHERE square_order_id IS NOT NULL AND square_order_id <> '';
CREATE INDEX IF NOT EXISTS orders_customer_created ON orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_created ON orders(status, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  variation_id TEXT REFERENCES product_variations(id) ON DELETE SET NULL,
  external_catalog_id TEXT,
  name_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER,
  total_cents INTEGER,
  position INTEGER NOT NULL CHECK (position >= 0),
  metadata_json TEXT CHECK (metadata_json IS NULL OR json_valid(metadata_json)),
  UNIQUE(order_id, position)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  square_payment_id TEXT UNIQUE,
  idempotency_key TEXT UNIQUE,
  status TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  receipt_url TEXT,
  provider_metadata_json TEXT CHECK (provider_metadata_json IS NULL OR json_valid(provider_metadata_json)),
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS inventory (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE RESTRICT,
  current_stock INTEGER NOT NULL,
  low_stock_threshold INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  source TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS inventory_variations (
  product_id TEXT NOT NULL REFERENCES inventory(product_id) ON DELETE CASCADE,
  variation_id TEXT NOT NULL,
  PRIMARY KEY(product_id, variation_id)
);
CREATE TABLE IF NOT EXISTS inventory_events (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  adjustment INTEGER,
  created_at TEXT NOT NULL,
  metadata_json TEXT CHECK (metadata_json IS NULL OR json_valid(metadata_json))
);
CREATE UNIQUE INDEX IF NOT EXISTS inventory_order_debit_once ON inventory_events(order_id, event_type) WHERE order_id IS NOT NULL AND event_type = 'order_debit';

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  first_attempt_at TEXT,
  last_attempt_at TEXT,
  processed_at TEXT,
  result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json))
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  namespace TEXT NOT NULL,
  key TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TEXT,
  metadata_json TEXT CHECK (metadata_json IS NULL OR json_valid(metadata_json)),
  PRIMARY KEY(namespace, key)
);
