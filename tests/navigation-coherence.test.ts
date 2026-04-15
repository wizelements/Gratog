import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const workspace = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(path.join(workspace, filePath), 'utf8');
}

describe('Navigation Coherence', () => {
  it('mobile navigation includes all key desktop destinations', () => {
    const header = read('components/Header.jsx');

    expect(header).toContain('href="/markets"');
    expect(header).toContain('href="/explore"');
    expect(header).toContain('href="/community"');
    expect(header).toContain('href="/reviews"');
    expect(header).toContain('href="/rewards"');
  });

  it('product detail reviews tab uses live review component', () => {
    const productPage = read('app/product/[slug]/page.js');

    expect(productPage).toContain("import ProductReviews from '@/components/ProductReviews'");
    expect(productPage).toContain('<ProductReviews');
    expect(productPage).not.toContain('No reviews yet. Be the first to review this product!');
  });

  it('FAQ destinations are consistent with dedicated FAQ route', () => {
    const header = read('components/Header.jsx');
    const footer = read('components/Footer.jsx');

    expect(header).toContain('href="/faq"');
    expect(header).not.toContain('href="/#faq"');
    expect(footer).toContain('href="/faq"');
  });

  it('checkout success redirect points to the implemented success page', () => {
    const reviewAndPay = read('components/checkout/ReviewAndPay.tsx');

    expect(reviewAndPay).toContain("const params = new URLSearchParams({");
    expect(reviewAndPay).toContain("orderRef: orderId,");
    expect(reviewAndPay).toContain("paid: 'true',");
    expect(reviewAndPay).toContain("router.push(`/order/success?${params.toString()}`);");
    expect(reviewAndPay).not.toContain('router.push(`/order/${orderId}?success=true`)');
  });

  it('legacy order detail links resolve to canonical order success route', () => {
    const middleware = read('middleware.ts');
    const emailTemplates = read('lib/email-templates.js');

    expect(middleware).toContain("pathname.startsWith('/order/') && pathname !== '/order/success'");
    expect(middleware).toContain("url.pathname = '/order/success'");
    expect(middleware).toContain("url.searchParams.set('orderRef', orderRef)");
    expect(emailTemplates).toContain('/order/success?orderRef=');
    expect(emailTemplates).not.toContain('/order/${order.orderNumber}');
  });

  it('homepage featured CTA keeps a concrete hash destination', () => {
    const homeClient = read('components/home/HomePageClient.jsx');

    expect(homeClient).toContain('href="/#featured"');
    expect(homeClient).toContain('id="featured"');
  });

  it('menu hash links map to existing homepage anchor sections', () => {
    const header = read('components/Header.jsx');
    const megaMenu = read('components/MegaMenu.jsx');
    const homeClient = read('components/home/HomePageClient.jsx');

    expect(header).toContain('href="/#what-is-sea-moss"');
    expect(megaMenu).toContain("href: '/#what-is-sea-moss'");
    expect(megaMenu).toContain("href: '/#benefits'");
    expect(homeClient).toContain('id="what-is-sea-moss"');
    expect(homeClient).toContain('id="benefits"');
  });

  it('review submission UX includes a non-blocking signup prompt for guest reviewers', () => {
    const productReviews = read('components/ProductReviews.jsx');

    expect(productReviews).toContain('Create Free Account');
    expect(productReviews).toContain('setSignupPrompt');
    expect(productReviews).toContain('data.signupPrompt?.recommended');
  });
});
