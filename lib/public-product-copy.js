/**
 * Customer-facing copy filter. Source Square/Mongo records are never mutated here.
 * Remove unsupported health-claim sentences, not whole product descriptions.
 */
export const PUBLIC_PRODUCT_COPY_FALLBACK =
  'Small-batch Taste of Gratitude product. Ask us about ingredients and current availability.';

const CLAIM_PATTERNS = [
  /\b92\s+(?:essential\s+)?minerals?\b/i,
  /\b(?:thyroid(?:\s+(?:health|support|function|disease))?|anti[\s-]?inflammat(?:ory|ion)|inflammation)\b/i,
  /\b(?:boost(?:s|ed|ing)?|strengthen(?:s|ed|ing)?|improv(?:e|es|ed|ing))\s+(?:the\s+|your\s+)?(?:immunity|immune\s+(?:system|health))\b/i,
  /\b(?:supports?\s+(?:the\s+|your\s+)?(?:immune\s+(?:system|health)|thyroid\s+(?:health|function)))\b/i,
  /\b(?:detox(?:es|ed|ing|ify|ifies|ification)?|flush(?:es|ing)?\s+(?:out\s+)?toxins?|cleans(?:e|es|ing)\s+(?:your\s+|the\s+)?(?:body|liver|blood))\b/i,
  /\b(?:cure(?:s|d)?|heal(?:s|ed|ing)?|treat(?:s|ed|ing|ment)?|prevent(?:s|ed|ing)?)\s+(?:(?:the|your|a|any)\s+)?(?:disease|illness|arthritis|diabetes|cancer|infection|pain|inflammation|thyroid)\b/i,
  /\b(?:lower(?:s|ed|ing)?|regulat(?:e|es|ed|ing)|balanc(?:e|es|ed|ing))\s+(?:your\s+|the\s+)?(?:blood\s+(?:pressure|sugar)|hormones?)\b/i,
];

export function containsUnsupportedProductClaim(value) {
  return typeof value === 'string' && CLAIM_PATTERNS.some(pattern => pattern.test(value));
}

export function sanitizePublicProductCopy(value, fallback = PUBLIC_PRODUCT_COPY_FALLBACK) {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  // Square can provide plaintext or minimal HTML. Boundaries become sentences.
  const plain = value.replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|li|div)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ');
  const pieces = plain.split(/(?<=[.!?;])\s+|\r?\n+/g);
  const clean = pieces
    .map(piece => piece.trim())
    .filter(piece => piece && !containsUnsupportedProductClaim(piece))
    .join(' ')
    .trim();
  return clean || fallback;
}

/**
 * Sanitize only outward-facing copy, never pricing, stock, IDs or sellability.
 */
export function sanitizePublicProduct(product) {
  if (!product || typeof product !== 'object' || Array.isArray(product)) return product;
  const cleaned = { ...product };
  const copyFields = [
    'description', 'shortDescription', 'fullDescription', 'seoDescription',
    'productStory', 'story', 'flavorNotes', 'tastingNotes', 'flavorProfile',
    'howToUse', 'usageInstructions', 'intendedUse', 'recommendedUse',
    'storageInstructions', 'careInstructions', 'tagline', 'customerQuote', 'testimonial',
  ];
  for (const key of copyFields) {
    if (typeof cleaned[key] === 'string') {
      cleaned[key] = sanitizePublicProductCopy(cleaned[key], '');
    }
  }
  for (const key of ['benefits', 'healthBenefits', 'wellnessSupport', 'highlights']) {
    if (Array.isArray(cleaned[key])) {
      cleaned[key] = cleaned[key].filter(value => {
        if (typeof value === 'string') return !containsUnsupportedProductClaim(value);
        if (value && typeof value === 'object') {
          return !['title', 'label', 'name', 'description', 'text', 'benefit']
            .some(field => containsUnsupportedProductClaim(value[field]));
        }
        return true;
      });
    }
  }
  if (Array.isArray(cleaned.ingredients)) {
    cleaned.ingredients = cleaned.ingredients.map(ingredient =>
      ingredient && typeof ingredient === 'object'
        ? {
            ...ingredient,
            description: sanitizePublicProductCopy(ingredient.description, ''),
            notes: sanitizePublicProductCopy(ingredient.notes, ''),
          }
        : ingredient
    );
  }
  return cleaned;
}

export function sanitizePublicProducts(products) {
  return Array.isArray(products) ? products.map(sanitizePublicProduct) : products;
}
