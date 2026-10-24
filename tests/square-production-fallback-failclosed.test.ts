import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSquareGuardConfig, shouldAllowFallback, validateProductionReadiness } from '@/lib/square-guard';
import { validateSquareEnvironment } from '@/lib/square-env-validator';

describe('Square real-production payment guard', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('never enables mock fallback on live Vercel even with sandbox and mock flags', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('SQUARE_ENVIRONMENT', 'sandbox');
    vi.stubEnv('SQUARE_MOCK_MODE', 'true');
    expect(getSquareGuardConfig()).toMatchObject({
      environment: 'sandbox', mockMode: true, allowFallback: false,
    });
    expect(shouldAllowFallback()).toBe(false);
    expect(validateProductionReadiness().ready).toBe(false);
    const result = validateSquareEnvironment();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Production deployment requires SQUARE_ENVIRONMENT=production');
    expect(result.errors).toContain('Production deployment requires SQUARE_MOCK_MODE=false');
  });

  it('allows intentional mock fixtures on isolated nonproduction sandbox only', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('SQUARE_ENVIRONMENT', 'sandbox');
    vi.stubEnv('SQUARE_MOCK_MODE', 'true');
    expect(shouldAllowFallback()).toBe(true);
  });

  it('never enables mock fallback when configured for real Square production', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('SQUARE_ENVIRONMENT', 'production');
    vi.stubEnv('SQUARE_MOCK_MODE', 'true');
    expect(shouldAllowFallback()).toBe(false);
  });
});