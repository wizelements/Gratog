import { MetadataRoute } from 'next';

const PRODUCTION_ORIGIN = 'https://tasteofgratitude.shop';

export const revalidate = 3600;

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

function toProductEntries(data: unknown): Array<{ slug?: string; id: string; updatedAt?: string }> {
  if (Array.isArray(data)) return data as Array<{ slug?: string; id: string; updatedAt?: string }>;
  if (!data || typeof data !== 'object') return [];

  const payload = data as {
    products?: Array<{ slug?: string; id: string; updatedAt?: string }>;
    data?: Array<{ slug?: string; id: string; updatedAt?: string }>;
    items?: Array<{ slug?: string; id: string; updatedAt?: string }>;
  };

  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
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

  // Fetch products for dynamic pages
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${baseUrl}/api/catalog`, { 
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    if (res.ok) {
      const data = await res.json();
      const products = toProductEntries(data);
      productEntries = products.filter((product) => product.slug || product.id).map((product) => ({
        url: `${baseUrl}/product/${product.slug || product.id}`,
        lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const satisfies 'weekly',
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch products for sitemap:', error);
  }

  return [...staticEntries, ...productEntries];
}
