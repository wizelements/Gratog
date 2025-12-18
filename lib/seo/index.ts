/**
 * 🎯 SEO Module Index
 * Central export for all SEO utilities
 */

// Next.js 15 Metadata Helpers
export {
  generateProductMeta,
  generatePageMeta,
  generateCatalogMeta,
  generateHomeMeta,
  generateProductJsonLd,
  generateBreadcrumbJsonLd,
  type ProductMeta,
} from './metadata';

// Structured Data (JSON-LD)
export {
  getOrganizationSchema,
  getWebsiteSchema,
  getProductSchema,
  getBreadcrumbSchema,
  getFAQSchema,
  getLocalBusinessSchema,
  getArticleSchema,
  getProductCollectionSchema,
  getVideoSchema,
  renderJsonLd,
  type Product,
} from './structured-data';

// Rich Snippets
export {
  getRecipeSchema,
  getHowToSchema,
  getOfferSchema,
  getCourseSchema,
  getSpeakableSchema,
  getQAPageSchema,
  getReviewSchema,
  getAggregateRatingSchema,
  getMedicalWebPageSchema,
  getNutritionSchema,
  getClaimReviewSchema,
  getStoreHoursSchema,
} from './rich-snippets';

// Meta Tags
export {
  generateMetadata as generateMetaTagsConfig,
  getHomeMetadata,
  getProductMetadata,
  getCategoryMetadata,
  getBlogMetadata,
  getFAQMetadata,
  getAboutMetadata,
  getContactMetadata,
  type MetaConfig,
} from './meta-tags';

// Local Business
export * from './local-business';

// Content Optimizer
export * from './content-optimizer';
