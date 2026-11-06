import { createClient } from '@libsql/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const OWNERS = ['silverwatkins@gmail.com', 'jenneisha.glover@gmail.com'];
export const SHARED_ADMIN_EMAIL = 'admin@tasteofgratitude.shop';

// These are approved recovery inboxes, not additional shared-admin credentials.
// "genisha.glover@gmail.com" is accepted as an entry alias only. The link
// always goes to the already-approved jenneisha.glover@gmail.com inbox.
const RECOVERY_INPUTS = new Map([
  ['silver watkins', OWNERS[0]],
  [OWNERS[0], OWNERS[0]],
  ['genisha.glover@gmail.com', OWNERS[1]],
  [OWNERS[1], OWNERS[1]],
  [SHARED_ADMIN_EMAIL, OWNERS[0]],
]);
export function resolveAdminRecoveryInbox(identity) {
  if (typeof identity !== 'string' || identity.length > 254) return null;
  return RECOVERY_INPUTS.get(identity.trim().toLowerCase()) || null;
}
const RESET_TTL = 30 * 60 * 1000;
const COOLDOWN = 15 * 60 * 1000;
let client;
let ready;

export function tursoAdminConfigured(env = process.env) {
  return Boolean(env.TURSO_DATABASE_URL && env.TURSO_AUTH_TOKEN);
}
export function getTursoAdminClient(env = process.env) {
  if (!tursoAdminConfigured(env)) throw Error('TURSO_ADMIN_DATABASE_NOT_CONFIGURED');
  if (!/^(libsql|https):\/\//.test(env.TURSO_DATABASE_URL)) throw Error('TURSO_ADMIN_REMOTE_DATABASE_REQUIRED');
  if (env.VERCEL_ENV === 'production' && /staging|preview|migration-cert|sandbox/i.test(env.TURSO_DATABASE_URL)) {
    throw Error('TURSO_ADMIN_PRODUCTION_CANNOT_USE_STAGING');
  }
  if (!client) client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
  return client;
}
const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS tog_admin_users (id TEXT PRIMARY KEY,email TEXT NOT NULL COLLATE NOCASE UNIQUE,name TEXT NOT NULL,password_hash TEXT,role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin','super_admin')),is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),session_version INTEGER NOT NULL DEFAULT 1,must_change_password INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,last_login_at INTEGER)",
  "CREATE TABLE IF NOT EXISTS tog_admin_resets (token_hash TEXT PRIMARY KEY,admin_id TEXT NOT NULL UNIQUE REFERENCES tog_admin_users(id) ON DELETE CASCADE,requested_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,state TEXT NOT NULL CHECK(state IN ('pending','accepted')),provider_message_id TEXT)",
  "CREATE TABLE IF NOT EXISTS tog_admin_audit (id TEXT PRIMARY KEY,admin_id TEXT,action TEXT NOT NULL,occurred_at INTEGER NOT NULL,metadata_json TEXT NOT NULL DEFAULT '{}')",
  "CREATE INDEX IF NOT EXISTS idx_tog_admin_reset_expiry ON tog_admin_resets(expires_at)"
];
export async function ensureTursoAdminSchema(db = getTursoAdminClient()) {
  if (db === client && ready) return ready;
  const initialize = async () => {
    await db.batch(SCHEMA, 'write');
    const now = Date.now();
    // Keep existing personal admin accounts intact for backwards compatibility.
    // The shared sign-in is separate, and never gets a default password.
    for (const email of [...OWNERS, SHARED_ADMIN_EMAIL]) {
      await db.execute({ sql: "INSERT OR IGNORE INTO tog_admin_users (id,email,name,password_hash,role,is_active,session_version,must_change_password,created_at,updated_at) VALUES (?,?,?,NULL,'admin',1,1,0,?,?)",
        args: [randomUUID(), email, email === SHARED_ADMIN_EMAIL ? 'Taste of Gratitude Admin' : email.split('@')[0], now, now] });
    }
  };
  if (db !== client) return initialize();
  ready = initialize().catch(e => { ready = undefined; throw e; });
  return ready;
}
export function isOwnerEmail(email) {
  return typeof email === 'string' && OWNERS.includes(email.trim().toLowerCase());
}
export async function adminByEmail(db, email) {
  const rs = await db.execute({ sql: "SELECT id,email,name,password_hash,role,is_active,session_version,must_change_password FROM tog_admin_users WHERE email=? LIMIT 1", args: [email.toLowerCase()] });
  return rs.rows[0] || null;
}
export async function adminById(db, id) {
  const rs = await db.execute({ sql: "SELECT id,email,name,role,is_active,session_version,must_change_password FROM tog_admin_users WHERE id=? LIMIT 1", args: [id] });
  return rs.rows[0] || null;
}
export async function verifyAdminInTurso(db, claim) {
  if (!claim || typeof claim.id !== 'string' || !Number.isSafeInteger(claim.sessionVersion)) return null;
  const a = await adminById(db, claim.id);
  if (!a || Number(a.is_active) !== 1 || Number(a.session_version) !== claim.sessionVersion ||
      a.email !== claim.email || a.role !== claim.role) return null;
  return a;
}
export async function logTursoAdminEvent(db, adminId, action, metadata = {}) {
  await db.execute({ sql: "INSERT INTO tog_admin_audit (id,admin_id,action,occurred_at,metadata_json) VALUES (?,?,?,?,?)",
    args: [randomUUID(), adminId, action, Date.now(), JSON.stringify(metadata)] });
}
export async function authenticateTursoAdmin(db, email, password) {
  const admin = await adminByEmail(db, email);
  const dummy = '$2b$12$2A5Zc3zJqGUB43VRQwePBO1fO6eAhm7BF8AMeiEK8Bdwa2Cy9Dms6';
  const hash = typeof admin?.password_hash === 'string' && admin.password_hash ? admin.password_hash : dummy;
  const valid = await bcrypt.compare(password, hash).catch(() => false);
  return valid && admin && Number(admin.is_active) === 1 ? admin : null;
}
const digest = raw => createHash('sha256').update(raw).digest('hex');

export async function issueTursoAdminReset(db, identity, send) {
  // A typed name or inbox is only a lookup. Control of the approved inbox is
  // required to obtain the single-use link that changes the shared account.
  const recipient = resolveAdminRecoveryInbox(identity);
  if (!recipient) return { requested: false };
  const admin = await adminByEmail(db, SHARED_ADMIN_EMAIL);
  if (!admin || Number(admin.is_active) !== 1) return { requested: false };
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  const hash = digest(token);
  // Atomic per-admin cooldown shared by all serverless instances.
  const added = await db.execute({
    sql: "INSERT INTO tog_admin_resets(token_hash,admin_id,requested_at,expires_at,state) VALUES (?,?,?,?,'pending') ON CONFLICT(admin_id) DO UPDATE SET token_hash=excluded.token_hash,requested_at=excluded.requested_at,expires_at=excluded.expires_at,state='pending',provider_message_id=NULL WHERE tog_admin_resets.requested_at <= ?",
    args: [hash, admin.id, now, now + RESET_TTL, now - COOLDOWN]
  });
  if (Number(added.rowsAffected) !== 1) return { requested: false, throttled: true };
  try {
    const messageId = await send({ email: recipient, token, expiresMinutes: 30 });
    if (typeof messageId !== 'string' || messageId.length < 3) throw Error('RESET_PROVIDER_RECEIPT_MISSING');
    const accepted = await db.execute({
      sql: "UPDATE tog_admin_resets SET state='accepted',provider_message_id=? WHERE token_hash=? AND state='pending'",
      args: [messageId, hash]
    });
    if (Number(accepted.rowsAffected) !== 1) throw Error('RESET_PROVIDER_RECEIPT_WRITE_FAILED');
    return { requested: true };
  } catch (error) {
    await db.execute({ sql: "DELETE FROM tog_admin_resets WHERE token_hash=? AND state='pending'", args: [hash] });
    throw error;
  }
}
export async function consumeTursoAdminReset(db, token, newPassword) {
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token) ||
      typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128) return false;
  const hash = await bcrypt.hash(newPassword, 12);
  const tx = await db.transaction('write');
  try {
    const row = await tx.execute({
      sql: "SELECT r.admin_id FROM tog_admin_resets r JOIN tog_admin_users a ON a.id=r.admin_id WHERE r.token_hash=? AND r.state='accepted' AND r.expires_at > ? AND a.is_active=1 LIMIT 1",
      args: [digest(token), Date.now()]
    });
    const id = row.rows[0]?.admin_id;
    if (!id) { await tx.rollback(); return false; }
    const claimed = await tx.execute({
      sql: "DELETE FROM tog_admin_resets WHERE token_hash=? AND state='accepted' AND expires_at > ? RETURNING admin_id",
      args: [digest(token), Date.now()]
    });
    if (claimed.rows.length !== 1 || claimed.rows[0].admin_id !== id) { await tx.rollback(); return false; }
    const updated = await tx.execute({
      sql: "UPDATE tog_admin_users SET password_hash=?,session_version=session_version+1,must_change_password=0,updated_at=? WHERE id=? AND is_active=1",
      args: [hash, Date.now(), id]
    });
    if (Number(updated.rowsAffected) !== 1) throw Error('ADMIN_PASSWORD_UPDATE_FAILED');
    await tx.execute({ sql: "INSERT INTO tog_admin_audit(id,admin_id,action,occurred_at) VALUES (?,?,?,?)",
      args: [randomUUID(), id, 'ADMIN_PASSWORD_RESET', Date.now()] });
    await tx.commit();
    return true;
  } catch (error) {
    try { await tx.rollback(); } catch {}
    throw error;
  } finally { tx.close(); }
}
export async function changeTursoAdminPassword(db, admin, oldPassword, newPassword) {
  const current = await adminByEmail(db, admin.email);
  if (!current?.password_hash || !(await bcrypt.compare(oldPassword, current.password_hash))) return false;
  const hash = await bcrypt.hash(newPassword, 12);
  const result = await db.execute({
    sql: "UPDATE tog_admin_users SET password_hash=?,session_version=session_version+1,updated_at=?,must_change_password=0 WHERE id=? AND password_hash=? AND session_version=? AND is_active=1",
    args: [hash, Date.now(), current.id, current.password_hash, current.session_version]
  });
  return Number(result.rowsAffected) === 1;
}
