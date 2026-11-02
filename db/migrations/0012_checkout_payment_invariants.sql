-- SQL equivalents for checkout safety contracts introduced after the original
-- MongoDB -> Turso snapshot. Runtime code must implement matching transactions.
PRAGMA foreign_keys = ON;

ALTER TABLE orders ADD COLUMN checkout_attempt_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_attempt_once
  ON orders(checkout_attempt_key)
  WHERE checkout_attempt_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS checkout_stock_claims (
  order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'committed', 'released')),
  items_fingerprint TEXT NOT NULL,
  reserved_at TEXT NOT NULL,
  committed_at TEXT,
  released_at TEXT,
  release_reason TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkout_stock_claim_items (
  order_id TEXT NOT NULL REFERENCES checkout_stock_claims(order_id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, product_id)
);

CREATE TABLE IF NOT EXISTS square_refund_entries (
  refund_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payment_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL CHECK (currency = 'USD'),
  confirmed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS square_refund_entries_order
  ON square_refund_entries(order_id);

-- Sending notifications requires transactional claims, durable retry state and
-- idempotent provider requests. Merely writing an outbox row isn't delivery proof.
CREATE TABLE IF NOT EXISTS checkout_notification_outbox (
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('customer_confirmation', 'staff_notification')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'claimed', 'sent', 'failed', 'needs_reconciliation')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  provider_message_id TEXT,
  claimed_at TEXT,
  sent_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (order_id, kind)
);
