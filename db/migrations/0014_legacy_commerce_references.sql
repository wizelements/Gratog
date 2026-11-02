-- Retain complete source snapshots while normalized fields serve the runtime.
ALTER TABLE orders ADD COLUMN legacy_snapshot_json TEXT CHECK (legacy_snapshot_json IS NULL OR json_valid(legacy_snapshot_json));
ALTER TABLE customers ADD COLUMN legacy_snapshot_json TEXT CHECK (legacy_snapshot_json IS NULL OR json_valid(legacy_snapshot_json));
CREATE TABLE order_references (
 reference TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
 reference_kind TEXT NOT NULL CHECK (reference_kind IN ('mongo_id','business_id','square_order_id')),
 source_collection TEXT NOT NULL CHECK (source_collection IN ('orders','marketorders'))
);
CREATE INDEX order_references_order ON order_references(order_id);
CREATE TRIGGER order_reference_identity_immutable BEFORE UPDATE OF order_id ON order_references
WHEN OLD.order_id IS NOT NEW.order_id BEGIN SELECT RAISE(ABORT,'ORDER_REFERENCE_COLLISION'); END;
CREATE TABLE customer_references (
 reference TEXT PRIMARY KEY,
 customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
 reference_kind TEXT NOT NULL CHECK (reference_kind IN ('mongo_id','business_id','square_customer_id'))
);
CREATE INDEX customer_references_customer ON customer_references(customer_id);
CREATE TRIGGER customer_reference_identity_immutable BEFORE UPDATE OF customer_id ON customer_references
WHEN OLD.customer_id IS NOT NEW.customer_id BEGIN SELECT RAISE(ABORT,'CUSTOMER_REFERENCE_COLLISION'); END;
