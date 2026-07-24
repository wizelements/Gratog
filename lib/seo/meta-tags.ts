/**
 * 🎯 Dynamic Meta Tags Generator for SEO
 * Generates optimized meta tags for each page
 */

export interface MetaConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  publishDate?: string;
  modifiedDate?: string;
  author?: string;
  price?: number;
  availability?: 'in stock' | 'out of stock';
}

/**
 * Generate complete metadata object for Next.js
 */
export function generateMetadata(config: MetaConfig, baseUrl: string) {
  const {
    title,
    description,
    keywords = [],
    image = '/og-image.jpg',
    url = '',
    type = 'website',
    publishDate,
    modifiedDate,
    author,
    price,
    availability,
  } = config;

  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  const fullImage = image.startsWith('http') ? image : `${baseUrl}${image}`;

  const metadata: any = {
    metadataBase: new URL(baseUrl),
    title: `${title} | Taste of Gratitude`,
    description,
    keywords: keywords.join(', '),
    authors: author ? [{ name: author }] : [{ name: 'Taste of Gratitude' }],
    creator: 'Taste of Gratitude',
    publisher: 'Taste of Gratitude',
    
    openGraph: {
      title: `${title} | Taste of Gratitude`,
      description,
      url: fullUrl,
      siteName: 'Taste of Gratitude',
      locale: 'en_US',
      type,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },

    twitter: {
      card: 'summary_large_image',
      title: `${title} | Taste of Gratitude`,
      description,
      images: [fullImage],
      creator: '@taste_gratitude',
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

    alternates: {
      canonical: fullUrl,
    },
  };

  // Add article-specific metadata
  if (type === 'article' && publishDate) {
    metadata.openGraph.publishedTime = publishDate;
    if (modifiedDate) {
      metadata.openGraph.modifiedTime = modifiedDate;
    }
    if (author) {
      metadata.openGraph.authors = [author];
    }
  }

  // Add product-specific metadata
  if (type === 'product' && price) {
    metadata.openGraph.product = {
      price: {
        amount: price,
        currency: 'USD',
      },
      availability: availability || 'in stock',
    };
  }

  return metadata;
}

/**
 * Homepage Meta Tags
 */
export function getHomeMetadata(baseUrl: string) {
  return generateMetadata({
    title: 'Taste of Gratitude | Small-Batch Sea Moss Gels & Fresh Drinks',
    description: 'Shop small-batch sea moss gels, fresh drinks, refreshers, and shots from Taste of Gratitude. Weekly menu drops for Atlanta farmers market pickup.',
    keywords: [
      'sea moss gel Atlanta',
      'small-batch sea moss',
      'Atlanta farmers market drinks',
      'fresh sea moss drinks',
      'Taste of Gratitude menu',
      'Atlanta sea moss',
      'buy sea moss online',
    ],
    url: '/',
  }, baseUrl);
}

/**
 * Product Page Meta Tags
 */
export function getProductMetadata(product: {
  name: string;
  description: string;
  price: number;
  image: string;
  slug: string;
  category: string;
  availability?: string;
}, baseUrl: string) {
  // Extract key benefits from description for keywords
  const benefitKeywords = [
    'fresh drinks',
    'sea moss gel',
    'farmers market pickup',
    'small-batch',
    'weekly menu',
  ];

  const keywords = [
    product.name.toLowerCase(),
    'sea moss gel',
    'sea moss',
    product.category,
    ...benefitKeywords,
    'buy online',
    'small-batch sea moss',
  ];

  return generateMetadata({
    title: product.name,
    description: product.description || `${product.name} from Taste of Gratitude. Small-batch sea moss gel, drinks, and shots for Atlanta farmers market pickup. $${product.price.toFixed(2)}.`,
    keywords,
    image: product.image,
    url: `/product/${product.slug}`,
    type: 'product',
    price: product.price,
    availability: product.availability as 'in stock' | 'out of stock',
  }, baseUrl);
}

/**
 * Category Page Meta Tags
 */
export function getCategoryMetadata(category: string, baseUrl: string) {
  const categoryDescriptions: Record<string, string> = {
    'sea-moss-gel': 'Browse our small-batch sea moss gel collection. Hand-crafted with simple ingredients for Atlanta farmers market pickup.',
    'elderberry': 'Browse elderberry-flavored sea moss gels and shots made in small batches for Atlanta farmers market pickup.',
    'lemonade': 'Refreshing sea moss lemonade blends. Fresh, small-batch drinks for market pickup.',
    'gift-sets': 'Curated Taste of Gratitude sets. Great for trying the weekly menu or sharing with friends.',
  };

  return generateMetadata({
    title: `${category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Products`,
    description: categoryDescriptions[category] || `Shop ${category} products from Taste of Gratitude. Small-batch sea moss gels, drinks, and shots for Atlanta farmers market pickup.`,
    keywords: [category, 'sea moss', 'small-batch products', 'buy online'],
    url: `/catalog?category=${category}`,
  }, baseUrl);
}

/**
 * Blog Post Meta Tags
 */
export function getBlogMetadata(post: {
  title: string;
  excerpt: string;
  slug: string;
  image?: string;
  author: string;
  publishDate: string;
  modifiedDate?: string;
  tags?: string[];
}, baseUrl: string) {
  return generateMetadata({
    title: post.title,
    description: post.excerpt,
    keywords: post.tags || ['sea moss', 'health', 'nutrition'],
    image: post.image || '/og-image-blog.jpg',
    url: `/blog/${post.slug}`,
    type: 'article',
    publishDate: post.publishDate,
    modifiedDate: post.modifiedDate,
    author: post.author,
  }, baseUrl);
}

/**
 * FAQ Page Meta Tags
 */
export function getFAQMetadata(baseUrl: string) {
  return generateMetadata({
    title: 'Frequently Asked Questions - Sea Moss Guide',
    description: 'Common questions about sea moss gel, benefits, usage, storage, and more. Expert answers to help you get the most from your sea moss.',
    keywords: [
      'sea moss FAQ',
      'sea moss questions',
      'how to use sea moss',
      'sea moss benefits',
      'sea moss storage',
      'sea moss dosage',
      'is sea moss safe',
    ],
    url: '/faq',
  }, baseUrl);
}

/**
 * About Page Meta Tags
 */
export function getAboutMetadata(baseUrl: string) {
  return generateMetadata({
    title: 'About Us - Small-Batch Sea Moss',
    description: 'Learn about Taste of Gratitude. Our story, mission, and commitment to providing the highest quality sea moss products from pristine ocean waters.',
    keywords: [
      'about taste of gratitude',
      'sea moss',
      'sustainable harvesting',
      'organic sea moss',
      'sea moss company',
      'Atlanta sea moss',
    ],
    url: '/about',
  }, baseUrl);
}

/**
 * Contact Page Meta Tags
 */
export function getContactMetadata(baseUrl: string) {
  return generateMetadata({
    title: 'Contact Us - Get in Touch',
    description: 'Contact Taste of Gratitude for questions about sea moss products, wholesale inquiries, or custom orders. Visit us at Atlanta farmers markets.',
    keywords: ['contact', 'customer service', 'wholesale', 'bulk orders', 'farmers markets'],
    url: '/contact',
  }, baseUrl);
}
