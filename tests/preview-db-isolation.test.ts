import { describe, expect, it } from 'vitest';
import {
  assertPreviewDatabaseIsolation,
  PreviewDatabaseIsolationError,
} from '../lib/preview-db-isolation';

const certification = {
  VERCEL_ENV: 'preview',
  MONGODB_URI: 'mongodb+srv://user:pass@cluster.example.com/tog_checkout_cert_20261016?retryWrites=true',
  DATABASE_NAME: 'tog_checkout_cert_20261016',
};

describe('Preview MongoDB checkout safety', () => {
  it('admits an explicitly isolated, matching Preview database', () => {
    expect(assertPreviewDatabaseIsolation(certification)).toBe('tog_checkout_cert_20261016');
  });

  it('does not alter the Production database path', () => {
    expect(assertPreviewDatabaseIsolation({ ...certification, VERCEL_ENV: 'production' })).toBeNull();
  });

  it('rejects sharing the Production database', () => {
    expect(() => assertPreviewDatabaseIsolation({
      ...certification,
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.example.com/taste_of_gratitude',
      DATABASE_NAME: 'taste_of_gratitude',
    })).toThrow(PreviewDatabaseIsolationError);
  });

  it('rejects a missing database in MongoDB URI', () => {
    expect(() => assertPreviewDatabaseIsolation({
      ...certification,
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.example.com/',
    })).toThrow(PreviewDatabaseIsolationError);
  });

  it('rejects a mismatched DATABASE_NAME even when URI is isolated', () => {
    expect(() => assertPreviewDatabaseIsolation({
      ...certification,
      DATABASE_NAME: 'taste_of_gratitude',
    })).toThrow(PreviewDatabaseIsolationError);
  });

  it('rejects malformed URI', () => {
    expect(() => assertPreviewDatabaseIsolation({
      ...certification,
      MONGODB_URI: 'NOT A MONGO URI',
    })).toThrow(PreviewDatabaseIsolationError);
  });
});
