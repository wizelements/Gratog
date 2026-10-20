-- Menu mutations are atomic with their audit receipt. Historical menus remain
-- available to existing references; retirement changes publication flags only.
CREATE TABLE menu_operations (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
  operation TEXT NOT NULL CHECK (operation IN ('create','update','activate','archive')),
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT NOT NULL CHECK (json_valid(after_json)),
  occurred_at TEXT NOT NULL
);
CREATE INDEX menu_operations_menu_time ON menu_operations(menu_id,occurred_at);
