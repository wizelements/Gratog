/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop',
  generateRobotsTxt: true,
  generateIndexSitemap: true,
  exclude: [
    '/admin/*',
    '/api/*',
    '/test-auth',
    '/diagnostic'
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/test-auth', '/diagnostic'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin', '/api'],
        crawlDelay: 0,
      },
    ],
  },
  transform: async (config, path) => {
    // Custom priority for key pages
    const priorities = {
      '/': 1.0,
      '/catalog': 0.9,
      '/order': 0.8,
      '/about': 0.7,
      '/explore': 0.7,
      '/rewards': 0.6,
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
