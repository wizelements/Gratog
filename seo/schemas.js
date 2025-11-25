// SEO Schemas for Taste of Gratitude
// Structured data (JSON-LD) for enhanced search visibility

export const OrganizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Taste of Gratitude',
  description: 'Premium wildcrafted sea moss and holistic wellness products. Hand-crafted in Atlanta with 92 essential minerals.',
  url: 'https://tasteofgratitude.shop',
  logo: 'https://tasteofgratitude.shop/logo.png',
  image: 'https://tasteofgratitude.shop/og/brand.jpg',
  sameAs: [
    'https://www.instagram.com/tasteofgratitude',
    'https://www.facebook.com/tasteofgratitude',
    'https://www.tiktok.com/@tasteofgratitude'
  ],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Atlanta',
    addressRegion: 'GA',
    addressCountry: 'US'
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    availableLanguage: 'English'
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '847',
    bestRating: '5',
    worstRating: '1'
  },
  priceRange: '$$',
  foundingDate: '2020',
  slogan: 'Wildcrafted Sea Moss Wellness Journey'
};

export const LocalBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://tasteofgratitude.shop/#localbusiness',
  name: 'Taste of Gratitude',
  image: 'https://tasteofgratitude.shop/og/brand.jpg',
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Atlanta',
    addressRegion: 'GA',
    addressCountry: 'US'
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday', 'Sunday'],
      opens: '10:00',
      closes: '14:00',
      description: 'Available at local Atlanta markets'
    }
  ],
  servesCuisine: 'Health Foods & Wellness Products',
  hasMenu: 'https://tasteofgratitude.shop/catalog',
  acceptsReservations: 'False',
  paymentAccepted: 'Cash, Credit Card, Square'
};

export function ProductSchema(product) {
  const basePrice = product.price || product.variations?.[0]?.price || 0;
  const prices = product.variations?.map(v => v.price).filter(Boolean) || [basePrice];
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `Premium wildcrafted ${product.name} from Taste of Gratitude`,
    image: product.image || product.images?.[0] || 'https://tasteofgratitude.shop/og/product-default.jpg',
    brand: {
      '@type': 'Brand',
      name: 'Taste of Gratitude'
    },
    offers: product.variations && product.variations.length > 1 ? {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: lowPrice.toFixed(2),
      highPrice: highPrice.toFixed(2),
      availability: 'https://schema.org/InStock',
      url: `https://tasteofgratitude.shop/product/${product.slug || product.id}`,
      seller: {
        '@type': 'Organization',
        name: 'Taste of Gratitude'
      }
    } : {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: basePrice.toFixed(2),
      availability: 'https://schema.org/InStock',
      url: `https://tasteofgratitude.shop/product/${product.slug || product.id}`,
      seller: {
        '@type': 'Organization',
        name: 'Taste of Gratitude'
      }
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '124'
    },
    category: product.category || 'Health & Wellness',
    sku: product.sku || product.id,
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Minerals',
        value: '92 Essential Minerals from Wildcrafted Sea Moss'
      },
      {
        '@type': 'PropertyValue',
        name: 'Made In',
        value: 'Atlanta, GA'
      },
      {
        '@type': 'PropertyValue',
        name: 'Type',
        value: product.intelligentCategory || 'Wellness Product'
      }
    ]
  };
}

export function BreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

export function FAQSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

export function ArticleSchema(article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.image || 'https://tasteofgratitude.shop/og/article-default.jpg',
    datePublished: article.publishedDate || new Date().toISOString(),
    dateModified: article.modifiedDate || new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: 'Taste of Gratitude',
      url: 'https://tasteofgratitude.shop'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Taste of Gratitude',
      url: 'https://tasteofgratitude.shop',
      logo: {
        '@type': 'ImageObject',
        url: 'https://tasteofgratitude.shop/logo.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url
    }
  };
}

export function HowToSchema(howTo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: howTo.name,
    description: howTo.description,
    image: howTo.image,
    totalTime: howTo.totalTime || 'PT5M',
    estimatedCost: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: howTo.cost || '0'
    },
    supply: howTo.supplies?.map(supply => ({
      '@type': 'HowToSupply',
      name: supply
    })) || [],
    tool: howTo.tools?.map(tool => ({
      '@type': 'HowToTool',
      name: tool
    })) || [],
    step: howTo.steps?.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      url: step.url
    })) || []
  };
}

// Helper function to inject schema into page
export function injectSchema(schema) {
  if (typeof window === 'undefined') {
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    );
  }
  return null;
}
