CREATE TABLE IF NOT EXISTS batch_audit_log (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  actor TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  metadata_json TEXT CHECK (metadata_json IS NULL OR json_valid(metadata_json)),
  reason TEXT,
  correlation_id TEXT
);
CREATE INDEX IF NOT EXISTS batch_audit_entity_time ON batch_audit_log(entity_type, entity_id, timestamp DESC);
