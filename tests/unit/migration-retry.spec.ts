import { describe, expect, it, vi } from 'vitest';
import { isTransient, withRetry } from '../../scripts/migrate/retry.mjs';

describe('bounded migration retry', () => {
  it('retries a transient failure and succeeds', async () => {
    const operation = vi.fn().mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })).mockResolvedValue('ok');
    const result = await withRetry(operation, { sleep: async () => {}, random: () => 0 });
    expect(result).toEqual({ value: 'ok', attempts: 2, retried: 1 });
  });
  it('stops after the configured maximum', async () => {
    const operation = vi.fn().mockRejectedValue(Object.assign(new Error('busy'), { status: 503 }));
    await expect(withRetry(operation, { maxAttempts: 3, sleep: async () => {} })).rejects.toMatchObject({ retryAttempts: 3 });
    expect(operation).toHaveBeenCalledTimes(3);
  });
  it('does not retry validation, SQL, unique, or foreign-key failures', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('UNIQUE constraint failed'));
    await expect(withRetry(operation, { sleep: async () => {} })).rejects.toThrow('UNIQUE');
    expect(operation).toHaveBeenCalledOnce();
    expect(isTransient({ status: 429 })).toBe(true);
  });
});
