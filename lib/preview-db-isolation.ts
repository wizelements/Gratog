/**
 * Fail closed before accessing MongoDB from a Vercel Preview deployment.
 *
 * Preview inherits Production MongoDB credentials unless explicitly overridden;
 * Square Sandbox credentials alone do not isolate test orders from customers.
 * Every Preview must explicitly select a certification-only database with
 * dbName; every API, account and webhook DB helper must use the guarded client.
 *
 * Only the database name is ever returned; URI credentials are never logged.
 */
export class PreviewDatabaseIsolationError extends Error {
  constructor() {
    super('Preview database isolation is not certified. Database access is blocked.');
    this.name = 'PreviewDatabaseIsolationError';
  }
}

const CERT_DB_PATTERN = /^tog_checkout_cert_[a-z0-9_]+$/i;

export function assertPreviewDatabaseIsolation(
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (env.VERCEL_ENV !== 'preview') return null;

  const uri = env.MONGODB_URI || '';
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new PreviewDatabaseIsolationError();
  }

  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) {
    throw new PreviewDatabaseIsolationError();
  }

  const configuredName = (env.DATABASE_NAME || '').trim();
  // The credential URI may name its authentication database. It is NEVER the
  // selected Preview data database: db-optimized.ts always passes explicit
  // dbName: configuredName, and all database consumers share that guarded client.
  // Reject absent/unsafe target names before creating or returning a connection.
  if (!parsed.hostname || !CERT_DB_PATTERN.test(configuredName)) {
    throw new PreviewDatabaseIsolationError();
  }
  return configuredName;
}
