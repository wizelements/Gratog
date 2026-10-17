import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { assertSquareEnvironmentIsolation } from '../lib/checkout/square-environment-guard';
import {
  assertPreviewDatabaseIdentity,
  requiredPreviewDatabaseName,
} from '../lib/database/preview-database-guard';

describe('Preview database fail-closed boundary', () => {
  it('requires an explicitly approved preview database before connecting', () => {
    expect(() => requiredPreviewDatabaseName({ VERCEL_ENV: 'preview' })).toThrow(/Preview database blocked/);
    expect(() => requiredPreviewDatabaseName({
      VERCEL_ENV: 'preview', PREVIEW_MONGODB_DATABASE_NAME: 'gratog',
    })).toThrow(/Preview database blocked/);
    expect(() => requiredPreviewDatabaseName({
      VERCEL_ENV: 'preview', PREVIEW_MONGODB_DATABASE_NAME: 'gratog_production',
    })).toThrow(/Preview database blocked/);
  });

  it('rejects a production or default database even with an approved preview name', () => {
    const env = { VERCEL_ENV: 'preview', PREVIEW_MONGODB_DATABASE_NAME: 'gratog_preview' };
    expect(() => assertPreviewDatabaseIdentity('gratog', env)).toThrow(/does not match/);
    expect(() => assertPreviewDatabaseIdentity('test', env)).toThrow(/does not match/);
    expect(() => assertPreviewDatabaseIdentity(undefined, env)).toThrow(/does not match/);
    expect(() => assertPreviewDatabaseIdentity('gratog_preview', env)).not.toThrow();
  });

  it('does not change the production connection contract', () => {
    expect(() => assertPreviewDatabaseIdentity('gratog', { VERCEL_ENV: 'production' })).not.toThrow();
    expect(requiredPreviewDatabaseName({ VERCEL_ENV: 'production' })).toBeNull();
  });
});

describe('Database connector coverage', () => {
  it('routes authentication through the protected Mongo connection', () => {
    const source = readFileSync('lib/db/users.js', 'utf8');
    expect(source).toContain('connectToSharedDatabase');
    expect(source).not.toMatch(/MongoClient\.connect|new MongoClient/);
  });
});

describe('Square Preview environment safety', () => {
  it('rejects real Square Production in Vercel Preview', () => {
    expect(() => assertSquareEnvironmentIsolation('EAAAlive', 'production', 'preview')).toThrow(/Preview payment blocked/);
    expect(() => assertSquareEnvironmentIsolation('sq0atp-live', 'sandbox', 'preview')).toThrow(/production access token/);
    expect(() => assertSquareEnvironmentIsolation('sandbox-test', 'sandbox', 'preview')).not.toThrow();
  });
  it('preserves deliberate production configuration', () => {
    expect(() => assertSquareEnvironmentIsolation('EAAAlive', 'production', 'production')).not.toThrow();
  });
});
