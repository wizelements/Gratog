/**
 * 🎯 Next.js 15 Metadata Helper Functions
 * Generates optimized metadata with Open Graph and Twitter cards
 */

import { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tasteofgratitude.shop';
const SITE_NAME = 'Taste of Gratitude';
const DEFAULT_OG_IMAGE = '/og-image.jpg';

export interface ProductMeta {
  name: string;
  description: string;
  price: number;
  image?: string;
  images?: string[];
  slug: string;
  category?: string;
  availability?: 'in_stock' | 'out_of_stock' | 'preorder';
  rating?: number;
  reviewCount?: number;
  brand?: string;
  sku?: string;
}

/**
 * Generate metadata for product pages
 * Includes rich Open Graph and Twitter card data for product rich snippets
 */
export function generateProductMeta(product: ProductMeta): Metadata {
  const productUrl = `${BASE_URL}/product/${product.slug}`;
  const productImage = product.image?.startsWith('http') 
    ? product.image 
    : `${BASE_URL}${product.image || DEFAULT_OG_IMAGE}`;
  
  const productImages = product.images?.length 
    ? product.images.map(img => img.startsWith('http') ? img : `${BASE_URL}${img}`)
    : [productImage];

  const title = `${product.name} | ${SITE_NAME}`;
  const description = product.description || 
    `Premium ${product.name} - Wildcrafted sea moss with 92 essential minerals. $${product.price.toFixed(2)}. Order online for fast delivery.`;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    keywords: [
      product.name.toLowerCase(),
      'sea moss gel',
      'wildcrafted sea moss',
      product.category || 'wellness',
      'immune support',
      'natural supplement',
      '92 minerals',
      'buy online',
    ].join(', '),
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,

    openGraph: {
      title,
      description,
      url: productUrl,
      siteName: SITE_NAME,
      locale: 'en_US',
      type: 'website',
      images: productImages.map((img, index) => ({
        url: img,
        width: 1200,
        height: 630,
        alt: index === 0 ? product.name : `${product.name} - Image ${index + 1}`,
      })),
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: productImages.slice(0, 1),
      creator: '@taste_gratitude',
      site: '@taste_gratitude',
    },

    alternates: {
      canonical: productUrl,
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    other: {
      'product:price:amount': product.price.toString(),
      'product:price:currency': 'USD',
      'product:availability': product.availability === 'out_of_stock' ? 'preorder' : 'instock',
      'product:brand': product.brand || SITE_NAME,
      ...(product.sku && { 'product:retailer_item_id': product.sku }),
    },
  };
}

/**
 * Generate generic page metadata
 * Use for static pages like About, Contact, FAQ, etc.
 */
export function generatePageMeta(
  title: string,
  description: string,
  path: string,
  options?: {
    image?: string;
    keywords?: string[];
    noIndex?: boolean;
    type?: 'website' | 'article';
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
  }
): Metadata {
  const fullUrl = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const image = options?.image?.startsWith('http') 
    ? options.image 
    : `${BASE_URL}${options?.image || DEFAULT_OG_IMAGE}`;

  const fullTitle = `${title} | ${SITE_NAME}`;

  const metadata: Metadata = {
    metadataBase: new URL(BASE_URL),
    title: fullTitle,
    description,
    keywords: options?.keywords?.join(', ') || [
      'sea moss gel',
      'wildcrafted sea moss',
      'natural wellness',
      'superfood',
      SITE_NAME.toLowerCase(),
    ].join(', '),
    authors: options?.author ? [{ name: options.author }] : [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,

    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: SITE_NAME,
      locale: 'en_US',
      type: options?.type || 'website',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(options?.publishedTime && { publishedTime: options.publishedTime }),
      ...(options?.modifiedTime && { modifiedTime: options.modifiedTime }),
      ...(options?.author && { authors: [options.author] }),
    },

    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
      creator: '@taste_gratitude',
      site: '@taste_gratitude',
    },

    alternates: {
      canonical: fullUrl,
    },

    robots: options?.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
  };

  return metadata;
}

/**
 * Generate catalog/category page metadata
 */
export function generateCatalogMeta(category?: string): Metadata {
  const categoryName = category
    ? category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'All Products';

  const title = category ? `${categoryName} | Shop ${SITE_NAME}` : `Shop All Products | ${SITE_NAME}`;
  const description = category
    ? `Browse our ${categoryName} collection. Premium wildcrafted sea moss products with 92 essential minerals for optimal wellness.`
    : 'Shop our complete collection of wildcrafted sea moss gel, lemonades, and wellness products. 92 essential minerals. Free shipping on orders over $50.';

  return generatePageMeta(title, description, category ? `/catalog?category=${category}` : '/catalog', {
    keywords: [
      category || 'sea moss products',
      'wildcrafted sea moss',
      'sea moss gel',
      'wellness products',
      'natural supplements',
      'buy online',
      'free shipping',
    ],
  });
}

