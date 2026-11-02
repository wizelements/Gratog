PRAGMA foreign_keys = ON;

ALTER TABLE reward_accounts ADD COLUMN lifetime_earned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reward_accounts ADD COLUMN lifetime_redeemed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reward_accounts ADD COLUMN pending_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reward_accounts ADD COLUMN tier TEXT NOT NULL DEFAULT 'seedling';
ALTER TABLE reward_accounts ADD COLUMN tier_achieved_at TEXT;
ALTER TABLE reward_accounts ADD COLUMN progress_purchases INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reward_accounts ADD COLUMN progress_spent_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reward_accounts ADD COLUMN referral_code TEXT;
ALTER TABLE reward_accounts ADD COLUMN referred_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reward_accounts ADD COLUMN referred_by TEXT REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE reward_accounts ADD COLUMN favorite_reward TEXT;
ALTER TABLE reward_accounts ADD COLUMN last_earned_at TEXT;
ALTER TABLE reward_accounts ADD COLUMN last_redeemed_at TEXT;
ALTER TABLE reward_accounts ADD COLUMN expires_at TEXT;
ALTER TABLE reward_accounts ADD COLUMN created_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS reward_accounts_customer_once
  ON reward_accounts(customer_id) WHERE customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reward_accounts_referral_code_once
  ON reward_accounts(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS reward_accounts_expiration
  ON reward_accounts(expires_at) WHERE points > 0;
CREATE UNIQUE INDEX IF NOT EXISTS reward_transaction_source_event_once
  ON reward_transactions(source_event_id) WHERE source_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reward_transaction_source_event_once
  ON reward_transactions(source_event_id) WHERE source_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id TEXT PRIMARY KEY,
  reward_account_id TEXT NOT NULL REFERENCES reward_accounts(id) ON DELETE RESTRICT,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  reward_id TEXT NOT NULL,
  coupon_code TEXT NOT NULL UNIQUE,
  credits_cost INTEGER NOT NULL CHECK (credits_cost >= 0),
  reward_type TEXT NOT NULL,
  reward_value_json TEXT CHECK (reward_value_json IS NULL OR json_valid(reward_value_json)),
  minimum_order_cents INTEGER,
  applied INTEGER NOT NULL DEFAULT 0 CHECK (applied IN (0,1)),
  applied_at TEXT,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reward_redemptions_customer_time
  ON reward_redemptions(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reward_referrals (
  id TEXT PRIMARY KEY,
  referral_code TEXT NOT NULL,
  referrer_customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  referred_customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  referred_email_normalized TEXT,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  order_total_cents INTEGER,
  referrer_credited INTEGER NOT NULL DEFAULT 0 CHECK (referrer_credited IN (0,1)),
  credited_at TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS reward_referrals_customer_once
  ON reward_referrals(referred_customer_id) WHERE referred_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reward_referrals_email_once
  ON reward_referrals(referred_email_normalized) WHERE referred_email_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS reward_referrals_referrer_time
  ON reward_referrals(referrer_customer_id, created_at DESC);
