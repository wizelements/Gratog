/**
 * Product Enhancement Utilities
 * - Image prioritization
 * - Beautiful placeholder generation
 * - Product sorting
 */

/**
 * Generate beautiful SVG placeholder for products without images
 */
export function generateProductPlaceholder(product) {
  const categoryColors = {
    'Sea Moss Gels': { primary: '#059669', secondary: '#10b981', accent: '#6ee7b7' },
    'Sea Moss Ginger Lemonades': { primary: '#0891b2', secondary: '#06b6d4', accent: '#67e8f9' },
    'Juice': { primary: '#7c3aed', secondary: '#8b5cf6', accent: '#c4b5fd' },
    'Shots': { primary: '#ea580c', secondary: '#f97316', accent: '#fb923c' },
    'Freebies': { primary: '#d97706', secondary: '#f59e0b', accent: '#fbbf24' },
    'default': { primary: '#059669', secondary: '#10b981', accent: '#6ee7b7' }
  };

  const colors = categoryColors[product.intelligentCategory || product.category] || categoryColors.default;
  
  // Create descriptive text
  const displayName = product.name.length > 30 
    ? product.name.substring(0, 30) + '...' 
    : product.name;
  
  const minerals = product.tags?.includes('92 minerals') || product.benefitStory?.includes('92') ? '92 Minerals' : 'Premium';
  
  return `data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:${colors.primary};stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:${colors.secondary};stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23grad)'/%3E%3Ccircle cx='200' cy='150' r='60' fill='${colors.accent}' opacity='0.3'/%3E%3Ccircle cx='150' cy='200' r='40' fill='${colors.accent}' opacity='0.2'/%3E%3Ccircle cx='250' cy='220' r='50' fill='${colors.accent}' opacity='0.25'/%3E%3Cpath d='M 200 120 Q 220 100 200 80 Q 180 100 200 120 M 190 130 Q 200 140 210 130 M 180 145 Q 200 170 220 145' stroke='white' stroke-width='3' fill='none' opacity='0.6'/%3E%3Ctext x='200' y='280' font-family='Arial, sans-serif' font-size='20' font-weight='bold' fill='white' text-anchor='middle'%3E${encodeURIComponent(displayName)}%3C/text%3E%3Ctext x='200' y='310' font-family='Arial, sans-serif' font-size='16' fill='white' text-anchor='middle' opacity='0.9'%3E${minerals}%3C/text%3E%3C/svg%3E`;
}

/**
 * Check if a product has a real image (not a placeholder or data URI)
 */
export function hasRealImage(product) {
  const image = product.image || product.images?.[0];
  if (!image) return false;
  if (typeof image !== 'string') return false;
  
  // Exclude data URIs (placeholders) and empty strings
  if (image.startsWith('data:')) return false;
  if (image.trim() === '') return false;
  
  // Must be a real URL
  return image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/');
}

/**
 * Sort products with real images first, then by category and name
 */
export function sortProductsByImagePriority(products) {
  return [...products].sort((a, b) => {
    // Products with REAL images come first (not placeholders)
    const aHasRealImage = hasRealImage(a);
    const bHasRealImage = hasRealImage(b);
    
    if (aHasRealImage && !bHasRealImage) return -1;
    if (!aHasRealImage && bHasRealImage) return 1;
    
    // Within same image status, sort by in-stock first
    const aInStock = a.inStock !== false;
    const bInStock = b.inStock !== false;
    
    if (aInStock && !bInStock) return -1;
    if (!aInStock && bInStock) return 1;
    
    // Then by category
    const categoryOrder = {
      'Sea Moss Gels': 1,
      'Lemonades & Juices': 2,
      'Wellness Shots': 3,
      'Herbal Blends & Teas': 4,
      'Bundles & Seasonal': 5
    };
    
    const aCat = categoryOrder[a.intelligentCategory] || 999;
    const bCat = categoryOrder[b.intelligentCategory] || 999;
    
    if (aCat !== bCat) return aCat - bCat;
    
    // Finally sort by name
    return (a.name || '').localeCompare(b.name || '');
  });
}

/**
 * Enhance product with placeholder if no image
 */
export function enhanceProductWithPlaceholder(product) {
  if (!product.image || product.image === null) {
    return {
      ...product,
      image: generateProductPlaceholder(product),
      isPlaceholder: true,
      originalImageMissing: true
    };
  }
  
  return {
    ...product,
    isPlaceholder: false,
    originalImageMissing: false
  };
}

/**
 * Process all products with enhancements
 */
export function enhanceProductCatalog(products) {
  // First enhance with placeholders
  const enhanced = products.map(enhanceProductWithPlaceholder);
  
  // Then sort by image priority
  return sortProductsByImagePriority(enhanced);
}
