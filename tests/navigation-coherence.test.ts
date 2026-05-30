import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const workspace = process.cwd();

function read(filePath: string): string {
  // Try tsx/ts first, then jsx/js
  const exts = ['', '.tsx', '.ts', '.jsx', '.js'];
  for (const ext of exts) {
    const full = path.join(workspace, filePath + ext);
    if (fs.existsSync(full)) return fs.readFileSync(full, 'utf8');
  }
  return fs.readFileSync(path.join(workspace, filePath), 'utf8');
}

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
  it('mobile navigation includes all key desktop destinations', () => {
    const header = tryRead('components/Header.jsx');

    expect(header).toContain('href="/markets"');
    expect(header).toContain('href="/explore"');
    expect(header).toContain('href="/community"');
    expect(header).toContain('href="/reviews"');
    expect(header).toContain('href="/rewards"');
  });

  it('product detail reviews tab uses live review component', () => {
    const productClient = tryRead('app/product/[slug]/ProductDetailClient.jsx');

    expect(productClient).toContain('ProductReviews');
    expect(productClient).toContain('<ProductReviews');
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
