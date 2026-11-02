CREATE TABLE IF NOT EXISTS reward_catalog (
 id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,credits_cost INTEGER NOT NULL CHECK(credits_cost>0),reward_type TEXT NOT NULL,reward_value INTEGER NOT NULL CHECK(reward_value>=0),minimum_order_cents INTEGER NOT NULL DEFAULT 0 CHECK(minimum_order_cents>=0),tier_requirement TEXT,active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),expires_days INTEGER NOT NULL DEFAULT 30 CHECK(expires_days>0),redemption_count INTEGER NOT NULL DEFAULT 0 CHECK(redemption_count>=0),created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reward_catalog_active_cost ON reward_catalog(active,credits_cost);
