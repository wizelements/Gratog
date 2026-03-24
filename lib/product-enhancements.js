/**
 * Product Enhancement Utilities
 * - Image prioritization
 * - Beautiful placeholder generation
 * - Product sorting
 */

import { getCanonicalProductCategoryId, getCategorySortOrder } from '@/lib/storefront-query';

const PLACEHOLDER_IMAGE_HINTS = [
  '/images/placeholder-product',
  '/images/sea-moss-default',
  'placeholder-product',
  'sea-moss-default',
  'placeholder.svg',
  'default.svg',
  'default-product'
];

function isPlaceholderLikeImage(image) {
  if (!image || typeof image !== 'string') {
    return true;
  }

  const normalized = image.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (normalized.startsWith('data:')) {
    return true;
  }

  return PLACEHOLDER_IMAGE_HINTS.some(hint => normalized.includes(hint));
}

function toImageCandidate(image) {
  if (typeof image === 'string') {
    return image;
  }

  if (image && typeof image === 'object' && typeof image.url === 'string') {
    return image.url;
  }

  return null;
}

function normalizeText(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toDisplayText(value, fallback = 'Wellness Product') {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  return value.trim() || fallback;
}

function truncateText(value, maxLength = 48) {
  if (!value || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getIngredientNames(product) {
  return (product?.ingredients || [])
    .map((ingredient) => {
      if (typeof ingredient === 'string') {
        return ingredient;
      }

      if (ingredient && typeof ingredient === 'object') {
        return ingredient.name;
      }

      return null;
    })
    .filter(Boolean)
    .map(value => toDisplayText(value, ''))
    .filter(Boolean);
}

function getCategoryLabel(product) {
  return toDisplayText(
    product?.intelligentCategory ||
    product?.categoryData?.name ||
    product?.category,
    'Wellness Collection'
  );
}

function getPrimaryBenefitLabel(product) {
  if (product?.primaryHealthBenefit?.label) {
    return toDisplayText(product.primaryHealthBenefit.label, '');
  }

  if (Array.isArray(product?.healthBenefitLabels) && product.healthBenefitLabels.length > 0) {
    return toDisplayText(product.healthBenefitLabels[0], '');
  }

  if (Array.isArray(product?.benefits) && product.benefits.length > 0) {
    return toDisplayText(product.benefits[0], '');
  }

  return '';
}

function getPlaceholderStyle(categoryLabel) {
  const category = normalizeText(categoryLabel);

  if (category.includes('gel')) {
    return { primary: '#065f46', secondary: '#10b981', accent: '#6ee7b7' };
  }

  if (category.includes('lemonade') || category.includes('juice')) {
    return { primary: '#0f766e', secondary: '#06b6d4', accent: '#67e8f9' };
  }

  if (category.includes('shot')) {
    return { primary: '#9a3412', secondary: '#f97316', accent: '#fdba74' };
  }

  if (category.includes('tea') || category.includes('herbal')) {
    return { primary: '#3730a3', secondary: '#6366f1', accent: '#a5b4fc' };
  }

  if (category.includes('boba') || category.includes('cream') || category.includes('taro') || category.includes('matcha')) {
    return { primary: '#581c87', secondary: '#a855f7', accent: '#d8b4fe' };
  }

  if (category.includes('bundle') || category.includes('seasonal')) {
    return { primary: '#7c2d12', secondary: '#d97706', accent: '#fcd34d' };
  }

  return { primary: '#14532d', secondary: '#22c55e', accent: '#86efac' };
}

export function getPreferredProductImage(product) {
  const candidates = [
    product?.image,
    ...(Array.isArray(product?.images) ? product.images : [])
  ]
    .map(toImageCandidate)
    .filter(Boolean);

  return candidates.find((candidate) => {
    if (typeof candidate !== 'string') {
      return false;
    }

    const trimmed = candidate.trim();
    if (!trimmed) {
      return false;
    }

    const isSupportedScheme =
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/');

    return isSupportedScheme && !isPlaceholderLikeImage(trimmed);
  }) || null;
}

/**
 * Generate beautiful SVG placeholder for products without images
 */
export function generateProductPlaceholder(product) {
  const productName = truncateText(toDisplayText(product?.name, 'Wellness Product'), 44);
  const categoryLabel = truncateText(getCategoryLabel(product), 34);
  const ingredientNames = getIngredientNames(product);
  const ingredientLine = ingredientNames.length > 0
    ? `Key ingredients: ${truncateText(ingredientNames.slice(0, 2).join(' + '), 42)}`
    : 'Key ingredients listed in product details';
  const benefitLine = getPrimaryBenefitLabel(product)
    ? `Wellness focus: ${truncateText(getPrimaryBenefitLabel(product), 34)}`
    : 'Wellness focus: Mineral-rich daily support';
  const colors = getPlaceholderStyle(categoryLabel);
  
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${escapeXml(productName)} placeholder image">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.primary}" />
      <stop offset="100%" stop-color="${colors.secondary}" />
    </linearGradient>
    <linearGradient id="panel" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.22)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.08)" />
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)" />
  <circle cx="1060" cy="140" r="180" fill="${colors.accent}" opacity="0.28" />
  <circle cx="140" cy="760" r="210" fill="${colors.accent}" opacity="0.2" />
  <rect x="86" y="76" width="1028" height="748" rx="34" fill="url(#panel)" stroke="rgba(255,255,255,0.24)" />

  <text x="120" y="170" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="white" opacity="0.95">${escapeXml(productName)}</text>
  <text x="120" y="220" font-family="Arial, sans-serif" font-size="25" fill="white" opacity="0.86">${escapeXml(categoryLabel)}</text>

  <line x1="120" y1="258" x2="1080" y2="258" stroke="rgba(255,255,255,0.28)" />

  <text x="120" y="332" font-family="Arial, sans-serif" font-size="24" fill="white" opacity="0.92">${escapeXml(ingredientLine)}</text>
  <text x="120" y="382" font-family="Arial, sans-serif" font-size="24" fill="white" opacity="0.92">${escapeXml(benefitLine)}</text>

  <text x="120" y="758" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="white" opacity="0.97">Product photo coming soon</text>
  <text x="120" y="794" font-family="Arial, sans-serif" font-size="21" fill="white" opacity="0.86">You can still explore full ingredients, benefits, and sizing on the product details page.</text>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/**
 * Check if a product has a real image (not a placeholder or data URI)
 */
export function hasRealImage(product) {
  return Boolean(getPreferredProductImage(product));
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
    
    // Then by normalized category order
    const aCat = getCategorySortOrder(getCanonicalProductCategoryId(a));
    const bCat = getCategorySortOrder(getCanonicalProductCategoryId(b));
    
    if (aCat !== bCat) return aCat - bCat;
    
    // Finally sort by name
    return (a.name || '').localeCompare(b.name || '');
  });
}

/**
 * Enhance product with placeholder if no image
 */
export function enhanceProductWithPlaceholder(product) {
  const preferredImage = getPreferredProductImage(product);

  if (!preferredImage) {
    return {
      ...product,
      image: generateProductPlaceholder(product),
      isPlaceholder: true,
      originalImageMissing: true
    };
  }
  
  return {
    ...product,
    image: preferredImage,
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
