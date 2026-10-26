import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSquareHealthStatus } from '@/lib/payments/config';

describe('Preview Square configuration and safe OAuth URL handling', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('fails closed when the public Web Payments application ID is absent', () => {
    vi.stubEnv('SQUARE_ENVIRONMENT', 'sandbox');
    vi.stubEnv('SQUARE_ACCESS_TOKEN', 'sandbox-fixture-do-not-use');
    vi.stubEnv('SQUARE_LOCATION_ID', 'sandbox-fixture-location');
    vi.stubEnv('NEXT_PUBLIC_SQUARE_APPLICATION_ID', '');
    const health = getSquareHealthStatus();
    expect(health.ok).toBe(false);
    expect(health.hasApplicationId).toBe(false);
    expect(health.configErrors).toContain('NEXT_PUBLIC_SQUARE_APPLICATION_ID');
    expect(health.warnings).not.toContain(
      "SQUARE_ENVIRONMENT (sandbox) doesn't match application ID pattern (production)",
    );
  });

  it('detects when Sandbox and production public application IDs are mismatched', () => {
    vi.stubEnv('SQUARE_ENVIRONMENT', 'sandbox');
    vi.stubEnv('SQUARE_ACCESS_TOKEN', 'sandbox-fixture-do-not-use');
    vi.stubEnv('SQUARE_LOCATION_ID', 'sandbox-fixture-location');
    vi.stubEnv('NEXT_PUBLIC_SQUARE_APPLICATION_ID', 'production-fixture-not-usable');
    const health = getSquareHealthStatus();
    expect(health.warnings).toContain(
      "SQUARE_ENVIRONMENT (sandbox) doesn't match application ID pattern (production)",
    );
  });

  it('strips newline and trailing slash from OAuth callback base URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://tasteofgratitude.shop/\\n');
    vi.stubEnv('NEXT_PUBLIC_SQUARE_APPLICATION_ID', '');
    vi.stubEnv('NEXT_PUBLIC_SQUARE_SANDBOX_APPLICATION_ID', '');
    const { GET } = await import('@/app/api/oauth/square/status/route');
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.redirectUrls.callback).toBe(
      'https://tasteofgratitude.shop/api/oauth/square/callback',
    );
    expect(body.redirectUrls.callback).not.toContain('\\n');
  });
});
