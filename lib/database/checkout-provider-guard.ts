import { tursoPreviewSelected } from '../checkout/turso-preview-runtime.mjs';

/**
 * Checkout is currently implemented using Mongo transactions. Defensively
 * refuse a DATABASE_PROVIDER=turso override until every order handler is
 * fully Turso-native and the final production cutover has been certified.
 * Without this, operators could wrongly believe that TURSO_* Vercel env vars
 * mean the application is using Turso, while it still charges via Mongo.
 */
export function assertMongoCheckoutProvider(
  environment: { DATABASE_PROVIDER?: string; VERCEL_ENV?: string; VERCEL_GIT_COMMIT_REF?: string } = process.env,
): void {
  const raw = (environment.DATABASE_PROVIDER || 'mongodb').trim().toLowerCase();
  if (tursoPreviewSelected(environment)) {
    throw new Error(
      'TURSO_APP_CUTOVER_BLOCKED: checkout runtime conversion and release proof not complete',
    );
  }
  if (raw === 'mongodb') return;
  throw new Error('INVALID_DATABASE_PROVIDER');
}
