CREATE TABLE IF NOT EXISTS deleted_campaigns (
  campaign_id TEXT PRIMARY KEY,
  campaign_json TEXT NOT NULL CHECK (json_valid(campaign_json)),
  deleted_by TEXT NOT NULL,
  deleted_at TEXT NOT NULL
);
