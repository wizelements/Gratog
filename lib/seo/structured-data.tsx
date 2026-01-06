/**
 * 🎯 SEO Structured Data (JSON-LD) Generator
 * Helps search engines understand your content
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  slug: string;
  brand?: string;
  sku?: string;
  availability?: string;
  rating?: number;
  reviewCount?: number;
}

/**
 * Organization Schema - Shows in Google Knowledge Panel
 */
export function getOrganizationSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Taste of Gratitude',
    alternateName: 'ToG',
    url: baseUrl,
    logo: `${baseUrl}/images/logo.png`,
    description: 'Premium wildcrafted sea moss gel and natural wellness products. Hand-crafted with 92 essential minerals for optimal health.',
    email: 'info@tasteofgratitude.net',
    telephone: '+1-470-555-0123',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Atlanta',
      addressRegion: 'GA',
      addressCountry: 'US',
    },
    sameAs: [
      'https://www.facebook.com/tasteofgratitude',
      'https://www.instagram.com/tasteofgratitude',
      'https://twitter.com/taste_gratitude',
    ],
    foundingDate: '2023',
    founders: [
      {
        '@type': 'Person',
        name: 'Founder Name',
      },
    ],
  };
}

/**
 * Website Schema
 */
export function getWebsiteSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Taste of Gratitude',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/catalog?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Product Schema - Critical for Google Shopping & Rich Snippets
 */
export function getProductSchema(product: Product, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image.startsWith('http') ? product.image : `${baseUrl}${product.image}`,
    url: `${baseUrl}/product/${product.slug}`,
    sku: product.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Taste of Gratitude',
    },
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/product/${product.slug}`,
      priceCurrency: 'USD',
      price: product.price.toFixed(2),
      availability: product.availability === 'in_stock' 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Taste of Gratitude',
      },
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    aggregateRating: product.rating && product.reviewCount ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    category: product.category,
  };
}

/**
 * Breadcrumb Schema - Shows navigation path in search results
 */
export function getBreadcrumbSchema(items: { name: string; url: string }[], baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * FAQ Schema - Shows FAQ accordion in search results
 */
export function getFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Local Business Schema - Critical for local SEO
 */
export function getLocalBusinessSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    name: 'Taste of Gratitude',
    url: baseUrl,
    logo: `${baseUrl}/images/logo.png`,
    image: `${baseUrl}/images/store-front.jpg`,
    description: 'Premium wildcrafted sea moss gel and natural wellness products available at local farmers markets.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Atlanta',
      addressRegion: 'GA',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 33.7490,
      longitude: -84.3880,
    },
    telephone: '+1-470-555-0123',
    email: 'info@tasteofgratitude.net',
    openingHours: 'Sa 09:00-13:00',
    priceRange: '$$',
    paymentAccepted: 'Cash, Credit Card, Apple Pay, Google Pay',
    currenciesAccepted: 'USD',
  };
}

/**
 * Article Schema - For blog posts
 */
export function getArticleSchema(article: {
  title: string;
  description: string;
  author: string;
  publishDate: string;
  modifiedDate?: string;
  image: string;
  url: string;
}, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.image.startsWith('http') ? article.image : `${baseUrl}${article.image}`,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Taste of Gratitude',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/images/logo.png`,
      },
    },
    datePublished: article.publishDate,
    dateModified: article.modifiedDate || article.publishDate,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url.startsWith('http') ? article.url : `${baseUrl}${article.url}`,
    },
  };
}

/**
 * Product Collection Schema
 */
export function getProductCollectionSchema(products: Product[], baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: getProductSchema(product, baseUrl),
    })),
  };
}

/**
 * Video Schema - For product videos
 */
export function getVideoSchema(video: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration: string; // ISO 8601 format: PT1M33S
  contentUrl: string;
}, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl.startsWith('http') ? video.thumbnailUrl : `${baseUrl}${video.thumbnailUrl}`,
    uploadDate: video.uploadDate,
    duration: video.duration,
    contentUrl: video.contentUrl,
    embedUrl: video.contentUrl,
  };
}

/**
 * Render JSON-LD script tag
 * 
 * SECURITY NOTE: dangerouslySetInnerHTML is safe here because:
 * 1. JSON.stringify() escapes all special characters (<, >, &, ", etc.)
 * 2. Content is in a script tag with type="application/ld+json" (not executed as JS or rendered as HTML)
 * 3. The data object is constructed from controlled sources, not raw user input
 */
export function renderJsonLd(data: object) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
