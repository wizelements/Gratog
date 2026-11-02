PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS menus (
  id TEXT PRIMARY KEY,
  market_id TEXT REFERENCES markets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  canva_url TEXT,
  print_url TEXT,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  active INTEGER NOT NULL CHECK (active IN (0,1)),
  archived INTEGER NOT NULL CHECK (archived IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS menus_active_week ON menus(active, week_start DESC);
CREATE TABLE IF NOT EXISTS menu_products (menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE, product_id TEXT NOT NULL, position INTEGER NOT NULL, PRIMARY KEY(menu_id, product_id));
CREATE TABLE IF NOT EXISTS menu_tags (menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE, tag TEXT NOT NULL, PRIMARY KEY(menu_id, tag));

CREATE TABLE IF NOT EXISTS reward_accounts (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  points INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reward_passports (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  metadata_json TEXT CHECK (metadata_json IS NULL OR json_valid(metadata_json))
);
CREATE TABLE IF NOT EXISTS reward_stamps (
  id TEXT PRIMARY KEY,
  passport_id TEXT NOT NULL REFERENCES reward_passports(id) ON DELETE CASCADE,
  source_event_id TEXT,
  created_at TEXT NOT NULL,
  metadata_json TEXT CHECK (metadata_json IS NULL OR json_valid(metadata_json))
);
CREATE UNIQUE INDEX IF NOT EXISTS reward_stamp_event_once ON reward_stamps(source_event_id) WHERE source_event_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS reward_transactions (
  id TEXT PRIMARY KEY,
  reward_account_id TEXT REFERENCES reward_accounts(id) ON DELETE SET NULL,
  delta_points INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  source_event_id TEXT,
  created_at TEXT NOT NULL,
  metadata_json TEXT CHECK (metadata_json IS NULL OR json_valid(metadata_json))
);

-- Low-query ledgers/configuration retain canonical JSON while IDs, timestamps and
-- collection provenance remain relational and independently verifiable.
CREATE TABLE IF NOT EXISTS operational_records (
  source_collection TEXT NOT NULL,
  source_id TEXT NOT NULL,
  occurred_at TEXT,
  status TEXT,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  canonical_fingerprint TEXT NOT NULL,
  PRIMARY KEY(source_collection, source_id)
);
CREATE INDEX IF NOT EXISTS operational_records_collection_time ON operational_records(source_collection, occurred_at DESC);
