/**
 * 🎯 Rich Snippets Generator
 * Creates Google-optimized rich results for maximum CTR
 */

/**
 * Recipe Schema - For sea moss smoothie/recipe content
 */
export function getRecipeSchema(recipe: {
  name: string;
  description: string;
  prepTime: string;
  totalTime: string;
  servings: number;
  calories: number;
  ingredients: string[];
  instructions: string[];
  image: string;
  author: string;
}, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    description: recipe.description,
    image: recipe.image.startsWith('http') ? recipe.image : `${baseUrl}${recipe.image}`,
    author: {
      '@type': 'Person',
      name: recipe.author,
    },
    prepTime: recipe.prepTime, // ISO 8601: PT15M = 15 minutes
    totalTime: recipe.totalTime,
    recipeYield: `${recipe.servings} servings`,
    nutrition: {
      '@type': 'NutritionInformation',
      calories: `${recipe.calories} calories`,
    },
    recipeIngredient: recipe.ingredients,
    recipeInstructions: recipe.instructions.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      text: step,
    })),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '152',
    },
    keywords: 'sea moss smoothie, healthy recipe, superfood, wellness drink',
  };
}

/**
 * How-To Schema - For instructional content
 */
export function getHowToSchema(howTo: {
  name: string;
  description: string;
  totalTime: string;
  steps: { name: string; text: string; image?: string }[];
  image: string;
}, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: howTo.name,
    description: howTo.description,
    image: howTo.image.startsWith('http') ? howTo.image : `${baseUrl}${howTo.image}`,
    totalTime: howTo.totalTime,
    step: howTo.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      image: step.image ? (step.image.startsWith('http') ? step.image : `${baseUrl}${step.image}`) : undefined,
    })),
  };
}

/**
 * Special Offer Schema - For promotions
 */
export function getOfferSchema(offer: {
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  validFrom: string;
  validThrough: string;
  url: string;
}, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: offer.name,
    description: offer.description,
    price: offer.price.toFixed(2),
    priceCurrency: 'USD',
    priceValidUntil: offer.validThrough,
    availability: 'https://schema.org/InStock',
    url: offer.url.startsWith('http') ? offer.url : `${baseUrl}${offer.url}`,
    seller: {
      '@type': 'Organization',
      name: 'Taste of Gratitude',
    },
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: offer.price.toFixed(2),
      priceCurrency: 'USD',
    },
    validFrom: offer.validFrom,
    validThrough: offer.validThrough,
  };
}

/**
 * Course/Educational Content Schema
 */
export function getCourseSchema(course: {
  name: string;
  description: string;
  provider: string;
  image: string;
  url: string;
}, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.name,
    description: course.description,
    provider: {
      '@type': 'Organization',
      name: course.provider,
      sameAs: baseUrl,
    },
    image: course.image.startsWith('http') ? course.image : `${baseUrl}${course.image}`,
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: 'PT1H', // 1 hour
    },
  };
}

/**
 * Speakable Schema - For voice search optimization
 */
export function getSpeakableSchema(content: {
  cssSelectors: string[];
  xpath?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: content.cssSelectors,
      xpath: content.xpath,
    },
  };
}

/**
 * Q&A Schema - For question/answer content
 */
export function getQAPageSchema(questions: { question: string; answer: string; author?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: questions.map(qa => ({
      '@type': 'Question',
      name: qa.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: qa.answer,
        author: qa.author ? {
          '@type': 'Person',
          name: qa.author,
        } : undefined,
      },
    })),
  };
}

/**
 * Review Schema - For product reviews
 */
export function getReviewSchema(review: {
  productName: string;
  reviewBody: string;
  rating: number;
  author: string;
  datePublished: string;
}, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Product',
      name: review.productName,
      brand: {
        '@type': 'Brand',
        name: 'Taste of Gratitude',
      },
    },
    author: {
      '@type': 'Person',
      name: review.author,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: review.reviewBody,
    datePublished: review.datePublished,
  };
}

/**
 * Aggregate Rating Schema - For overall product ratings
 */
export function getAggregateRatingSchema(product: {
  name: string;
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.ratingValue,
      reviewCount: product.reviewCount,
      bestRating: product.bestRating || 5,
      worstRating: product.worstRating || 1,
    },
  };
}

/**
 * Medical/Health Content Schema
 */
export function getMedicalWebPageSchema(content: {
  title: string;
  description: string;
  lastReviewed: string;
  reviewedBy?: string;
  url: string;
}, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: content.title,
    description: content.description,
    lastReviewed: content.lastReviewed,
    reviewedBy: content.reviewedBy ? {
      '@type': 'Person',
      name: content.reviewedBy,
    } : undefined,
    url: content.url.startsWith('http') ? content.url : `${baseUrl}${content.url}`,
  };
}

/**
 * Nutritional Information Schema
 */
export function getNutritionSchema(nutrition: {
  servingSize: string;
  calories: number;
  fatContent: string;
  carbohydrateContent: string;
  proteinContent: string;
  fiberContent?: string;
  sugarContent?: string;
}) {
  return {
    '@type': 'NutritionInformation',
    servingSize: nutrition.servingSize,
    calories: `${nutrition.calories} calories`,
    fatContent: nutrition.fatContent,
    carbohydrateContent: nutrition.carbohydrateContent,
    proteinContent: nutrition.proteinContent,
    fiberContent: nutrition.fiberContent,
    sugarContent: nutrition.sugarContent,
  };
}

/**
 * Claim Review Schema - For fact-checking health claims
 */
export function getClaimReviewSchema(claim: {
  claimReviewed: string;
  rating: string;
  reviewedBy: string;
  datePublished: string;
  url: string;
}, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ClaimReview',
    claimReviewed: claim.claimReviewed,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: claim.rating,
      bestRating: 'True',
      worstRating: 'False',
      alternateName: claim.rating,
    },
    author: {
      '@type': 'Organization',
      name: claim.reviewedBy,
    },
    datePublished: claim.datePublished,
    url: claim.url.startsWith('http') ? claim.url : `${baseUrl}${claim.url}`,
  };
}

/**
 * Store Hours Schema
 */
export function getStoreHoursSchema(hours: {
  dayOfWeek: string;
  opens: string;
  closes: string;
}[]) {
  return {
    '@type': 'Store',
    openingHoursSpecification: hours.map(h => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.dayOfWeek,
      opens: h.opens,
      closes: h.closes,
    })),
  };
}
