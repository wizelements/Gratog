import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  payment: vi.fn(),
  catalog: vi.fn(),
}));
vi.mock('@/lib/payments/config', () => ({ getSquareHealthStatus: mocks.payment }));
vi.mock('@/lib/storefront-products', () => ({ getStorefrontCatalogSnapshot: mocks.catalog }));
import { GET } from '@/app/api/health/commerce/route';

const bottle = (name: string) => ({
  name, slug: name.toLowerCase().replace(/\\s+/g, '-'), category: 'lemonades',
  price: 11.99, checkoutReady: true, inStock: true,
  variations: [{ id: 'square-variation-' + name, name: '16oz bottle', price: 11.99 }],
});

describe('fail-closed commerce readiness', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('PREVIEW_DB_ISOLATION_VERIFIED', 'true');
    vi.stubEnv('PREVIEW_SANDBOX_CATALOG_ENABLED', 'true');
    vi.stubEnv('SQUARE_ENVIRONMENT', 'sandbox');
    vi.stubEnv('SQUARE_WEBHOOK_SIGNATURE_KEY', 'sandbox-test-signing-key-not-real');
    mocks.payment.mockReset();
    mocks.catalog.mockReset();
    mocks.payment.mockReturnValue({ ok: true, environment: 'sandbox' });
    mocks.catalog.mockResolvedValue({
      source: 'unified_storefront', isFallback: false,
      products: [bottle('Strawberry Bliss'), bottle('SuppleMint')],
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('passes only with configured sandbox payment and two checkout-ready lemonade flavors', async () => {
    const response = await GET();
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ready).toBe(true);
    expect(data.availableLemonadeFlavors).toBe(2);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects Preview payment even with stocked products when the database is not certified isolated', async () => {
    vi.stubEnv('PREVIEW_DB_ISOLATION_VERIFIED', '');
    const response = await GET();
    const data = await response.json();
    expect(response.status).toBe(503);
    expect(data.checks.previewCatalogIsolation).toBe(false);
  });

  it('rejects the real Preview fallback catalog even if Square server credentials exist', async () => {
    mocks.catalog.mockResolvedValue({
      source: 'curated_weekly_market_empty_unified', isFallback: true,
      products: [bottle('Strawberry Bliss'), bottle('SuppleMint')],
    });
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).checks.liveCatalog).toBe(false);
  });

  it('rejects missing public Square SDK config and a wrongly configured Preview environment', async () => {
    mocks.payment.mockReturnValue({ ok: false, environment: 'sandbox' });
    expect((await GET()).status).toBe(503);
    mocks.payment.mockReturnValue({ ok: true, environment: 'production' });
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).checks.correctSquareEnvironment).toBe(false);
  });

  it('refuses production readiness when the Square webhook signing key is absent', async () => {
    vi.stubEnv('SQUARE_WEBHOOK_SIGNATURE_KEY', '');
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.checks.signedWebhookConfigured).toBe(false);
  });

  it('rejects one-flavor carts and fake checkout variants even when Mongo responds', async () => {
    mocks.catalog.mockResolvedValue({
      source: 'unified_storefront', isFallback: false,
      products: [bottle('Strawberry Bliss'), {
        ...bottle('SuppleMint'), checkoutReady: false,
      }],
    });
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).availableLemonadeFlavors).toBe(1);
  });

  it('returns only non-sensitive readiness data, never credentials', async () => {
    const response = await GET();
    const text = await response.text();
    expect(text).not.toContain('SQUARE_ACCESS_TOKEN');
    expect(text).not.toContain('secret');
    expect(text).not.toContain('mongodb://');
  });

  it('returns 503 on database/catalog exceptions instead of reporting healthy', async () => {
    mocks.catalog.mockRejectedValue(new Error('internal-secret-in-error'));
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).not.toContain('internal-secret-in-error');
  });
});
