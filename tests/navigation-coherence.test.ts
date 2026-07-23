import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const workspace = process.cwd();

function tryRead(filePath: string): string {
  const full = path.join(workspace, filePath);
  if (fs.existsSync(full)) return fs.readFileSync(full, 'utf8');
  // Try alternate extensions
  const base = filePath.replace(/\.(jsx?|tsx?)$/, '');
  for (const ext of ['.tsx', '.ts', '.jsx', '.js']) {
    const alt = path.join(workspace, base + ext);
    if (fs.existsSync(alt)) return fs.readFileSync(alt, 'utf8');
  }
  throw new Error(`File not found: ${filePath}`);
}

describe('Navigation Coherence', () => {
  it('mobile navigation is simplified to primary thumb-friendly destinations', () => {
    const header = tryRead('components/Header.jsx');

    expect(header).toContain('const mobileNavItems');
    expect(header).toContain("href: '/catalog'");
    expect(header).toContain("href: '/weekly-menu'");
    expect(header).toContain("href: '/markets'");
    expect(header).toContain("href: '/about'");
    expect(header).toContain("href: isAuthenticated ? '/profile' : '/login'");
    expect(header).toContain('min-h-12');
  });

  it('desktop navigation stays intentional and avoids mega-menu sprawl', () => {
    const header = tryRead('components/Header.jsx');

    expect(header).toContain('const desktopNavItems');
    expect(header).toContain("href: '/weekly-menu'");
    expect(header).toContain("href: '/markets'");
    expect(header).toContain("href: '/catalog'");
    expect(header).toContain("href: '/about'");
    expect(header).not.toContain('MegaMenu');
    expect(header).not.toContain("href=\"/community\"");
    expect(header).not.toContain("href=\"/rewards\"");
  });

  it('admin sidebar exposes core operational routes only', () => {
    const adminLayout = tryRead('app/admin/layout.js');

    expect(adminLayout).toContain("href: '/admin/menus'");
    expect(adminLayout).toContain("href: '/admin/orders'");
    expect(adminLayout).toContain("href: '/admin/products'");
    expect(adminLayout).toContain("href: '/admin/markets'");
    expect(adminLayout).toContain("href: '/admin/inventory'");
    expect(adminLayout).not.toContain("href: '/admin/interactions'");
    expect(adminLayout).not.toContain("href: '/admin/waitlist'");
    expect(adminLayout).not.toContain("href: '/admin/queue'");
  });

  it('product detail reviews tab uses live review component', () => {
    const productClient = tryRead('app/product/[slug]/ProductDetailClient.jsx');

    expect(productClient).toContain('ProductReviews');
    expect(productClient).toContain('<ProductReviews');
  });

  it('product detail pages serialize a claim-safe storefront product projection', () => {
    const productPage = tryRead('app/product/[slug]/page.jsx');
    const productClient = tryRead('app/product/[slug]/ProductDetailClient.jsx');

    expect(productPage).toContain('safeProductCopy');
    expect(productPage).toContain('serializeProductForClient');
    expect(productPage).not.toContain('...product');
    expect(productPage).not.toContain('healthBenefits');
    expect(productPage).not.toContain('benefitStory');
    expect(productClient).not.toContain('healthBenefits');
    expect(productClient).not.toContain('benefitStory');
  });

  it('cart chrome stays hidden throughout checkout subroutes', () => {
    const bottomNav = tryRead('components/BottomNav.jsx');
    const floatingCart = tryRead('components/FloatingCart.jsx');
    const enhancedFloatingCart = tryRead('components/cart/EnhancedFloatingCart.jsx');

    expect(bottomNav).toContain("pathname?.startsWith('/checkout')");
    expect(floatingCart).toContain("pathname?.startsWith('/checkout')");
    expect(enhancedFloatingCart).toContain("pathname?.startsWith('/checkout')");
  });

  it('FAQ destinations are consistent with dedicated FAQ route', () => {
    const footer = tryRead('components/Footer.tsx');

    expect(footer).toContain('href="/faq"');
  });

  it('checkout success redirect points to the implemented success page', () => {
    const reviewAndPay = tryRead('components/checkout/ReviewAndPay.tsx');

    expect(reviewAndPay).toContain('order');
    expect(reviewAndPay).toContain('success');
  });

  it('homepage featured section has anchor id', () => {
    const homeClient = tryRead('components/home/HomePageClient.jsx');

    expect(homeClient).toContain('id="featured"');
  });

  it('menu hash links map to existing homepage anchor sections', () => {
    const homeClient = tryRead('components/home/HomePageClient.jsx');

    expect(homeClient).toContain('id="what-is-sea-moss"');
    expect(homeClient).toContain('id="benefits"');
  });

  it('review submission UX includes a non-blocking signup prompt for guest reviewers', () => {
    const productReviews = tryRead('components/ProductReviews.jsx');

    expect(productReviews).toContain('Create Free Account');
    expect(productReviews).toContain('setSignupPrompt');
  });
});
