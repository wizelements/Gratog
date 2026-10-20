import { MetadataRoute } from 'next';
import { collectIndexableStorefrontProducts } from '@/lib/seo-product-sitemap.mjs';

const PRODUCTION_ORIGIN = 'https://tasteofgratitude.shop';

export const revalidate = 600;

function normalizeOrigin(origin: string | undefined) {
  return origin?.trim().replace(/\/+$/, '');
}

function isIndexableDeployment() {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === 'production';
  }

  return [process.env.NEXT_PUBLIC_BASE_URL, process.env.NEXT_PUBLIC_SITE_URL]
    .some((origin) => normalizeOrigin(origin) === PRODUCTION_ORIGIN);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexableDeployment()) {
    return [];
  }

  const baseUrl = PRODUCTION_ORIGIN;

  // Static pages
  const staticPages = [
    '',
    '/menu',
    '/catalog',
    '/about',
    '/contact',
    '/faq',
    '/explore',
    '/explore/ingredients',
    '/explore/learn',
    '/markets',
    '/policies',
    '/privacy',
    '/terms',
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: (path === '' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    priority: path === '' ? 1 : path === '/catalog' ? 0.9 : 0.7,
  }));

  // Only publish active entries exposed by the actual customer storefront.
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${baseUrl}/api/products`, {
      next: { revalidate: 600 } // Follow storefront changes without stale Square SEO entries
    });
    if (res.ok) {
      const data = await res.json();
      const products = collectIndexableStorefrontProducts(data);
      productEntries = products.map((product: { reference: string; updatedAt?: string }) => ({
        url: `${baseUrl}/product/${product.reference}`,
        lastModified: product.updatedAt && !Number.isNaN(Date.parse(product.updatedAt))
          ? new Date(product.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch storefront products for sitemap:', error);
  }

  return [...staticEntries, ...productEntries];
}