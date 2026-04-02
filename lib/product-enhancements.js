/**
 * Product Enhancement Utilities
 * - Image prioritization
 * - Intelligent media metadata + placeholder generation
 * - Product sorting
 */

import { getCanonicalProductCategoryId, getCategorySortOrder } from '@/lib/storefront-query';
import {
  collectProductImageCandidates,
  getCanonicalProductImage,
  isLikelyImageReference,
  isPlaceholderLikeImage
} from '@/lib/storefront-integrity';

const DEFAULT_PRODUCT_NAME = 'Wellness Product';
const DEFAULT_INGREDIENT_COPY = 'wildcrafted sea moss and botanicals';
const DEFAULT_BENEFIT_COPY = 'daily mineral-rich support';

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

function getNarrativeSegments(product) {
  const unique = [];

  [product?.description, product?.benefitStory].forEach((value) => {
    const cleaned = toDisplayText(value, '');
    const key = normalizeText(cleaned);

    if (!cleaned || !key || unique.some((entry) => normalizeText(entry) === key)) {
      return;
    }

    unique.push(cleaned);
  });

  return unique;
}

function getBenefitLabels(product) {
  const labels = [
    product?.primaryHealthBenefit?.label,
    ...(Array.isArray(product?.healthBenefitLabels) ? product.healthBenefitLabels : []),
    ...(Array.isArray(product?.benefits) ? product.benefits : [])
  ]
    .map((value) => toDisplayText(value, ''))
    .filter(Boolean);

  return labels.filter((label, index) => {
    const normalized = normalizeText(label);
    return normalized && labels.findIndex((candidate) => normalizeText(candidate) === normalized) === index;
  });
}

function getCategoryLabel(product) {
  return toDisplayText(
    product?.intelligentCategory ||
    product?.categoryData?.name ||
    product?.category,
    'Wellness Collection'
  );
}

function joinWithAnd(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return '';
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function wrapText(value, maxLength = 54, maxLines = 3) {
  const cleaned = toDisplayText(value, '');
  if (!cleaned) {
    return [];
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    if (lines.length === maxLines) {
      return;
    }

    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= maxLength) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = truncateText(lines[maxLines - 1], Math.max(16, maxLength - 3));
  }

  return lines;
}

function getRealProductImages(product) {
  return collectProductImageCandidates(product)
    .filter((candidate) => isLikelyImageReference(candidate) && !isPlaceholderLikeImage(candidate));
}

function buildProductMediaProfile(product) {
  const productName = toDisplayText(product?.name, DEFAULT_PRODUCT_NAME);
  const categoryLabel = getCategoryLabel(product);
  const ingredientNames = getIngredientNames(product);
  const benefitLabels = getBenefitLabels(product);
  const ingredientPhrase = joinWithAnd(ingredientNames.slice(0, 3)) || DEFAULT_INGREDIENT_COPY;
  const benefitPhrase = joinWithAnd(benefitLabels.slice(0, 2)) || DEFAULT_BENEFIT_COPY;
  const narrativeSegments = getNarrativeSegments(product);
  const primaryNarrative = narrativeSegments[0] || `${productName} is crafted with ${ingredientPhrase} for ${benefitPhrase}.`;
  const secondaryNarrative = narrativeSegments[1] || '';
  const imageAlt = truncateText(
    `${productName}${ingredientNames.length > 0 ? ` with ${ingredientPhrase}` : ''}${benefitLabels.length > 0 ? ` for ${benefitPhrase}` : ''}`,
    140
  );
  const imageDescription = [
    primaryNarrative,
    secondaryNarrative,
    ingredientNames.length > 0 ? `Key ingredients: ${ingredientPhrase}.` : '',
    benefitLabels.length > 0 ? `Wellness focus: ${benefitPhrase}.` : ''
  ].filter(Boolean).join(' ');

  return {
    productName,
    categoryLabel,
    imageAlt,
    imageDescription,
    primaryNarrative,
    secondaryNarrative,
    storyLines: wrapText(primaryNarrative, 56, 3),
    ingredientLine: ingredientNames.length > 0
      ? `Crafted with ${truncateText(ingredientPhrase, 58)}`
      : 'Crafted with premium wellness ingredients',
    benefitLine: benefitLabels.length > 0
      ? `Wellness focus: ${truncateText(benefitPhrase, 54)}`
      : `Wellness focus: ${DEFAULT_BENEFIT_COPY}`,
    footerLine: secondaryNarrative
      ? truncateText(secondaryNarrative, 82)
      : 'Explore ingredients, sizing, and wellness details on the product page.'
  };
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

  if (category.includes('boba') || category.includes('taro') || category.includes('matcha')) {
    return { primary: '#581c87', secondary: '#a855f7', accent: '#d8b4fe' };
  }

  if (category.includes('bundle') || category.includes('seasonal')) {
    return { primary: '#7c2d12', secondary: '#d97706', accent: '#fcd34d' };
  }

  return { primary: '#14532d', secondary: '#22c55e', accent: '#86efac' };
}

export function getPreferredProductImage(product) {
  return getCanonicalProductImage(product) || null;
}

/**
 * Generate beautiful SVG placeholder for products without images
 */
export function generateProductPlaceholder(product) {
  const media = buildProductMediaProfile(product);
  const productName = truncateText(media.productName, 44);
  const categoryLabel = truncateText(media.categoryLabel, 34);
  const colors = getPlaceholderStyle(categoryLabel);
  const storyLines = media.storyLines.length > 0 ? media.storyLines : ['Product details are being prepared.'];
  const storyMarkup = storyLines.map((line, index) => `
  <text x="120" y="${332 + (index * 46)}" font-family="Arial, sans-serif" font-size="28" fill="white" opacity="0.94">${escapeXml(line)}</text>`).join('');
  
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

  ${storyMarkup}
  <text x="120" y="500" font-family="Arial, sans-serif" font-size="24" fill="white" opacity="0.92">${escapeXml(media.ingredientLine)}</text>
  <text x="120" y="548" font-family="Arial, sans-serif" font-size="24" fill="white" opacity="0.92">${escapeXml(media.benefitLine)}</text>

  <text x="120" y="758" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="white" opacity="0.97">Product photo coming soon</text>
  <text x="120" y="794" font-family="Arial, sans-serif" font-size="21" fill="white" opacity="0.86">${escapeXml(media.footerLine)}</text>
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
  const preferredImage = getPreferredProductImage(product) || '';
  const canonicalImages = getRealProductImages(product);
  const media = buildProductMediaProfile(product);
  const placeholderImage = preferredImage ? '' : generateProductPlaceholder(product);
  const displayImage = preferredImage || placeholderImage;

  return {
    ...product,
    image: preferredImage,
    images: canonicalImages,
    displayImage,
    placeholderImage,
    imageAlt: media.imageAlt,
    imageDescription: media.imageDescription,
    isPlaceholder: !preferredImage,
    originalImageMissing: !preferredImage
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
