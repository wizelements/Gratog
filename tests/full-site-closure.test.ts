import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { safeAccountRedirect } from '@/lib/auth/safe-redirect';

const read = (name: string) => readFileSync(resolve(process.cwd(), name), 'utf8');

describe('real customer safety and non-market ordering', () => {
  it.each([
    [null, '/profile'], ['', '/profile'], ['/profile/orders', '/profile/orders'],
    ['/checkout', '/checkout'], ['https://evil.example', '/profile'],
    ['//evil.example', '/profile'], ['/\\evil.example', '/profile'],
    ['javascript:alert(1)', '/profile'], ['/profile\nX-Test:1', '/profile'],
  ])('never redirects a customer out of the site', (input, expected) => {
    expect(safeAccountRedirect(input)).toBe(expected);
  });

  it('uses the same redirect validation on signup and login', () => {
    for (const page of ['app/login/page.js', 'app/register/page.js']) {
      expect(read(page)).toContain('safeAccountRedirect(searchParams.get(\'redirect\'))');
    }
    expect(read('app/login/page.js')).not.toContain('router.push(redirectTo);\n    return null;');
  });

  it('lets customers inquire about ordinary Georgia orders without selecting a farmers market', () => {
    const form = read('app/request-a-flavor/RequestFlavorClient.tsx');
    const api = read('app/api/fresh-batch/requests/route.ts');
    expect(form).toContain("value: 'georgia_online_inquiry'");
    expect(form).toContain("preferredMarketId: 'georgia_online_inquiry'");
    expect(api).toContain("georgia_online_inquiry: 'Georgia online order");
    expect(form).not.toContain('<SelectItem value="">');
    expect(form).toContain('grid-cols-[minmax(0,1fr)]');
  });

  it('never mislabels a shipping charge as a local delivery fee', () => {
    expect(read('components/checkout/CartSummary.tsx')).toContain("fulfillmentType === 'shipping' ? 'Shipping' : 'Delivery Fee'");
    expect(read('components/checkout/CheckoutRoot.tsx')).toContain('fulfillmentType={fulfillment.type}');
  });

  it('does not greet non-market shoppers with a false no-market problem', () => {
    const banner = read('components/market/LiveLocationBanner.tsx');
    expect(banner).toContain("if (!data?.hasMarketsToday) return null;");
    expect(banner).not.toContain('No markets today. Check back Saturday or Sunday!');
  });

  it('does not request notifications and persistent device storage on page load', () => {
    const pwa = read('components/PWAInitializer.tsx');
    expect(pwa).toContain('enableNotifications: false');
    expect(pwa).not.toContain('requestPersistentStorage()');
    const lib = read('lib/pwa.ts');
    expect(lib).toContain('if (!registration) return null');
    expect(lib).not.toContain("requestNotificationPermission();\n    }");
  });

  it('provides actual headings in expired checkout and password recovery flows', () => {
    expect(read('app/checkout/square/page.js')).toContain("redirect('/checkout')");
    expect(read('app/forgot-password/page.js')).toContain('<h1 className="text-2xl font-bold');
    expect(read('app/reset-password/page.js')).toContain('<h1 className="text-2xl font-bold');
  });
});
