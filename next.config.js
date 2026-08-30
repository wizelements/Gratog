
const isNonProductionDeployment = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV !== 'production'
  : process.env.NODE_ENV !== 'production';

const nextConfig = {
  // Production performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  serverExternalPackages: ['mongodb', 'mongoose', 'bcryptjs'],
  outputFileTracingRoot: __dirname,

  // Keep the deployable application as the build's strict TypeScript boundary.
  // Tests are compiled and executed independently by Vitest; archive/ is not runtime code.
  typescript: {
    tsconfigPath: 'tsconfig.production.json',
  },

  // Allow development origins for hot reload
  allowedDevOrigins: ['gratitude-square.preview.emergentagent.com'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'tasteofgratitude.shop' },
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: '127690646.cdn6.editmysite.com' },
      // Square image hosting
      { protocol: 'https', hostname: 'items-images-production.s3.us-west-2.amazonaws.com' },
      { protocol: 'https', hostname: 'items-images-sandbox.s3.us-west-2.amazonaws.com' },
      { protocol: 'https', hostname: 'square-catalog-images.s3.amazonaws.com' },
      { protocol: 'https', hostname: 'squareup.com' },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Keep React Compiler disabled until its diagnostics are resolved deliberately.
  reactCompiler: false,

  // Reduce memory usage
  onDemandEntries: {
    maxInactiveAge: 5000, // Reduced from 10000
    pagesBufferLength: 1, // Reduced from 2
  },

  async redirects() {
    return [
      {
        source: '/shop',
        destination: '/catalog',
        permanent: true,
      },
      {
        source: '/terms-of-service',
        destination: '/terms',
        permanent: true,
      },
      {
        source: '/privacy-policy',
        destination: '/privacy',
        permanent: true,
      },
      {
        source: '/cookie-policy',
        destination: '/privacy#cookies',
        permanent: true,
      },
      {
        source: '/cookies',
        destination: '/privacy#cookies',
        permanent: true,
      },
      {
        source: '/refund-policy',
        destination: '/policies#refunds',
        permanent: true,
      },
      {
        source: '/return-policy',
        destination: '/policies#refunds',
        permanent: true,
      },
      {
        source: '/returns',
        destination: '/policies#refunds',
        permanent: true,
      },
      {
        source: '/shipping-policy',
        destination: '/policies#shipping',
        permanent: true,
      },
      {
        source: '/shipping',
        destination: '/policies#shipping',
        permanent: true,
      },
      {
        source: '/rewards',
        destination: '/catalog',
        permanent: true,
      },
      {
        source: '/gratitude/rewards',
        destination: '/catalog',
        permanent: true,
      },
      {
        source: '/reviews',
        destination: '/catalog',
        permanent: true,
      },
      {
        source: '/community',
        destination: '/about',
        permanent: true,
      },
      {
        source: '/subscriptions',
        destination: '/catalog',
        permanent: true,
      },
      {
        source: '/order',
        destination: '/checkout',
        permanent: false,
      },
    ];
  },

  // Performance optimizations - SWC minification is default in Next.js 13+
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  async headers() {
    const nonProductionNoindexHeaders = isNonProductionDeployment
      ? [
          {
            source: "/:path*",
            headers: [
              { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
            ],
          },
        ]
      : [];

    return [
      ...nonProductionNoindexHeaders,
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "https://tasteofgratitude.shop" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Allow-Credentials", value: "false" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-cache, no-store, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/cart/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-cache, no-store, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/checkout/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-cache, no-store, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/order/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-cache, no-store, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/apple-touch-icon.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/favicon.svg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Content-Type", value: "image/svg+xml" },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
        ],
      },
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
