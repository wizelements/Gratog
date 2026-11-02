-- Missing-epoch legacy JWTs require a fresh password login after this release.
-- Preserve all administrator IDs and aliases. Epochs never move backwards.
ALTER TABLE admin_identities ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1
  CHECK (typeof(session_version)='integer' AND session_version BETWEEN 1 AND 9007199254740991);
ALTER TABLE admin_identities ADD COLUMN credential_fingerprint TEXT;

CREATE TRIGGER admin_session_version_monotonic
BEFORE UPDATE OF session_version ON admin_identities
WHEN NEW.session_version < OLD.session_version
BEGIN SELECT RAISE(ABORT,'ADMIN_SESSION_VERSION_REGRESSION'); END;

-- Even a disabled-then-reactivated or demoted-then-promoted account cannot
-- restore a captured old session. This also protects direct SQL admin writes.
CREATE TRIGGER admin_security_change_rotates_sessions
AFTER UPDATE OF is_active,role,email,credential_fingerprint ON admin_identities
WHEN (OLD.is_active IS NOT NEW.is_active OR OLD.role IS NOT NEW.role OR
      OLD.email IS NOT NEW.email OR OLD.credential_fingerprint IS NOT NEW.credential_fingerprint)
     AND NEW.session_version <= OLD.session_version
BEGIN
  UPDATE admin_identities SET session_version=OLD.session_version+1 WHERE id=NEW.id;
END;
