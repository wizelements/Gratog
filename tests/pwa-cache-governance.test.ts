import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import routeSurface from '../config/route-surface.json';

const workspace = process.cwd();
const sw = fs.readFileSync(path.join(workspace, 'public/sw.js'), 'utf8');
const pwa = fs.readFileSync(path.join(workspace, 'lib/pwa.ts'), 'utf8');
const nextConfig = fs.readFileSync(path.join(workspace, 'next.config.js'), 'utf8');

function isCoveredByNetworkOnlyPrefix(apiPrefix: string): boolean {
  const segments = apiPrefix.split('/').filter(Boolean);
  for (let i = segments.length; i >= 2; i--) {
    const candidate = `/${segments.slice(0, i).join('/')}`;
    if (sw.includes(`pathname.startsWith('${candidate}')`)) return true;
  }
  return false;
}

describe('PWA Cache Governance', () => {
  it('uses a bumped closure service worker version in both registration and cache names', () => {
    expect(sw).toContain("const CACHE_VERSION = 'v13-20260606-closure'");
    expect(pwa).toContain("const SERVICE_WORKER_VERSION = '20260606-closure'");
  });

  it('does not queue or replay offline orders', () => {
    expect(sw).not.toContain('sync-orders');
    expect(sw).not.toContain('syncOrders');
    expect(sw).not.toContain('pendingOrders');
    expect(sw).not.toContain("fetch('/api/orders'");
    expect(sw).not.toContain('indexedDB.open');
  });

  it('does not precache live HTML, manifest, or service worker update infrastructure', () => {
    const precacheBlock = sw.slice(sw.indexOf('const PRECACHE_URLS'), sw.indexOf('// Install event'));
    expect(precacheBlock).not.toContain("'/'");
    expect(precacheBlock).not.toContain('/manifest.json');
    expect(precacheBlock).not.toContain('/sw.js');
    expect(sw).toContain('isServiceWorkerInfrastructure');
  });

  it('forces network truth for critical commerce/admin APIs', () => {
    for (const apiPrefix of routeSurface.criticalApis.networkOnly) {
      expect(isCoveredByNetworkOnlyPrefix(apiPrefix), apiPrefix).toBe(true);
    }
  });

  it('prevents runtime caching for checkout, admin, order, and account navigations', () => {
    for (const pagePrefix of routeSurface.pwaNetworkOnlyPages) {
      expect(sw, pagePrefix).toContain(`url.pathname.startsWith('${pagePrefix}')`);
    }
  });

  it('serves manifest and service worker with no-store cache headers', () => {
    expect(nextConfig).toContain('source: "/manifest.json"');
    expect(nextConfig).toContain('source: "/sw.js"');
    expect(nextConfig).toContain('Cache-Control", value: "no-cache, no-store, must-revalidate"');
  });
});
