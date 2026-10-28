/** Diagnostics intentionally exclude credentials, URLs, raw errors, and SQL data. */
export function tokenTiming(token, nowSeconds = Date.now() / 1000) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { jwt: false, expiryPresent: false, expired: null };
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const present = Number.isSafeInteger(claims.exp) && claims.exp > 0;
    return { jwt: true, expiryPresent: present, expired: present ? claims.exp <= nowSeconds : null };
  } catch { return { jwt: false, expiryPresent: false, expired: null }; }
}

export function safeTursoFailure(error) {
  const message = String(error?.message || '') + ' ' + String(error?.cause?.message || '');
  const candidates = [error?.status, error?.statusCode, error?.response?.status, error?.cause?.status];
  const status = candidates.find(n => Number.isInteger(n) && n >= 100 && n <= 599) ?? null;
  const names = new Set(['Error', 'TypeError', 'DatabaseError', 'TimeoutError', 'AbortError']);
  const errorType = names.has(error?.name) ? error.name : 'OtherError';
  let category = 'UNCLASSIFIED';
  if (/TURSO_SDK_API_MISMATCH/.test(message)) category = 'SDK_API_MISMATCH';
  else if (status === 401 || /unauthorized|invalid.?jwt|expired.?token|invalid.?token|authentication/i.test(message)) category = 'AUTHENTICATION';
  else if (status === 403 || /forbidden|permission denied/i.test(message)) category = 'AUTHORIZATION';
  else if (status === 404) category = 'DATABASE_OR_ENDPOINT_NOT_FOUND';
  else if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|fetch failed|network|certificate|TLS/i.test(message)) category = 'NETWORK';
  else if (/timeout|timed out|abort/i.test(message)) category = 'TIMEOUT';
  else if (/no such table|no such column|SQLITE_SCHEMA/i.test(message)) category = 'SCHEMA';
  return { category, errorType, httpStatus: status };
}
