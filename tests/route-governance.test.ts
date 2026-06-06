import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import routeSurface from '../config/route-surface.json';

const workspace = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(path.join(workspace, filePath), 'utf8');
}

const retiredPages = Object.entries(routeSurface.retiredPages);
const storefrontNavigationFiles = [
  'components/Header.jsx',
  'components/Footer.tsx',
  'components/BottomNav.jsx',
];
const sitemapSources = [
  'app/sitemap.ts',
  'public/sitemap-0.xml',
];
const conversionRedirects = {
  '/shop': '/catalog',
  '/terms-of-service': '/terms',
  '/privacy-policy': '/privacy',
  '/cookie-policy': '/privacy#cookies',
  '/cookies': '/privacy#cookies',
  '/refund-policy': '/policies#refunds',
  '/return-policy': '/policies#refunds',
  '/returns': '/policies#refunds',
  '/shipping-policy': '/policies#shipping',
  '/shipping': '/policies#shipping',
};

describe('Route Surface Governance', () => {
  it('has an explicit source and redirect destination for every retired route', () => {
    for (const [route, metadata] of retiredPages) {
      expect(route).toMatch(/^\//);
      expect(metadata.destination).toMatch(/^\//);
      expect(fs.existsSync(path.join(workspace, metadata.source))).toBe(true);
    }
  });

  it('retired customer pages are redirect-only server pages', () => {
    for (const [route, metadata] of retiredPages) {
      const source = read(metadata.source);
      expect(source, route).toContain('permanentRedirect');
      expect(source, route).toContain(`'${metadata.destination}'`);
      expect(source, route).not.toContain("'use client'");
      expect(source, route).not.toContain('useEffect');
      expect(source, route).not.toContain('fetch(');
    }
  });

  it('retired routes are absent from customer navigation', () => {
    for (const file of storefrontNavigationFiles) {
      const source = read(file);
      for (const [route] of retiredPages) {
        expect(source, `${file} must not link ${route}`).not.toContain(`href="${route}"`);
        expect(source, `${file} must not link ${route}`).not.toContain(`href: '${route}'`);
      }
    }
  });

  it('retired routes are excluded from active sitemap output sources', () => {
    for (const file of sitemapSources) {
      const source = read(file);
      for (const [route] of retiredPages) {
        expect(source, `${file} must not advertise ${route}`).not.toContain(`tasteofgratitude.shop${route}`);
        expect(source, `${file} must not advertise ${route}`).not.toContain(`'${route}'`);
      }
    }
  });

  it('next-sitemap explicitly excludes retired routes and account-sprawl variants', () => {
    const source = read('next-sitemap.config.js');
    for (const [route] of retiredPages) {
      expect(source).toContain(`'${route}'`);
    }
    expect(source).toContain("'/profile/rewards'");
    expect(source).toContain("'/account/subscriptions'");
  });

  it('Next and Vercel configs provide real HTTP redirects for retired routes', () => {
    const nextConfig = read('next.config.js');
    const vercelConfig = JSON.parse(read('vercel.json'));
    const redirects = vercelConfig.redirects || [];

    for (const [route, metadata] of retiredPages) {
      expect(nextConfig, route).toContain(`source: '${route}'`);
      expect(nextConfig, route).toContain(`destination: '${metadata.destination}'`);
      expect(redirects).toContainEqual(expect.objectContaining({
        source: route,
        destination: metadata.destination,
        permanent: true,
      }));
    }
  });

  it('conversion-critical aliases redirect instead of 404ing', () => {
    const nextConfig = read('next.config.js');
    const vercelConfig = JSON.parse(read('vercel.json'));
    const redirects = vercelConfig.redirects || [];

    for (const [source, destination] of Object.entries(conversionRedirects)) {
      expect(nextConfig, source).toContain(`source: '${source}'`);
      expect(nextConfig, source).toContain(`destination: '${destination}'`);
      expect(redirects).toContainEqual(expect.objectContaining({
        source,
        destination,
        permanent: true,
      }));
    }
  });
});
