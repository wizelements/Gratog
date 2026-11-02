PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  segment_criteria_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(segment_criteria_json)),
  status TEXT NOT NULL,
  scheduled_for TEXT,
  sent_at TEXT,
  created_by TEXT NOT NULL,
  total_recipients INTEGER NOT NULL DEFAULT 0 CHECK (total_recipients >= 0),
  sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  delivered_count INTEGER NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  opened_count INTEGER NOT NULL DEFAULT 0 CHECK (opened_count >= 0),
  clicked_count INTEGER NOT NULL DEFAULT 0 CHECK (clicked_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  skipped_count INTEGER NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS campaigns_status_created ON campaigns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS campaigns_creator_created ON campaigns(created_by, created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_email_sends (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  error TEXT,
  provider_message_id TEXT,
  sent_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS campaign_email_sends_campaign ON campaign_email_sends(campaign_id, sent_at);
