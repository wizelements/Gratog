-- Customer password accounts remain distinct from guest customer/contact records.
-- A typed email address is not proof of ownership of prior guest purchases.
CREATE TABLE customer_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE CHECK(email=lower(trim(email)) AND length(email)>0),
  name TEXT,
  phone TEXT,
  avatar TEXT,
  password_hash TEXT,
  active INTEGER NOT NULL CHECK(active IN(0,1)),
  auth_version INTEGER NOT NULL DEFAULT 0 CHECK(auth_version>=0),
  customer_id TEXT REFERENCES customers(id) ON DELETE RESTRICT,
  joined_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TRIGGER customer_account_identity_immutable
BEFORE UPDATE OF id,user_id,customer_id ON customer_accounts
WHEN OLD.id IS NOT NEW.id OR OLD.user_id IS NOT NEW.user_id OR OLD.customer_id IS NOT NEW.customer_id
BEGIN SELECT RAISE(ABORT,'CUSTOMER_ACCOUNT_IDENTITY_IMMUTABLE'); END;
CREATE TRIGGER customer_account_credentials_changed
AFTER UPDATE OF password_hash,active,email ON customer_accounts
WHEN OLD.password_hash IS NOT NEW.password_hash OR OLD.active IS NOT NEW.active OR OLD.email IS NOT NEW.email
BEGIN UPDATE customer_accounts SET auth_version=OLD.auth_version+1 WHERE id=NEW.id; END;
CREATE TABLE customer_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  auth_version INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX customer_sessions_account ON customer_sessions(account_id,expires_at);
CREATE TABLE customer_password_resets (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  auth_version INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  consumed_at TEXT
);
CREATE TABLE customer_account_preferences (
  account_id TEXT PRIMARY KEY REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  preferences_json TEXT NOT NULL CHECK(json_valid(preferences_json)),
  updated_at TEXT NOT NULL
);
