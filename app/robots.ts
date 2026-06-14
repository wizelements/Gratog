import { MetadataRoute } from 'next';

const PRODUCTION_ORIGIN = 'https://tasteofgratitude.shop';
const BLOCKED_PATHS = [
  '/admin',
  '/admin/',
  '/api',
  '/api/',
  '/account',
  '/account/',
  '/cart',
  '/cart/',
  '/checkout',
  '/checkout/',
  '/forgot-password',
  '/login',
  '/order',
  '/order/',
  '/preorder',
  '/preorder/',
  '/profile',
  '/profile/',
  '/register',
  '/reset-password',
  '/unsubscribe',
  '/vendor',
  '/vendor/',
];

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

export default function robots(): MetadataRoute.Robots {
  if (!isIndexableDeployment()) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    };
  }
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: BLOCKED_PATHS,
      },
    ],
    sitemap: `${PRODUCTION_ORIGIN}/sitemap.xml`,
    host: PRODUCTION_ORIGIN,
  };
}
