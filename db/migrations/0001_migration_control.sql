PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS migration_runs (
  id TEXT PRIMARY KEY,
  source_database TEXT NOT NULL,
  source_backup_sha256 TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running','completed','failed','cancelled'))
);

CREATE TABLE IF NOT EXISTS migration_checkpoints (
  migration_id TEXT NOT NULL REFERENCES migration_runs(id) ON DELETE CASCADE,
  source_collection TEXT NOT NULL,
  last_source_id TEXT,
  records_read INTEGER NOT NULL DEFAULT 0 CHECK (records_read >= 0),
  records_written INTEGER NOT NULL DEFAULT 0 CHECK (records_written >= 0),
  records_rejected INTEGER NOT NULL DEFAULT 0 CHECK (records_rejected >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (migration_id, source_collection)
);

CREATE TABLE IF NOT EXISTS migration_source_records (
  source_collection TEXT NOT NULL,
  source_id TEXT NOT NULL,
  canonical_fingerprint TEXT NOT NULL,
  migrated_at TEXT NOT NULL,
  PRIMARY KEY (source_collection, source_id)
);
