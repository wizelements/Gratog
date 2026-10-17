/**
 * Checkout is currently implemented using Mongo transactions. Defensively
 * refuse a DATABASE_PROVIDER=turso override until every order handler is
 * fully Turso-native and the final production cutover has been certified.
 * Without this, operators could wrongly believe that TURSO_* Vercel env vars
 * mean the application is using Turso, while it still charges via Mongo.
 */
export function assertMongoCheckoutProvider(
  environment: { DATABASE_PROVIDER?: string } = { DATABASE_PROVIDER: process.env.DATABASE_PROVIDER },
): void {
  const raw = (environment.DATABASE_PROVIDER || 'mongodb').trim().toLowerCase();
  if (raw === 'mongodb') return;
  if (raw === 'turso') {
    throw new Error(
      'TURSO_APP_CUTOVER_BLOCKED: checkout runtime conversion and release proof not complete',
    );
  }
  throw new Error('INVALID_DATABASE_PROVIDER');
}
