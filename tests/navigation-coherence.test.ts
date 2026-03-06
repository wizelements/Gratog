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
    expect(header).toContain('href="/rewards"');
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

    expect(reviewAndPay).toContain('router.push(`/order/success?orderRef=${orderId}&paid=true&amount=${amountCents}`)');
    expect(reviewAndPay).not.toContain('router.push(`/order/${orderId}?success=true`)');
  });
});
