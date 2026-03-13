const PLACEHOLDER_IMAGE_HINTS = [
  '/images/placeholder-product',
  '/images/sea-moss-default',
  'placeholder-product',
  'sea-moss-default',
  'product-photo-coming-soon',
  'default-product',
  'placeholder.svg',
  'default.svg'
];

const PLACEHOLDER_COPY_PATTERNS = [
  /premium\s+wildcrafted\s+sea\s+moss\s+product/i,
  /product\s+photo\s+coming\s+soon/i,
  /coming\s+soon/i,
  /lorem\s+ipsum/i,
  /tbd/i
];

const GENERIC_ADDRESS_TOKENS = new Set([
  'street',
  'st',
  'road',
  'rd',
  'avenue',
  'ave',
  'drive',
  'dr',
  'lane',
  'ln',
  'way',
  'suite',
  'unit',
  'floor',
  'market',
  'farmers',
  'community',
  'center',
  'recreation'
]);

const MIN_DESCRIPTION_LENGTH = 18;

export const PRODUCT_IMAGE_FALLBACK_SRC = '/images/product-image-unavailable.svg';

function cleanString(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

export function normalizeIntegrityText(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  const normalized = normalizeIntegrityText(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(' ')
    .map(token => token.trim())
    .filter(Boolean);
}

function slugifyProductName(value) {
  return normalizeIntegrityText(value).replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
}

export function isPlaceholderLikeImage(imageUrl) {
  const normalized = normalizeIntegrityText(imageUrl);
  if (!normalized) {
    return true;
  }

  if (normalized.startsWith('data')) {
    return true;
  }

  return PLACEHOLDER_IMAGE_HINTS.some((hint) => {
    const normalizedHint = normalizeIntegrityText(hint);
    return normalizedHint ? normalized.includes(normalizedHint) : false;
  });
}

export function isLikelyImageReference(imageUrl) {
  const candidate = cleanString(imageUrl);
  if (!candidate) {
    return false;
  }

  if (candidate.startsWith('/')) {
    return true;
  }

  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function collectProductImageCandidates(product) {
  const rawCandidates = [
    product?.image,
    ...(Array.isArray(product?.images) ? product.images : [])
  ];

  const collected = [];
  for (const entry of rawCandidates) {
    const value = typeof entry === 'string'
      ? entry
      : entry && typeof entry === 'object' && typeof entry.url === 'string'
        ? entry.url
        : '';

    const cleaned = cleanString(value);
    if (!cleaned || collected.includes(cleaned)) {
      continue;
    }

    collected.push(cleaned);
  }

  return collected;
}

export function getCanonicalProductImage(product) {
  const candidates = collectProductImageCandidates(product);
  return candidates.find(candidate => isLikelyImageReference(candidate) && !isPlaceholderLikeImage(candidate)) || '';
}

export function isPlaceholderPhoneNumber(value) {
  const text = cleanString(value);
  if (!text) {
    return false;
  }

  const digits = text.replace(/\D/g, '');
  if (digits.includes('555')) {
    return true;
  }

  return /moss|placeholder|example/i.test(text);
}

function normalizeProductIngredients(product) {
  if (!Array.isArray(product?.ingredients)) {
    return [];
  }

  return product.ingredients
    .map((ingredient) => {
      if (typeof ingredient === 'string') {
        const cleaned = cleanString(ingredient);
        return cleaned || null;
      }

      if (ingredient && typeof ingredient === 'object') {
        const name = cleanString(ingredient.name);
        if (!name) {
          return null;
        }

        return {
          ...ingredient,
          name,
          benefits: Array.isArray(ingredient.benefits)
            ? ingredient.benefits.map(cleanString).filter(Boolean)
            : []
        };
      }

      return null;
    })
    .filter(Boolean);
}

function normalizeProductBenefits(product) {
  const candidates = Array.isArray(product?.benefits)
    ? product.benefits
    : Array.isArray(product?.healthBenefitLabels)
      ? product.healthBenefitLabels
      : [];

  return candidates
    .map(cleanString)
    .filter(Boolean);
}

function looksLikePlaceholderCopy(value) {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return false;
  }

  return PLACEHOLDER_COPY_PATTERNS.some(pattern => pattern.test(cleaned));
}

function hasPositiveVariantPrice(product) {
  if (!Array.isArray(product?.variations)) {
    return false;
  }

  return product.variations.some((variation) => Number(variation?.price || 0) > 0);
}

function getCanonicalDescription(product) {
  const description = cleanString(product?.description);
  if (description && !looksLikePlaceholderCopy(description)) {
    return description;
  }

  return '';
}

function getCanonicalBenefitStory(product) {
  const benefitStory = cleanString(product?.benefitStory);
  if (benefitStory && !looksLikePlaceholderCopy(benefitStory)) {
    return benefitStory;
  }

  return '';
}

function normalizeProductIdentity(product) {
  const name = cleanString(product?.name);
  const id = cleanString(product?.id || product?.productId || product?.squareId);
  const derivedSlug = cleanString(product?.slug) || slugifyProductName(name);

  return {
    id,
    name,
    slug: derivedSlug
  };
}

function normalizeProductPrice(product) {
  const productPrice = Number(product?.price || 0);
  if (productPrice > 0) {
    return productPrice;
  }

  if (Array.isArray(product?.variations)) {
    const pricedVariation = product.variations.find((variation) => Number(variation?.price || 0) > 0);
    if (pricedVariation) {
      return Number(pricedVariation.price);
    }
  }

  return 0;
}

export function normalizeStorefrontProduct(product) {
  const identity = normalizeProductIdentity(product);
  const description = getCanonicalDescription(product);
  const benefitStory = getCanonicalBenefitStory(product);
  const ingredients = normalizeProductIngredients(product);
  const benefits = normalizeProductBenefits(product);
  const canonicalImage = getCanonicalProductImage(product);
  const imageCandidates = collectProductImageCandidates(product)
    .filter(candidate => isLikelyImageReference(candidate) && !isPlaceholderLikeImage(candidate));

  const images = canonicalImage
    ? [canonicalImage, ...imageCandidates.filter(candidate => candidate !== canonicalImage)]
    : imageCandidates;

  const price = normalizeProductPrice(product);

  return {
    ...product,
    id: identity.id,
    name: identity.name,
    slug: identity.slug,
    description,
    benefitStory,
    ingredients,
    benefits,
    image: canonicalImage,
    images,
    price
  };
}

export function validateStorefrontProduct(product, options = {}) {
  const normalizedProduct = normalizeStorefrontProduct(product);
  const errors = [];
  const warnings = [];

  if (!normalizedProduct.id) {
    errors.push('Missing product id');
  }

  if (!normalizedProduct.slug) {
    errors.push('Missing product slug');
  }

  if (!normalizedProduct.name) {
    errors.push('Missing product name');
  }

  if (!normalizedProduct.description || normalizedProduct.description.length < MIN_DESCRIPTION_LENGTH) {
    errors.push('Missing explicit product description');
  }

  if (!normalizedProduct.benefitStory || normalizedProduct.benefitStory.length < MIN_DESCRIPTION_LENGTH) {
    errors.push('Missing explicit product benefit story');
  }

  if (!normalizedProduct.image) {
    errors.push('Missing canonical product image');
  }

  if (normalizedProduct.ingredients.length === 0) {
    errors.push('Missing canonical ingredients');
  }

  if (!hasPositiveVariantPrice(normalizedProduct) && normalizedProduct.price <= 0) {
    errors.push('Missing positive product price');
  }

  if (normalizedProduct.benefits.length === 0) {
    warnings.push('Missing product benefits labels');
  }

  const rawDescription = cleanString(product?.description);
  const rawBenefitStory = cleanString(product?.benefitStory);
  if (rawDescription && rawBenefitStory && rawDescription === rawBenefitStory) {
    warnings.push('Description and benefit story are duplicated');
  }

  if (isPlaceholderLikeImage(product?.image)) {
    warnings.push('Primary image references a placeholder asset');
  }

  if (options.allowMissingBenefitStory === true && errors.includes('Missing explicit product benefit story')) {
    const filteredErrors = errors.filter(error => error !== 'Missing explicit product benefit story');
    return {
      productId: normalizedProduct.id || normalizedProduct.slug || cleanString(product?.name) || 'unknown-product',
      productName: normalizedProduct.name || cleanString(product?.name) || 'Unknown Product',
      errors: filteredErrors,
      warnings,
      normalizedProduct,
      isValid: filteredErrors.length === 0
    };
  }

  return {
    productId: normalizedProduct.id || normalizedProduct.slug || cleanString(product?.name) || 'unknown-product',
    productName: normalizedProduct.name || cleanString(product?.name) || 'Unknown Product',
    errors,
    warnings,
    normalizedProduct,
    isValid: errors.length === 0
  };
}

export function validateStorefrontProducts(products, options = {}) {
  const safeProducts = Array.isArray(products) ? products : [];
  const reports = safeProducts.map(product => validateStorefrontProduct(product, options));
  const validReports = reports.filter(report => report.isValid);
  const invalidReports = reports.filter(report => !report.isValid);

  return {
    reports,
    validReports,
    invalidReports,
    validProducts: validReports.map(report => report.normalizedProduct)
  };
}

export function buildMarketAddressLine(market) {
  return [
    cleanString(market?.address),
    cleanString(market?.city),
    cleanString(market?.state),
    cleanString(market?.zip)
  ].filter(Boolean).join(', ');
}

function decodeMapFragment(value) {
  if (!value) {
    return '';
  }

  try {
    return decodeURIComponent(String(value).replace(/\+/g, ' '));
  } catch {
    return String(value).replace(/\+/g, ' ');
  }
}

function extractMapsTargetText(mapsUrl) {
  const rawUrl = cleanString(mapsUrl);
  if (!rawUrl) {
    return '';
  }

  try {
    const parsed = new URL(rawUrl);
    const params = parsed.searchParams;
    const collected = [
      params.get('q'),
      params.get('query'),
      params.get('destination'),
      params.get('daddr'),
      params.get('ll'),
      parsed.pathname
    ].filter(Boolean).map(decodeMapFragment);

    return collected.join(' ').trim();
  } catch {
    return decodeMapFragment(rawUrl);
  }
}

export function getCanonicalMarketDirectionsUrl(market) {
  const addressLine = buildMarketAddressLine(market);
  const query = cleanString(addressLine || market?.name);
  if (!query) {
    return '';
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function validateMarketDirectionsConsistency(market) {
  const errors = [];
  const warnings = [];
  const addressLine = buildMarketAddressLine(market);
  const mapsUrl = cleanString(market?.mapsUrl);

  if (!addressLine) {
    errors.push('Missing canonical market address');
  }

  if (!mapsUrl) {
    errors.push('Missing market directions URL');
  }

  let mapsTargetText = '';
  if (mapsUrl) {
    mapsTargetText = extractMapsTargetText(mapsUrl);

    if (!mapsTargetText) {
      errors.push('Directions URL is present but has no location target');
    }
  }

  if (mapsTargetText && addressLine) {
    const targetTokens = new Set(tokenize(mapsTargetText));
    const cityToken = tokenize(market?.city).find(Boolean);
    const zipToken = cleanString(market?.zip).replace(/\s+/g, '').toLowerCase();
    const streetTokens = tokenize(market?.address)
      .filter(token => token.length >= 4)
      .filter(token => !GENERIC_ADDRESS_TOKENS.has(token));

    const hasCity = cityToken ? targetTokens.has(cityToken) : true;
    const hasStreetToken = streetTokens.length > 0
      ? streetTokens.some(token => targetTokens.has(token))
      : true;
    const hasZip = zipToken ? targetTokens.has(zipToken) : true;

    if (!hasCity) {
      errors.push('Directions URL does not match market city');
    }

    if (!hasStreetToken && !hasZip) {
      errors.push('Directions URL does not match market street/zip');
    }

    if (!hasZip && streetTokens.length > 0) {
      warnings.push('Directions URL is missing ZIP token; relying on street match only');
    }
  }

  if (isPlaceholderPhoneNumber(market?.phone)) {
    errors.push('Market phone uses placeholder digits');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    expectedAddress: addressLine,
    canonicalDirectionsUrl: getCanonicalMarketDirectionsUrl(market)
  };
}
