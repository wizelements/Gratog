/** Shared server-side administrator state and session rules. */
export const isSessionVersion = value => Number.isSafeInteger(value) && value >= 1;

export function isActiveAdminRecord(admin) {
  return !!admin && admin.isActive !== false && admin.active !== false &&
    (admin.isActive === true || admin.active === true) &&
    ['admin', 'super_admin'].includes(admin.role) &&
    typeof admin.email === 'string' && !!admin.email.trim();
}

export function sessionMatchesAdminVersion(claim, version) {
  // Deliberate legacy disposition: pre-epoch JWTs must log in again. Missing
  // state never means epoch zero, and cannot silently restore old privileges.
  return isSessionVersion(claim?.sessionVersion) && isSessionVersion(version) &&
    claim.sessionVersion === version;
}

export function constrainAdminRole(claimRole, currentRole) {
  return claimRole === 'super_admin' && currentRole === 'super_admin'
    ? 'super_admin' : 'admin';
}
