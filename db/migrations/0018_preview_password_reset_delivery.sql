-- A provider acceptance receipt is not proof of email delivery.
-- Store the reset notification on Turso; no Mongo email log fallback.
CREATE TABLE IF NOT EXISTS customer_password_reset_delivery (
  token_hash TEXT PRIMARY KEY REFERENCES customer_password_resets(token_hash) ON DELETE RESTRICT,
  account_id TEXT NOT NULL REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','accepted','needs_reconciliation')),
  provider_message_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS customer_password_reset_delivery_account
  ON customer_password_reset_delivery(account_id,created_at);
