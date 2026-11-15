import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auditMarketingSite, ORIGIN, ROUTES } from '../../scripts/tog-marketing-live-readonly.mjs';

const html = {
  '/markets': '<main>Saturdays 9:00 AM – 12:00 PM</main>',
  '/m/serenbe': '<section>Find a flavor to ask about. Kissed by Gods 11.99 does not guarantee allergy safety. Nothing here is an online order.</section>',
  '/weekly-menu': '<main>Kissed by Gods</main>',
  '/about': '<main>Jenneisha and Ted’s Gym</main>',
};
const markets = { success: true, markets: [{ id: 'serenbe', hours: '09:00-12:00', isActive: true }], count: 1 };

function fakeFetcher({ override = {}, fail = [] } = {}) {
  return async (url, options) => {
    assert.equal(options.method, 'GET', 'no mutation permitted');
    assert.equal(typeof url, 'string');
    assert.ok(url.startsWith(ORIGIN + '/'));
    const path = new URL(url).pathname;
    assert.ok(ROUTES.includes(path));
    if (fail.includes(path)) return new Response('Unavailable', { status: 503 });
    const body = override[path] ?? (path === '/api/markets' ? JSON.stringify(markets) : html[path]);
    return new Response(body, { status: 200 });
  };
}

describe('read-only marketing readiness evidence', () => {
  it('passes only public market, price, allergy and founder story evidence', async () => {
    const report = await auditMarketingSite(fakeFetcher(), () => new Date('2026-11-15T12:00:00Z'));
    assert.equal(report.result, 'PASS');
    assert.equal(report.certified, false);
    assert.equal(report.failed.length, 0);
    assert.equal(report.origin, ORIGIN);
    assert.equal(report.auditedAt, '2026-11-15T12:00:00.000Z');
  });

  it('fails when a paused market becomes publicly active', async () => {
    const publicMarkets = { ...markets, count: 2, markets: [...markets.markets, { id: 'dunwoody', hours: '09:00-12:00', isActive: true }] };
    const report = await auditMarketingSite(fakeFetcher({ override: { '/api/markets': JSON.stringify(publicMarkets) } }));
    assert.equal(report.result, 'FAIL');
    assert.ok(report.failed.includes('single_active_market'));
  });

  it('fails when approved hours drift', async () => {
    const drift = { ...markets, markets: [{ ...markets.markets[0], hours: '09:00-13:00' }] };
    const report = await auditMarketingSite(fakeFetcher({ override: { '/api/markets': JSON.stringify(drift) } }));
    assert.ok(report.failed.includes('approved_serenbe_window'));
  });

  it('fails when First Sip disappears or allergen caveat is absent', async () => {
    const report = await auditMarketingSite(fakeFetcher({
      override: { '/m/serenbe': 'Kissed by Gods 11.99' },
    }));
    assert.ok(report.failed.includes('first_sip_visible'));
    assert.ok(report.failed.includes('allergy_guard_visible'));
    assert.ok(report.failed.includes('booth_checkout_only'));
  });

  it('records HTTP errors as failures without invoking external actions', async () => {
    const report = await auditMarketingSite(fakeFetcher({ fail: ['/markets'] }));
    assert.equal(report.result, 'FAIL');
    assert.ok(report.failed.includes('http__markets'));
    assert.equal(report.certified, false);
  });
});
