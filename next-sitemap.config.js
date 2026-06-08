const { MongoClient } = require('mongodb');

const CRITICAL_DYNAMIC_PATHS = [
  '/catalog',
  '/checkout',
  '/menu',
  '/markets',
  '/about',
  '/faq',
  '/contact',
  '/policies',
  '/privacy',
  '/terms',
];

async function loadProductPaths() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!uri) return [];

  const client = new MongoClient(uri, { maxPoolSize: 1 });

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || process.env.MONGODB_DATABASE);
    const products = await db.collection('products')
      .find(
        {
          $and: [
            { slug: { $type: 'string', $ne: '' } },
            { active: { $ne: false } },
            { isActive: { $ne: false } },
            { status: { $nin: ['draft', 'archived', 'deleted'] } },
          ],
        },
        { projection: { slug: 1 } }
      )
      .limit(500)
      .toArray();

    return products
      .map((product) => `/product/${encodeURIComponent(product.slug)}`)
      .filter(Boolean);
  } catch (error) {
    console.warn('[next-sitemap] Product sitemap fallback:', error.message);
    return [];
  } finally {
    await client.close().catch(() => {});
  }
}

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://tasteofgratitude.shop',
  generateRobotsTxt: true,
  generateIndexSitemap: true,
  exclude: [
    '/admin',
    '/admin/*',
    '/api',
    '/api/*',
    '/robots.txt',
    '/sitemap.xml',
    '/server-sitemap.xml',
    '/shop',
    '/terms-of-service',
    '/privacy-policy',
    '/cookie-policy',
    '/cookies',
    '/refund-policy',
    '/return-policy',
    '/returns',
    '/shipping-policy',
    '/shipping',
    '/rewards',
    '/gratitude/rewards',
    '/reviews',
    '/community',
    '/subscriptions',
    '/profile/rewards',
    '/account/subscriptions',
    '/account/subscriptions/*',
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/*', '/api', '/api/*'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin', '/admin/*', '/api', '/api/*'],
        crawlDelay: 0,
      },
    ],
  },
  additionalPaths: async (config) => {
    const productPaths = await loadProductPaths();
    const paths = [...new Set([...CRITICAL_DYNAMIC_PATHS, ...productPaths])];
    return Promise.all(paths.map((path) => config.transform(config, path)));
  },
  transform: async (config, path) => {
    // Custom priority for key pages
    const priorities = {
      '/': 1.0,
      '/menu': 0.9,
      '/catalog': 0.9,
      '/order': 0.8,
      '/about': 0.7,
      '/explore': 0.7,
      '/markets': 0.6,
    };

    return {
      loc: path,
      changefreq: path === '/' ? 'daily' : path.includes('/product/') ? 'weekly' : 'monthly',
      priority: priorities[path] || 0.5,
      lastmod: new Date().toISOString(),
    };
  },
};
