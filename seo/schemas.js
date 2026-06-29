// SEO Schemas for Taste of Gratitude
// Structured data (JSON-LD) for enhanced search visibility

export const OrganizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Taste of Gratitude',
  description: 'Small-batch wildcrafted sea moss gels, wellness drinks, refreshers, and shots prepared for Atlanta market pickup.',
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

export function ProductSchema(product, reviews) {
  const basePrice = product.price || product.variations?.[0]?.price || 0;
  const prices = product.variations?.map(v => v.price).filter(Boolean) || [basePrice];
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);

  const hasRealReviews = Array.isArray(reviews) && reviews.length > 0;

  const schema = {
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
    category: product.category || 'Health & Wellness',
    sku: product.sku || product.id,
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Routine',
        value: 'Mineral-focused small-batch sea moss wellness product'
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

  if (hasRealReviews) {
    const avgRating = (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1);
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating,
      reviewCount: String(reviews.length)
    };
  }

  return schema;
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

export function SubscriptionSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': 'https://tasteofgratitude.shop/subscriptions',
    name: 'Taste of Gratitude Subscription Plans',
    description: 'Flexible wellness subscriptions with premium wildcrafted sea moss products',
    brand: { '@type': 'Brand', name: 'Taste of Gratitude' },
    offers: [
      {
        '@type': 'Offer',
        name: 'Daily Gel Club',
        priceCurrency: 'USD',
        price: '31.99',
        priceSpecification: { '@type': 'UnitPriceSpecification', priceCurrency: 'USD', price: '31.99', billingDuration: 'P1M', billingIncrement: '1' },
        availability: 'https://schema.org/InStock',
        description: '1 Sea Moss Gel (16oz) per month',
      },
      {
        '@type': 'Offer',
        name: 'Glow Getters Bundle',
        priceCurrency: 'USD',
        price: '44.99',
        priceSpecification: { '@type': 'UnitPriceSpecification', priceCurrency: 'USD', price: '44.99', billingDuration: 'P1M', billingIncrement: '1' },
        availability: 'https://schema.org/InStock',
        description: '1 Sea Moss Gel + 3 Wellness Shots',
      },
      {
        '@type': 'Offer',
        name: 'Recovery Duo',
        priceCurrency: 'USD',
        price: '61.99',
        priceSpecification: { '@type': 'UnitPriceSpecification', priceCurrency: 'USD', price: '61.99', billingDuration: 'P1M', billingIncrement: '1' },
        availability: 'https://schema.org/InStock',
        description: '2 Sea Moss Gels (16oz each) per month',
      },
      {
        '@type': 'Offer',
        name: 'Starter Sips',
        priceCurrency: 'USD',
        price: '24.99',
        priceSpecification: { '@type': 'UnitPriceSpecification', priceCurrency: 'USD', price: '24.99', billingDuration: 'P1M', billingIncrement: '1' },
        availability: 'https://schema.org/InStock',
        description: '6 Wellness Shots (2oz each) per month',
      },
    ],
  };
}

export function AggregateRatingSchema(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) return null;

  const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;

  return {
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    '@id': 'https://tasteofgratitude.shop/#aggregate-rating',
    ratingValue: avgRating.toFixed(1),
    reviewCount: String(reviews.length),
    bestRating: '5',
    worstRating: '1',
  };
}

export function validateSchema(schema) {
  const errors = [];

  if (!schema || typeof schema !== 'object') {
    return { valid: false, errors: ['Schema must be an object'] };
  }

  if (!schema['@context']) errors.push('Missing @context');
  if (!schema['@type']) errors.push('Missing @type');

  if (schema['@type'] === 'Product') {
    if (!schema.name) errors.push('Product schema missing required field: name');
    if (!schema.description) errors.push('Product schema missing required field: description');
    if (!schema.offers) errors.push('Product schema missing required field: offers');
  }

  if (schema['@type'] === 'AggregateRating') {
    if (!schema.ratingValue) errors.push('AggregateRating schema missing required field: ratingValue');
    if (!schema.reviewCount) errors.push('AggregateRating schema missing required field: reviewCount');
  }

  return { valid: errors.length === 0, errors };
}

// Helper function to inject schema into page
export function injectSchema(schema) {
  return JSON.stringify(schema);
}

export function buildHomepageOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://tasteofgratitude.shop/#organization',
        name: 'Taste of Gratitude',
        description: 'Atlanta farmers market wellness brand offering small-batch sea moss gels, wellness drinks, refreshers, and shots.',
        url: 'https://tasteofgratitude.shop',
        logo: 'https://tasteofgratitude.shop/logo.png',
        image: 'https://tasteofgratitude.shop/images/gratog-bg.PNG',
        sameAs: [
          'https://www.instagram.com/tasteofgratitude',
          'https://www.facebook.com/tasteofgratitude'
        ]
      },
      {
        '@type': 'LocalBusiness',
        '@id': 'https://tasteofgratitude.shop/#localbusiness',
        name: 'Taste of Gratitude',
        description: 'Small-batch sea moss Atlanta wellness brand serving weekly market menu drops and local farmers market pickup.',
        url: 'https://tasteofgratitude.shop',
        image: 'https://tasteofgratitude.shop/images/gratog-bg.PNG',
        priceRange: '$$',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Atlanta',
          addressRegion: 'GA',
          addressCountry: 'US'
        },
        areaServed: [
          { '@type': 'City', name: 'Atlanta' },
          { '@type': 'State', name: 'Georgia' }
        ],
        makesOffer: [
          { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Wildcrafted sea moss gel' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Atlanta farmers market juices' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Wellness drinks Atlanta' } }
        ],
        paymentAccepted: 'Square, credit card, debit card',
        hasMenu: 'https://tasteofgratitude.shop/catalog'
      }
    ]
  };
}

export function buildHomepageFaqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is sea moss?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sea moss is a red seaweed traditionally used in Caribbean and Irish kitchens. Taste of Gratitude blends it into smooth gels and drinks that customers can add to everyday wellness routines.'
        }
      },
      {
        '@type': 'Question',
        name: 'How do I use sea moss gel?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Use 1-2 tablespoons in smoothies, teas, bowls, soups, or recipes. Keep refrigerated, use a clean spoon, and follow the freshness window on the label.'
        }
      },
      {
        '@type': 'Question',
        name: 'Is your sea moss wildcrafted or pool-grown?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Taste of Gratitude uses wildcrafted sea moss and keeps each product page transparent about ingredients, allergens, and routine fit.'
        }
      },
      {
        '@type': 'Question',
        name: 'What makes Taste of Gratitude sea moss different?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Taste of Gratitude is a weekly farmers market wellness brand. Products are made in small batches, tied to menu drops, and supported by market pickup, education, and founder-led guidance.'
        }
      }
    ]
  };
}
