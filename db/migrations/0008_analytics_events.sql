CREATE TABLE IF NOT EXISTS analytics_events (
 id TEXT PRIMARY KEY,event_type TEXT NOT NULL,event_data_json TEXT NOT NULL CHECK(json_valid(event_data_json)),metadata_json TEXT NOT NULL CHECK(json_valid(metadata_json)),occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_events_type_time ON analytics_events(event_type,occurred_at DESC);
