/**
 * Sandbox Product Detection & Filtering
 * Centralized utilities to identify and filter sandbox products
 * across all code paths (API, UI, database)
 */

/**
 * Check if a product is from sandbox (multiple vectors)
 */
export function isSandboxProduct(product) {
  if (!product) return false;
  
  return !!(
    product.source === 'sandbox_sync' ||
    product._squareSyncEnv === 'sandbox' ||
    product.id?.match(/^sandbox-/i) ||
    product.squareId?.match(/^sandbox-/i)
  );
}

/**
 * Filter array of products to remove any sandbox products
 */
export function filterOutSandboxProducts(products) {
  if (!Array.isArray(products)) {
    console.warn('[sandbox-detection] filterOutSandboxProducts: input is not an array', { type: typeof products });
    return [];
  }
  
  const filtered = products.filter(p => !isSandboxProduct(p));
  
  if (filtered.length < products.length) {
    const removed = products.length - filtered.length;
    console.warn(`[sandbox-detection] Filtered out ${removed} sandbox product(s)`, {
      total: products.length,
      kept: filtered.length,
      removed
    });
  }
  
  return filtered;
}

/**
 * Validate that a response contains NO sandbox products
 * Useful for final safety check before returning to client
 */
export function validateNoSandboxProducts(products, context = '') {
  const sandboxProducts = products.filter(isSandboxProduct);
  
  if (sandboxProducts.length > 0) {
    const error = new Error(`Sandbox products detected in ${context || 'API response'}`);
    error.sandboxProducts = sandboxProducts;
    error.count = sandboxProducts.length;
    
    if (process.env.NODE_ENV === 'production') {
      // In production, log critical error
      console.error('[CRITICAL] Sandbox products found in production response', {
        context,
        count: sandboxProducts.length,
        products: sandboxProducts.slice(0, 3) // Log first 3 for debugging
      });
    }
    
    throw error;
  }
  
  return true;
}

/**
 * Check database for sandbox products (health check)
 */
export async function checkDatabaseForSandboxProducts(db) {
  try {
    const count = await db.collection('unified_products').countDocuments({
      $or: [
        { source: 'sandbox_sync' },
        { id: { $regex: /^sandbox-/i } },
        { squareId: { $regex: /^sandbox-/i } },
        { _squareSyncEnv: 'sandbox' }
      ]
    });
    
    return {
      hasSandbox: count > 0,
      count,
      severity: process.env.NODE_ENV === 'production' ? 'critical' : 'warning'
    };
  } catch (error) {
    console.error('[sandbox-detection] Failed to check database:', error.message);
    return {
      hasSandbox: null,
      count: null,
      error: error.message
    };
  }
}

/**
 * Environment-based check
 * Stricter in production
 */
export function shouldAllowSandboxProducts() {
  // Never allow in production
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  
  // In dev, allow if explicitly enabled
  return process.env.ALLOW_SANDBOX_PRODUCTS === 'true';
}

/**
 * Create a safe product object that strips internal fields
 */
export function sanitizeProductForClient(product) {
  if (!product) return null;
  
  // Create new object with only safe fields
  const safe = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: product.price,
    priceCents: product.priceCents,
    image: product.image,
    images: product.images,
    category: product.category,
    intelligentCategory: product.intelligentCategory,
    ingredients: product.ingredients,
    categoryData: product.categoryData,
    benefitStory: product.benefitStory,
    tags: product.tags,
    variations: product.variations,
    stock: product.stock,
    rating: product.rating,
    reviews: product.reviews,
    inStock: product.inStock,
    featured: product.featured,
    squareData: product.squareData ? {
      catalogObjectId: product.squareData.catalogObjectId,
      variationId: product.squareData.variationId,
      categoryId: product.squareData.categoryId
    } : undefined,
    variationId: product.variationId,
    catalogObjectId: product.catalogObjectId,
    isPlaceholder: product.isPlaceholder
  };
  
  // Remove undefined values
  Object.keys(safe).forEach(key => safe[key] === undefined && delete safe[key]);
  
  // Double-check: never expose internal fields
  const dangerous = ['source', '_squareSyncEnv', '_syncedAt', '_syncedFrom', '_rawSquareData', '_metadata'];
  dangerous.forEach(field => {
    if (field in safe) {
      console.warn(`[sandbox-detection] Dangerous field '${field}' found in sanitized product!`);
      delete safe[field];
    }
  });
  
  return safe;
}
