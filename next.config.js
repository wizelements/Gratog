const nextConfig = {
  // Removed 'standalone' output for Vercel compatibility
  // Vercel uses its own build output optimization
  
  // ESLint - Don't fail build on warnings
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScript - Don't fail build on errors during production build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Production performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
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
  
  // Next.js 15.5.4 compatible configuration
  serverExternalPackages: ['mongodb'], // Moved from experimental
  experimental: {
    // Production optimizations
    optimizeCss: true,
    gzipSize: true,
    // Memory optimizations
    esmExternals: true,
  },
  
  webpack(config, { dev, isServer }) {
    // Exclude service worker from bundle
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /sw\.js$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/[name][ext]',
      },
    });
    
    // Development optimizations
    if (dev) {
      config.watchOptions = {
        poll: 3000, // Increased interval to reduce CPU
        aggregateTimeout: 500,
        ignored: ['**/node_modules', '**/.git', '**/logs'],
      };
    } else {
      // Production optimizations
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 200000,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
            },
          },
        },
        concatenateModules: true,
        usedExports: true,
        sideEffects: false,
      };
    }
    
    // Memory optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './'),
    };
    
    // Fix MongoDB client-side issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        child_process: false,
        'mongodb-client-encryption': false,
        'gssapi': false,
        '@mongodb-js/zstd': false,
        'kerberos': false,
        'snappy': false,
        'timers/promises': false,
        'timers': false,
        'util/types': false,
        'async_hooks': false
      };
    }
    
    return config;
  },
  
  // Reduce memory usage
  onDemandEntries: {
    maxInactiveAge: 5000, // Reduced from 10000
    pagesBufferLength: 1, // Reduced from 2
  },
  
  // Performance optimizations - SWC minification is default in Next.js 13+
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  async headers() {
    return [
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
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
