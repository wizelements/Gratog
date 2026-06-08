import { MetadataRoute } from 'next';

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://tasteofgratitude.shop')
    .trim()
    .replace(/\/+$/, '');
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
