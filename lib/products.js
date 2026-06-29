// Compatibility facade: the weekly market product source of truth now lives in data/products.ts.
// Keep this file for older imports while avoiding stale catalog drift.

export {
  PRODUCTS,
  getActiveProducts,
  getActiveWeeklyProducts,
  getAllProducts,
  getBestSellerProducts,
  getCuratedStorefrontProducts,
  getFeaturedProducts,
  getInactiveProducts,
  getInStockProducts,
  getProductBySlug,
  getProductByName,
  getProductBySlugOrId,
  getTaxonomyCategoryLabel,
  getProductsByCategory,
  getRecommendedProductsForGoal,
  isInactiveCatalogItem,
  mergeWithCuratedProduct,
  normalizeProductKey,
  toStorefrontProduct,
} from '@/data/products';

export { PRODUCTS as default } from '@/data/products';
