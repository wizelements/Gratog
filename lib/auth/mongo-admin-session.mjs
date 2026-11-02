import { isActiveAdminRecord, isSessionVersion } from './admin-session-policy.mjs';

/** Called only after successful password verification; CAS binds the login
 * to that exact credential, role, active state and security version. */
export async function establishMongoAdminLogin(collection, verified, credentialField = 'passwordHash') {
  if (!isActiveAdminRecord(verified) || !['passwordHash', 'password'].includes(credentialField) ||
      typeof verified[credentialField] !== 'string' || !verified[credentialField])
    throw new Error('ADMIN_LOGIN_STATE_INVALID');
  const legacy = verified.tokenVersion === undefined;
  if (!legacy && !isSessionVersion(verified.tokenVersion))
    throw new Error('ADMIN_SESSION_VERSION_INVALID');
  const identity = verified._id != null ? { _id: verified._id } : { id: verified.id };
  if (identity._id == null && (typeof identity.id !== 'string' || !identity.id))
    throw new Error('ADMIN_IDENTITY_INVALID');
  const query = {
    ...identity, role: verified.role, [credentialField]: verified[credentialField],
    tokenVersion: legacy ? { $exists: false } : verified.tokenVersion,
    isActive: { $ne: false }, active: { $ne: false },
    $or: [{ isActive: true }, { active: true }],
  };
  const current = await collection.findOneAndUpdate(query, {
    $set: { lastLogin: new Date(), ...(legacy ? { tokenVersion: 1 } : {}) },
  }, { returnDocument: 'after', includeResultMetadata: false });
  if (!isActiveAdminRecord(current) || !isSessionVersion(current.tokenVersion))
    throw new Error('ADMIN_LOGIN_STATE_CHANGED');
  return current;
}

/** All Mongo administrator security mutations must rotate the epoch atomically.
 * Target Turso enforces this independently using database triggers. */
export async function updateMongoAdminSecurity(collection, identity, changes) {
  const allowed = new Set(['isActive', 'active', 'role', 'email', 'passwordHash', 'password', 'passwordUpdatedAt']);
  if (!identity || !Object.keys(identity).length || !changes || !Object.keys(changes).length ||
      Object.keys(changes).some(key => !allowed.has(key)))
    throw new Error('ADMIN_SECURITY_UPDATE_INVALID');
  const result = await collection.updateOne(identity, {
    $set: { ...changes, updatedAt: new Date() }, $inc: { tokenVersion: 1 },
  });
  if (result.matchedCount !== 1 || result.modifiedCount !== 1)
    throw new Error('ADMIN_SECURITY_WRITE_UNCONFIRMED');
}
