import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MARKETS } from '../data/markets';

const canonical = '10640 Serenbe Lane, Chattahoochee Hills, GA 30268';

describe('Serenbe market pickup directions', () => {
  it('uses the official market location and current winter hours', () => {
    const serenbe = MARKETS.find((market) => market.id === 'serenbe');
    expect(serenbe).toBeDefined();
    expect(serenbe?.addressLine).toBe(canonical);
    expect(serenbe?.hours).toBe('09:00-12:00');
    expect(serenbe?.mapsUrl).toContain('10640%20Serenbe%20Lane');
    expect(serenbe?.isActive).toBe(true);
  });

  it('does not direct customers to the Inn through market-facing pages and messages', () => {
    const relevantFiles = [
      'data/markets.ts',
      'lib/delivery-zones.js',
      'lib/seo/local-business.ts',
      'lib/markets/repository.ts',
      'app/api/ics/market-route/route.js',
      'lib/resend-email.js',
      'app/order/success/OrderSuccessPage.client.js',
    ];
    for (const file of relevantFiles) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source, file).not.toContain('10950 Hutcheson Ferry Rd');
      expect(source, file).not.toContain('10950+Hutcheson+Ferry+Rd');
    }
  });

  it('preserves current hours without a stale public market listing', () => {
    const source = readFileSync(resolve(process.cwd(), 'lib/seo/local-business.ts'), 'utf8');
    const start = source.indexOf("name: 'Serenbe Farmers Market'");
    const end = source.indexOf("name: 'DHA Dunwoody Farmers Market'", start);
    const serenbeSection = source.slice(start, end);
    expect(serenbeSection).toContain("hours: '09:00-12:00'");
    expect(serenbeSection).not.toContain('Booth #12');
    expect(serenbeSection).not.toContain("hours: '09:00-13:00'");
    const repository = readFileSync(resolve(process.cwd(), 'lib/markets/repository.ts'), 'utf8');
    const repoStart = repository.indexOf("name: 'Serenbe Farmers Market'");
    const repoEnd = repository.indexOf("name: 'DHA Dunwoody Farmers Market'", repoStart);
    expect(repository.slice(repoStart, repoEnd)).toContain("hours: '09:00-12:00'");
    expect(repository.slice(repoStart, repoEnd)).not.toContain("hours: '09:00-13:00'");
  });
});
