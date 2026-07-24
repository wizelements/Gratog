import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { NextRequest } from 'next/server';
import { BUNDLES } from '@/data/bundles';
import { PRODUCTS } from '@/data/products';
import { getWeeklyMenuProducts } from '@/data/weeklyMenu';
import { generateCatalogMeta, generateHomeMeta, generateProductMeta } from '@/lib/seo/metadata';
import { getCategoryMetadata, getProductMetadata } from '@/lib/seo/meta-tags';
import { generateStructuredData, siteConfig } from '@/lib/seo.js';

const leadMocks = vi.hoisted(() => {
  const collection = {
    updateOne: vi.fn().mockResolvedValue({ acknowledged: true, upsertedCount: 1 }),
  };
  const db = { collection: vi.fn().mockReturnValue(collection) };
  return { collection, db };
});

vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({ db: leadMocks.db }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { POST as captureLead } from '@/app/api/lead/route';

const workspace = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(path.join(workspace, filePath), 'utf8');
}

function flatten(value: unknown): string {
  return JSON.stringify(value);
}

function leadRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('customer-facing content quality', () => {
  it('keeps implementation and roadmap language out of rendered conversion surfaces', () => {
    const files = [
      'components/home/HomePageClient.jsx',
      'components/catalog/CatalogPageClient.jsx',
      'components/weekly-menu/WeeklyMenuPage.tsx',
      'components/preorder/BundleSuggestions.tsx',
      'app/markets/page.tsx',
      'app/preorder/PreorderClientPage.tsx',
      'app/product/[slug]/ProductDetailClient.jsx',
      'app/wholesale/page.tsx',
    ];
    const copy = files.map(read).join('\n');

    expect(copy).not.toMatch(/passive (?:menu|preorder) funnel|bundle-ready|bundle SKUs once|future automation|low-friction weekly rhythm|convert walk-up shoppers/i);
  });

  it('derives the homepage badge from weekly-menu products rather than catalog inventory', () => {
    const weeklyCount = getWeeklyMenuProducts('all').length;
    const catalogCount = PRODUCTS.length;
    const homepage = read('components/home/HomePageClient.jsx');
    const homepageServer = read('app/page.js');

    expect(weeklyCount).toBeGreaterThan(0);
    expect(weeklyCount).toBeLessThan(catalogCount);
    expect(homepage).toContain("getWeeklyMenuProducts('all').length");
    expect(homepage).toContain("items on this week's menu");
    expect(`${homepage}\n${homepageServer}`).not.toContain('initialCatalogCount');
  });

  it('does not promise inactive customer SMS on acquisition, checkout, account, or success pages', () => {
    const files = [
      'components/home/HomePageClient.jsx',
      'components/catalog/CatalogPageClient.jsx',
      'components/weekly-menu/WeeklyMenuPage.tsx',
      'components/checkout/ContactForm.tsx',
      'components/checkout/ReviewAndPay.tsx',
      'components/RetentionForm.jsx',
      'app/markets/page.tsx',
      'app/preorder/PreorderClientPage.tsx',
      'app/product/[slug]/ProductDetailClient.jsx',
      'app/quiz/QuizClient.jsx',
      'app/order/success/page-enhanced.js',
      'app/order/success/OrderSuccessPage.client.js',
      'app/privacy/page.js',
      'app/terms/page.js',
    ];
    const copy = files.map(read).join('\n');

    expect(copy).not.toMatch(/text me|weekly texts|text updates|SMS sent|verification code via SMS|intent="weekly_menu_texts"|Twilio/i);
    expect(read('app/account/page.tsx')).not.toMatch(/type="tel"|api\/customer\/profile\?phone/);
  });

  it('renders product quotes only when product data supplies one', () => {
    const productPage = read('app/product/[slug]/ProductDetailClient.jsx');
    const quoteAssignment = productPage.match(/const customerQuote\s*=([^;]+);/)?.[1] || '';

    expect(quoteAssignment).toMatch(/product\.customerQuote/);
    expect(quoteAssignment).toMatch(/product\.testimonial/);
    expect(quoteAssignment).toMatch(/null/);
    expect(productPage).toMatch(/\{customerQuote && \(/);
    expect(productPage).not.toMatch(/You can tell it is made with care|keeps social proof visible/i);
  });

  it('preserves renamed products’ stable IDs, slugs, prices, and Square links', () => {
    const elderberry = PRODUCTS.find((product) => product.id === 'grateful-defense');
    const soursop = PRODUCTS.find((product) => product.id === 'healing-harmony-gel');

    expect(elderberry).toMatchObject({
      id: 'grateful-defense',
      slug: 'grateful-defense',
      name: 'Elderberry Ginger Shot',
      price: 5,
      squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=gratitude-defense',
    });
    expect(soursop).toMatchObject({
      id: 'healing-harmony-gel',
      slug: 'healing-harmony-gel',
      name: 'Soursop Spice Sea Moss Gel',
      price: 35,
      squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=healing-harmony',
    });
    expect(new Set(PRODUCTS.map((product) => product.id)).size).toBe(PRODUCTS.length);
    expect(new Set(PRODUCTS.map((product) => product.slug)).size).toBe(PRODUCTS.length);
  });

  it('keeps every rendered bundle free of unsupported savings and roadmap copy', () => {
    const renderedBundleCopy = BUNDLES.map(({ name, description, savingsText, cta }) => ({ name, description, savingsText, cta }));

    for (const bundle of BUNDLES) {
      expect(bundle.savingsText).toMatch(/individual (?:item )?prices?/i);
      expect(bundle.savingsText).not.toMatch(/\b(?:save|discount|deal|% off)\b/i);
      for (const productId of bundle.productsIncluded) {
        expect(PRODUCTS.some((product) => product.id === productId)).toBe(true);
      }
    }
    expect(flatten(renderedBundleCopy)).not.toMatch(/Square|SKU|placeholder|future automation|subscription/i);
  });

  it('keeps unsupported claims out of product presentation fields', () => {
    const presentation = PRODUCTS.map((product) => ({
      name: product.name,
      shortDescription: product.shortDescription,
      fullDescription: product.fullDescription,
      wellnessSupport: product.wellnessSupport,
      recommendedUse: product.recommendedUse,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      tags: product.tags,
    }));

    expect(flatten(presentation)).not.toMatch(/daily minerals|energy routine|stress routine|weight support|skin\/glow|glow routine|recovery routine|immune support|optimal health/i);
  });

  it('keeps removed claims out of shared metadata, social cards, and keywords', () => {
    const metadata = [
      generateHomeMeta(),
      generateCatalogMeta(),
      generateProductMeta({ name: 'Test Ginger Drink', description: '', price: 9, slug: 'test-ginger-drink' }),
      getCategoryMetadata('elderberry', 'https://tasteofgratitude.shop'),
      getProductMetadata({ name: 'Test Ginger Drink', description: '', price: 9, image: '/test.jpg', slug: 'test-ginger-drink', category: 'shots' }, 'https://tasteofgratitude.shop'),
      siteConfig,
      generateStructuredData(),
    ];

    expect(flatten(metadata)).not.toMatch(/premium sea moss|100% plant-based|natural supplements?|immune support|optimal health|healing soursop|grateful guardian/i);
    expect(read('app/(site)/instagram/[slug]/page.tsx')).not.toMatch(/premium sea moss|immune support/i);
  });

  it('keeps privacy and terms aligned with email-only customer updates', () => {
    const privacy = read('app/privacy/page.js');
    const terms = read('app/terms/page.js');

    expect(privacy).toMatch(/Square for payment processing and Resend for email/);
    expect(privacy).not.toMatch(/Twilio|updates via email, plus optional SMS/i);
    expect(terms).toMatch(/Order confirmations and available order updates will be sent by email/);
    expect(terms).not.toMatch(/SMS updates|text updates/i);
  });
});

describe('weekly-menu email acquisition contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadMocks.collection.updateOne.mockResolvedValue({ acknowledged: true, upsertedCount: 1 });
    leadMocks.db.collection.mockReturnValue(leadMocks.collection);
  });

  it('requires email for email acquisition intents', () => {
    const route = read('app/api/lead/route.ts');
    expect(route).toMatch(/EMAIL_REQUIRED_INTENTS[\s\S]*weekly_menu_email[\s\S]*email_signup/);
    expect(route).toMatch(/intentRequiresEmail\(lead\.intent\) && !lead\.email/);
    expect(route).not.toMatch(/EMAIL_REQUIRED_INTENTS[\s\S]*wholesale_inquiry/);
  });

  it.each([
    [{ intent: 'weekly_menu_email', source: 'test' }, 400],
    [{ intent: 'weekly_menu_email', source: 'test', email: 'not-an-email' }, 400],
    [{ intent: 'weekly_menu_email', source: 'test', phone: '4045550100' }, 400],
  ])('rejects invalid email acquisition payload %#', async (body, status) => {
    const response = await captureLead(leadRequest(body));
    expect(response.status).toBe(status);
    expect(leadMocks.collection.updateOne).not.toHaveBeenCalled();
  });

  it('persists a valid email without inferring SMS consent', async () => {
    const response = await captureLead(leadRequest({
      intent: 'weekly_menu_email',
      source: 'content_quality_test',
      email: 'Customer@Example.com',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, persisted: true });
    expect(leadMocks.db.collection).toHaveBeenCalledWith('newsletter_subscribers');
    expect(leadMocks.collection.updateOne).toHaveBeenLastCalledWith(
      { email: 'customer@example.com' },
      expect.objectContaining({
        $set: expect.objectContaining({ email: 'customer@example.com', phone: null, intent: 'weekly_menu_email' }),
      }),
      { upsert: true }
    );
  });

  it('returns an accurate error instead of a false signup confirmation when persistence fails', async () => {
    leadMocks.collection.updateOne.mockRejectedValueOnce(new Error('database unavailable'));

    const response = await captureLead(leadRequest({
      intent: 'weekly_menu_email',
      source: 'content_quality_test',
      email: 'customer@example.com',
    }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ success: false, persisted: false });
    expect(body.error).toMatch(/could not save/i);
  });

  it('posts the active email form to the lead API and keeps broadcast readers compatible', () => {
    const form = read('components/RetentionForm.jsx');
    const broadcastReaders = `${read('app/api/markets/warm/route.ts')}\n${read('app/api/retention/winback/route.ts')}`;

    expect(form).toContain("fetch('/api/lead'");
    expect(form).toContain('intent,');
    expect(broadcastReaders).toContain("intent: 'weekly_menu_email'");
    expect(broadcastReaders).toContain("intent: 'weekly_menu_texts'");
  });
});
