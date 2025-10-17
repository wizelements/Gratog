/**
 * Product Data Normalizer
 * Converts between legacy and new product data structures
 * Handles cents-to-dollars conversion and variant mapping
 */

/**
 * Normalizes new API product format to legacy format for compatibility
 * @param {Object} newProduct - Product from new API format
 * @returns {Object} - Legacy compatible product format
 */
export function normalizeProduct(newProduct) {
  if (!newProduct) {
    throw new Error('Invalid product data: product is null or undefined');
  }

  // Check if this is already a normalized product
  if (newProduct._normalized) {
    return newProduct;
  }

  // Check if this looks like admin API format (has price > 100, which indicates cents)
  if (newProduct.price && typeof newProduct.price === 'number' && 
      !newProduct.variants && newProduct.price > 100) {
    // Admin API format - convert cents to dollars
    return {
      ...newProduct,
      price: newProduct.price / 100, // Convert cents to dollars
      _normalized: true
    };
  }

  // Convert new format to legacy format
  try {
    const primaryVariant = newProduct.variants?.[0] || {};
    const images = Array.isArray(newProduct.images) ? newProduct.images : [];
    
    return {
      id: newProduct.slug || newProduct.id || crypto.randomUUID(),
      name: newProduct.title || newProduct.name || 'Unnamed Product',
      description: newProduct.description || '',
      
      // Price conversion: handle both cents and dollars formats
      price: primaryVariant.price_cents 
        ? (primaryVariant.price_cents / 100)
        : newProduct.price 
          ? (typeof newProduct.price === 'number' && newProduct.price > 100 
             ? newProduct.price / 100  // Assume cents if > 100
             : newProduct.price)       // Already in dollars
          : 0,
      
      // Size/variant info
      size: primaryVariant.options?.size || primaryVariant.size || '16oz',
      
      // Image handling with fallbacks
      image: images[0]?.url || newProduct.image || '/images/placeholder-product.jpg',
      images: images.map(img => img.url || img).filter(Boolean),
      
      // Stock/availability mapping
      stock: mapAvailabilityToStock(primaryVariant.availability || newProduct.stock),
      
      // Additional fields for compatibility
      category: newProduct.category || 'Sea Moss',
      slug: newProduct.slug || generateSlug(newProduct.title || newProduct.name),
      
      // Preserve original data for reference
      _original: newProduct,
      _normalized: true
    };
  } catch (error) {
    console.error('Product normalization failed:', error, newProduct);
    
    // Return minimal fallback product to prevent crashes
    return {
      id: newProduct.id || crypto.randomUUID(),
      name: newProduct.title || newProduct.name || 'Product',
      price: 0,
      size: '16oz',
      image: '/images/placeholder-product.jpg',
      stock: 0,
      _error: error.message
    };
  }
}

/**
 * Normalizes array of products
 * @param {Array} products - Array of products to normalize
 * @returns {Array} - Array of normalized products
 */
export function normalizeProducts(products) {
  if (!Array.isArray(products)) {
    console.error('normalizeProducts expects an array, got:', typeof products);
    return [];
  }

  return products
    .map(product => {
      try {
        return normalizeProduct(product);
      } catch (error) {
        console.error('Failed to normalize product:', error, product);
        return null;
      }
    })
    .filter(Boolean); // Remove any failed normalizations
}

/**
 * Maps availability strings to numeric stock values
 * @param {string|number} availability 
 * @returns {number}
 */
function mapAvailabilityToStock(availability) {
  if (typeof availability === 'number') {
    return availability;
  }
  
  const availabilityMap = {
    'in_stock': 25,
    'low_stock': 5,
    'out_of_stock': 0,
    'available': 25,
    'unavailable': 0,
    'limited': 5
  };

  return availabilityMap[availability] || 0;
}

/**
 * Generates URL-friendly slug from product name
 * @param {string} name 
 * @returns {string}
 */
function generateSlug(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Remove duplicate hyphens
    .trim();
}

/**
 * Converts price from dollars to cents for Square API
 * @param {number} dollarAmount 
 * @returns {number}
 */
export function dollarsToCents(dollarAmount) {
  return Math.round(dollarAmount * 100);
}

/**
 * Converts price from cents to dollars for display
 * @param {number} centAmount 
 * @returns {number}
 */
export function centsToDollars(centAmount) {
  return centAmount / 100;
}

/**
 * Validates normalized product has required fields
 * @param {Object} product 
 * @returns {boolean}
 */
export function isValidProduct(product) {
  return !!(
    product &&
    product.id &&
    product.name &&
    typeof product.price === 'number' &&
    product.price >= 0
  );
}

/**
 * Creates product schema markup for SEO
 * @param {Object} product - Normalized product
 * @returns {Object} - JSON-LD schema
 */
export function generateProductSchema(product) {
  if (!isValidProduct(product)) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "image": product.image,
    "offers": {
      "@type": "Offer",
      "price": product.price.toFixed(2),
      "priceCurrency": "USD",
      "availability": product.stock > 0 
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock"
    },
    "brand": {
      "@type": "Brand",
      "name": "Taste of Gratitude"
    }
  };
}