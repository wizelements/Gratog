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
    title: 'Premium Wildcrafted Sea Moss Gel - 92 Essential Minerals',
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
    'immune support',
    'thyroid health',
    'digestive health',
    'energy boost',
    'skin health',
    '92 minerals',
  ];

  const keywords = [
    product.name.toLowerCase(),
    'sea moss gel',
    'wildcrafted sea moss',
    product.category,
    ...benefitKeywords,
    'buy online',
    'natural supplement',
  ];

  return generateMetadata({
    title: product.name,
    description: product.description || `Premium ${product.name} - Wildcrafted sea moss gel with 92 essential minerals. ${product.price.toFixed(2)}. Order online for fast delivery.`,
    keywords,
    image: product.image,
    url: `/product/${product.slug}`,
    type: 'product',
    price: product.price,
    availability: product.availability as any,
  }, baseUrl);
}

/**
 * Category Page Meta Tags
 */
export function getCategoryMetadata(category: string, baseUrl: string) {
  const categoryDescriptions: Record<string, string> = {
    'sea-moss-gel': 'Browse our wildcrafted sea moss gel collection. Pure, hand-crafted Irish sea moss packed with 92 essential minerals for optimal wellness.',
    'elderberry': 'Elderberry-infused sea moss products for immune support. Natural, wildcrafted ingredients for your health.',
    'lemonade': 'Refreshing sea moss lemonade blends. Delicious superfood drinks packed with minerals and vitamins.',
    'gift-sets': 'Sea moss gift sets perfect for wellness enthusiasts. Curated collections of our best-selling products.',
  };

  return generateMetadata({
    title: `${category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Products`,
    description: categoryDescriptions[category] || `Shop ${category} products from Taste of Gratitude. Premium wildcrafted sea moss and natural wellness products.`,
    keywords: [category, 'sea moss', 'wellness', 'natural supplements', 'buy online'],
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
    keywords: post.tags || ['sea moss', 'wellness', 'health', 'nutrition'],
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
    description: 'Common questions about sea moss gel, benefits, usage, storage, and more. Expert answers to help you get the most from your wildcrafted sea moss.',
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
    title: 'About Us - Premium Wildcrafted Sea Moss',
    description: 'Learn about Taste of Gratitude. Our story, mission, and commitment to providing the highest quality wildcrafted sea moss products from pristine ocean waters.',
    keywords: [
      'about taste of gratitude',
      'wildcrafted sea moss',
      'sustainable harvesting',
      'organic sea moss',
      'sea moss company',
      'Atlanta wellness',
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
