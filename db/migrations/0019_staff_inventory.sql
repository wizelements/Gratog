-- Preserve every migrated stock value, including negative historical balances.
-- The version tracks checkout reservations/releases as well as staff mutations.
ALTER TABLE inventory ADD COLUMN version INTEGER NOT NULL DEFAULT 0
  CHECK (typeof(version)='integer' AND version>=0);

CREATE TRIGGER inventory_stock_version
AFTER UPDATE OF current_stock,low_stock_threshold,active,source ON inventory
WHEN NEW.version=OLD.version
BEGIN
  UPDATE inventory SET version=OLD.version+1 WHERE product_id=NEW.product_id;
END;

-- Separate from payment idempotency: a retry of an authorized staff adjustment
-- returns its original result even after subsequent orders change live stock.
CREATE TABLE inventory_staff_adjustments (
  request_key TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES inventory(product_id) ON DELETE RESTRICT,
  adjustment INTEGER NOT NULL CHECK (typeof(adjustment)='integer' AND adjustment!=0 AND abs(adjustment)<=10000),
  expected_version INTEGER NOT NULL CHECK (typeof(expected_version)='integer' AND expected_version>=0),
  previous_stock INTEGER NOT NULL,
  resulting_stock INTEGER NOT NULL CHECK (typeof(resulting_stock)='integer' AND resulting_stock>=0 AND resulting_stock<=9007199254740991),
  result_version INTEGER NOT NULL CHECK (typeof(result_version)='integer' AND result_version>expected_version),
  reason TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE REFERENCES inventory_events(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL
);
CREATE INDEX inventory_staff_adjustments_product ON inventory_staff_adjustments(product_id,created_at);
