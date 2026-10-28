-- Native administrator session revocation with immutable cross-provider identities.
-- Password logins and full account management require separate certification.
CREATE TABLE admin_identities (
  id TEXT PRIMARY KEY,
  email TEXT,
  role TEXT NOT NULL,
  is_active INTEGER NOT NULL CHECK (is_active IN (0,1)),
  created_at TEXT,
  updated_at TEXT,
  legacy_id TEXT
);
CREATE UNIQUE INDEX admin_identities_email_unique_nonnull
  ON admin_identities(lower(email)) WHERE email IS NOT NULL AND email <> '';

CREATE TABLE admin_identity_references (
  reference TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admin_identities(id) ON DELETE RESTRICT,
  reference_kind TEXT NOT NULL CHECK (reference_kind IN ('mongo_id','business_id'))
);
CREATE INDEX admin_identity_references_admin ON admin_identity_references(admin_id);
CREATE TRIGGER admin_identity_reference_immutable BEFORE UPDATE OF admin_id ON admin_identity_references
WHEN OLD.admin_id IS NOT NEW.admin_id BEGIN SELECT RAISE(ABORT,'ADMIN_REFERENCE_COLLISION'); END;
