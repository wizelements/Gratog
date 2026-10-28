import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(path, 'utf8');
const product = () => read('app/product/[slug]/ProductDetailClient.jsx');

describe('retired public reviews cannot return as broken purchase-page controls', () => {
  it('does not expose submission or voting APIs', () => {
    for (const base of ['app/api/reviews/route', 'app/api/reviews/helpful/route']) {
      for (const extension of ['js', 'ts']) expect(existsSync(`${base}.${extension}`)).toBe(false);
    }
  });
  it('does not fetch the removed API on a product page', () => {
    expect(product()).not.toContain('/api/reviews');
  });
  it('does not offer a review tab or submission form', () => {
    expect(product()).not.toContain('value="reviews"');
    expect(product()).not.toContain('ProductReviews');
    expect(existsSync('components/ProductReviews.jsx')).toBe(false);
    expect(read('scripts/send-review-request-campaign.js')).toContain('PUBLIC_REVIEWS_RETIRED');
  });
  it('does not publish unverified aggregate ratings', () => {
    expect(product()).not.toContain('aggregateRating');
    expect(product()).not.toContain('reviewSummary');
  });
  it('retains the established public reviews redirect', () => {
    const page = readdirSync('app/reviews').find(name => /^page\.(js|jsx|ts|tsx)$/.test(name));
    expect(page).toBeTruthy();
    expect(read(join('app/reviews', page!))).toMatch(/permanentRedirect\(['"]\/catalog['"]\)/);
  });
  it('does not accept a query string as evidence of a submitted review', () => {
    expect(read('app/register/page.js')).not.toContain('Your review was submitted successfully');
  });
  it('preserves administrator access to historical records with authentication', () => {
    const route = read('app/api/admin/reviews/route.ts');
    expect(route).toContain('withAdminMiddleware');
    expect(existsSync('archive/reviews')).toBe(true);
  });
});
