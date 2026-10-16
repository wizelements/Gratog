/**
 * Fail closed before accessing MongoDB from a Vercel Preview deployment.
 *
 * Preview inherits Production MongoDB credentials unless explicitly overridden;
 * Square Sandbox credentials alone do not isolate test orders from customers.
 * Every Preview database must have an explicit, certification-only database
 * path, and every DB helper must agree on the same database name.
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

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  } catch {
    throw new PreviewDatabaseIsolationError();
  }

  const configuredName = (env.DATABASE_NAME || '').trim();
  if (
    !CERT_DB_PATTERN.test(databaseName) ||
    configuredName !== databaseName
  ) {
    throw new PreviewDatabaseIsolationError();
  }

  return databaseName;
}
