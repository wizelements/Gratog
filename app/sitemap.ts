import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop';

  // Static pages
  const staticPages = [
    '',
    '/catalog',
    '/about',
    '/contact',
    '/faq',
    '/explore',
    '/explore/ingredients',
    '/explore/games',
    '/explore/learn',
    '/explore/showcase',
    '/rewards',
    '/markets',
    '/quiz',
    '/policies',
    '/privacy',
    '/terms',
  ];

  const staticEntries = staticPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly' as const,
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
      const products = data.products || [];
      productEntries = products.map((product: { slug?: string; id: string }) => ({
        url: `${baseUrl}/product/${product.slug || product.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch products for sitemap:', error);
  }

  return [...staticEntries, ...productEntries];
}
