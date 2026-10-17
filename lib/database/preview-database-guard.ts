/**
 * A preview deployment must never be allowed to silently reuse a production
 * database when Vercel has inherited or overridden MONGODB_URI.
 *
 * The expected name is configured independently on the PREVIEW environment.
 * This guard is a write-safety precondition, not proof of cluster isolation:
 * release certification must separately compare Preview and Production targets.
 */
type DatabaseEnvironment = {
  VERCEL_ENV?: string;
  PREVIEW_MONGODB_DATABASE_NAME?: string;
};

export function requiredPreviewDatabaseName(
  env: DatabaseEnvironment = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    PREVIEW_MONGODB_DATABASE_NAME: process.env.PREVIEW_MONGODB_DATABASE_NAME,
  },
): string | null {
  if (env.VERCEL_ENV !== 'preview') return null;
  const name = env.PREVIEW_MONGODB_DATABASE_NAME?.trim();
  if (!name || !/^[a-z0-9_-]+[-_](preview|staging|sandbox|test)$/i.test(name)) {
    throw new Error(
      'Preview database blocked: set PREVIEW_MONGODB_DATABASE_NAME to an isolated, preview-named database.',
    );
  }
  return name;
}

export function assertPreviewDatabaseIdentity(
  actualDatabaseName: string | undefined,
  env: DatabaseEnvironment = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    PREVIEW_MONGODB_DATABASE_NAME: process.env.PREVIEW_MONGODB_DATABASE_NAME,
  },
): void {
  const expectedName = requiredPreviewDatabaseName(env);
  if (expectedName !== null && actualDatabaseName !== expectedName) {
    throw new Error('Preview database blocked: connected database does not match the approved preview database.');
  }
}