/**
 * Generate home page metadata
 */
export function generateHomeMeta(): Metadata {
  return {
    metadataBase: new URL(BASE_URL),
    title: `Premium Wildcrafted Sea Moss Gel - 92 Essential Minerals | ${SITE_NAME}`,
    description: 'Shop wildcrafted Irish sea moss gel packed with 92 essential minerals. Hand-crafted for immune support, thyroid health, and wellness. 100% natural, vegan superfood. Free shipping over $50.',
    keywords: [
      'sea moss gel',
      'wildcrafted sea moss',
      'Irish sea moss',
      'sea moss benefits',
      '92 minerals',
      'immune support',
      'thyroid health',
      'vegan superfood',
      'natural supplements',
      'holistic wellness',
      'Atlanta sea moss',
      'buy sea moss online',
    ].join(', '),
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,

    openGraph: {
      title: `Premium Wildcrafted Sea Moss Gel | ${SITE_NAME}`,
      description: 'Shop wildcrafted Irish sea moss gel packed with 92 essential minerals. Hand-crafted for immune support, thyroid health, and wellness.',
      url: BASE_URL,
      siteName: SITE_NAME,
      locale: 'en_US',
      type: 'website',
      images: [
        {
          url: `${BASE_URL}${DEFAULT_OG_IMAGE}`,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} - Premium Wildcrafted Sea Moss`,
        },
      ],
    },

    twitter: {
      card: 'summary_large_image',
      title: `Premium Wildcrafted Sea Moss Gel | ${SITE_NAME}`,
      description: 'Shop wildcrafted Irish sea moss gel packed with 92 essential minerals. 100% natural, vegan superfood.',
      images: [`${BASE_URL}${DEFAULT_OG_IMAGE}`],
      creator: '@taste_gratitude',
      site: '@taste_gratitude',
    },

    alternates: {
      canonical: BASE_URL,
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

/**
 * Generate JSON-LD Product schema for enhanced rich snippets
 */
export function generateProductJsonLd(product: ProductMeta & { 
  variations?: { name: string; price: number }[];
  reviews?: { author: string; rating: number; body: string; date: string }[];
}) {
  const productUrl = `${BASE_URL}/product/${product.slug}`;
  const productImage = product.image?.startsWith('http')
    ? product.image
    : `${BASE_URL}${product.image || DEFAULT_OG_IMAGE}`;

  const offers = product.variations?.length
    ? product.variations.filter(v => v.price > 0).map(variation => ({
        '@type': 'Offer',
        name: variation.name,
        price: variation.price.toFixed(2),
        priceCurrency: 'USD',
        availability: product.availability === 'out_of_stock'
          ? 'https://schema.org/PreOrder'
          : 'https://schema.org/InStock',
        url: productUrl,
        seller: {
          '@type': 'Organization',
          name: SITE_NAME,
        },
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }))
    : {
        '@type': 'Offer',
        price: product.price.toFixed(2),
        priceCurrency: 'USD',
        availability: product.availability === 'out_of_stock'
          ? 'https://schema.org/PreOrder'
          : 'https://schema.org/InStock',
        url: productUrl,
        seller: {
          '@type': 'Organization',
          name: SITE_NAME,
        },
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images?.length
      ? product.images.map(img => img.startsWith('http') ? img : `${BASE_URL}${img}`)
      : productImage,
    url: productUrl,
    sku: product.sku || product.slug,
    mpn: product.sku || product.slug,
    brand: {
      '@type': 'Brand',
      name: product.brand || SITE_NAME,
    },
    offers: Array.isArray(offers) ? { '@type': 'AggregateOffer', offers } : offers,
    category: product.category,
  };

  if (product.rating && product.reviewCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating.toString(),
      reviewCount: product.reviewCount.toString(),
      bestRating: '5',
      worstRating: '1',
    };
  }

  if (product.reviews?.length) {
    schema.review = product.reviews.map(review => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.author,
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating.toString(),
        bestRating: '5',
        worstRating: '1',
      },
      reviewBody: review.body,
      datePublished: review.date,
    }));
  }

  return schema;
}

/**
 * Generate breadcrumb JSON-LD for navigation context
 */
export function generateBreadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path.startsWith('http') ? item.path : `${BASE_URL}${item.path}`,
    })),
  };
}
