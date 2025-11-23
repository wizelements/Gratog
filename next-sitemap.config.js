/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: [
    '/admin/*',
    '/api/*',
    '/login',
    '/register',
    '/profile/*',
    '/checkout/*',
    '/order/*',
    '/test-auth',
    '/diagnostic'
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: '*',
        disallow: ['/admin/', '/api/', '/login', '/register', '/profile/', '/checkout/', '/order/'],
      },
    ],
    additionalSitemaps: [],
  },
  transform: async (config, path) => {
    // Custom priority and changefreq logic
    const priorities = {
      '/': 1.0,
      '/catalog': 0.9,
      '/quiz': 0.8,
      '/markets': 0.8,
      '/about': 0.7,
      '/contact': 0.7,
      '/faq': 0.7,
    };

    const changefreqs = {
      '/': 'daily',
      '/catalog': 'daily',
      '/quiz': 'weekly',
      '/markets': 'weekly',
    };

    // Dynamic logic for product and content pages
    let changefreq = 'monthly';
    let priority = 0.6;

    if (path.includes('/product/')) {
      changefreq = 'weekly';
      priority = 0.8;
    } else if (path.includes('/learn/')) {
      changefreq = 'monthly';
      priority = 0.7;
    } else if (path.includes('/blog/')) {
      changefreq = 'weekly';
      priority = 0.6;
    } else if (priorities[path]) {
      priority = priorities[path];
      changefreq = changefreqs[path] || 'monthly';
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
};
