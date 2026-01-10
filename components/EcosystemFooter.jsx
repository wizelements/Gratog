'use client';

/**
 * Cod3BlackAgency Ecosystem Footer
 * Shared cross-promotion footer for SEO interlinking between products
 * 
 * Usage: <EcosystemFooter currentProduct="gratog" />
 */

const PRODUCTS = [
  {
    id: 'gratog',
    name: 'Taste of Gratitude',
    tagline: 'Wildcrafted Sea Moss & Wellness',
    url: 'https://tasteofgratitude.shop',
  },
  {
    id: 'sd-studio',
    name: 'SD Studio',
    tagline: 'Stable Diffusion Control Center',
    url: 'https://sd-studio-web.vercel.app',
  },
  {
    id: 'image-to-svg',
    name: 'Image to SVG',
    tagline: 'Convert Images to Vector Graphics',
    url: 'https://image-to-svg.vercel.app',
  },
  {
    id: 'eco-pack',
    name: 'Instant Launch Pages',
    tagline: 'DTC Landing Page Templates',
    url: 'https://eco-pack-template.vercel.app',
  },
  {
    id: 'tradealert',
    name: 'TradeAlert',
    tagline: 'Real-Time Trading Signals',
    url: 'https://tradealert.vercel.app',
  },
];

function buildUtmUrl(targetUrl, source) {
  try {
    const url = new URL(targetUrl);
    url.searchParams.set('utm_source', source || 'cod3blackagency');
    url.searchParams.set('utm_medium', 'ecosystem-footer');
    url.searchParams.set('utm_campaign', 'cross-promo');
    return url.toString();
  } catch {
    return targetUrl;
  }
}

export default function EcosystemFooter({ currentProduct = 'gratog', className = '' }) {
  const year = new Date().getFullYear();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Cod3BlackAgency',
    url: 'https://github.com/wizelements',
    brand: 'Cod3BlackAgency',
    sameAs: ['https://github.com/wizelements'],
    hasPart: PRODUCTS.map((p) => ({
      '@type': 'WebSite',
      name: p.name,
      url: p.url,
    })),
  };

  return (
    <footer className={`border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand Block */}
          <div className="sm:w-1/3">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              By Cod3BlackAgency
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Tools, templates, and apps for builders and creators.
            </p>
          </div>

          {/* Product Links */}
          <nav aria-label="Cod3BlackAgency product ecosystem" className="flex-1">
            <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {PRODUCTS.map((product) => {
                const isCurrent = product.id === currentProduct;

                if (isCurrent) {
                  return (
                    <li key={product.id}>
                      <span
                        aria-current="page"
                        className="block rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-900/20"
                      >
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                          {product.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-emerald-600/70 dark:text-emerald-500/70">
                          You&apos;re here
                        </span>
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={product.id}>
                    <a
                      href={buildUtmUrl(product.url, currentProduct)}
                      className="block rounded-lg bg-gray-50 px-3 py-2 transition-colors hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800"
                    >
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {product.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                        {product.tagline}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-100 px-4 py-4 text-center text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">
        © {year} Cod3BlackAgency. All rights reserved.
      </div>

      {/* SEO Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </footer>
  );
}
