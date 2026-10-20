-- Lossless, additive BSON/EJSON shadow of the MongoDB source. This is an
-- evidence/archive substrate, not authorization to serve checkout from Turso.
-- Never expose document_ejson to public routes; it includes private records.
CREATE TABLE IF NOT EXISTS mongo_shadow_documents (
  collection_name TEXT NOT NULL,
  source_id_ejson TEXT NOT NULL,
  document_ejson TEXT NOT NULL,
  content_sha256 TEXT NOT NULL CHECK (length(content_sha256) = 64),
  mirror_run_id TEXT NOT NULL,
  PRIMARY KEY (collection_name, source_id_ejson)
);
CREATE INDEX IF NOT EXISTS mongo_shadow_documents_by_run
 ON mongo_shadow_documents (mirror_run_id, collection_name);
CREATE TABLE IF NOT EXISTS mongo_shadow_index_specs (
  collection_name TEXT NOT NULL,
  index_name TEXT NOT NULL,
  index_ejson TEXT NOT NULL,
  content_sha256 TEXT NOT NULL CHECK (length(content_sha256) = 64),
  mirror_run_id TEXT NOT NULL,
  PRIMARY KEY (collection_name, index_name)
);
CREATE TABLE IF NOT EXISTS mongo_shadow_mirror_runs (
  run_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('copying','verified','failed')),
  source_cluster_time TEXT,
  source_collections INTEGER,
  source_documents INTEGER,
  target_documents INTEGER,
  source_indexes INTEGER,
  target_indexes INTEGER,
  started_at TEXT NOT NULL,
  verified_at TEXT
);
