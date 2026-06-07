const CATEGORY_DEFINITIONS = [
  {
    id: 'sea moss gels',
    label: 'Sea Moss Gels',
    icon: '🌊',
    sortOrder: 1,
    aliases: ['sea moss gels', 'sea moss gel', 'gels', 'gel']
  },
  {
    id: 'lemonades and juices',
    label: 'Lemonades & Juices',
    icon: '🍋',
    sortOrder: 2,
    aliases: ['lemonades and juices', 'lemonades juices', 'lemonades', 'lemonade', 'juices', 'juice']
  },
  {
    id: 'wellness shots',
    label: 'Wellness Shots',
    icon: '⚡',
    sortOrder: 3,
    aliases: ['wellness shots', 'wellness shot', 'shots', 'shot']
  },
  {
    id: 'herbal blends and teas',
    label: 'Herbal Blends & Teas',
    icon: '🪷',
    sortOrder: 4,
    aliases: ['herbal blends and teas', 'herbal blends', 'herbal blend', 'teas', 'tea']
  },
  {
    id: 'bundles and seasonal',
    label: 'Bundles & Seasonal',
    icon: '🎁',
    sortOrder: 5,
    aliases: ['bundles and seasonal', 'bundles seasonal', 'bundles', 'bundle', 'seasonal']
  }
];

export const CATEGORY_ALIAS_MAP = CATEGORY_DEFINITIONS.reduce((acc, category) => {
  acc[category.id] = category.aliases;
  return acc;
}, {});

export const CATEGORY_LABEL_MAP = CATEGORY_DEFINITIONS.reduce((acc, category) => {
  acc[category.id] = category.label;
  return acc;
}, {});

const CATEGORY_META_BY_ID = CATEGORY_DEFINITIONS.reduce((acc, category) => {
  acc[category.id] = category;
  return acc;
}, {});

const SEARCH_SYNONYMS = {
  energy: ['energize', 'energizing', 'stamina', 'focus', 'maca', 'ginger', 'shot'],
  energize: ['energy', 'energizing', 'stamina', 'focus'],
  immunity: ['immune', 'elderberry', 'ginger', 'turmeric', 'vitamin c', 'support'],
  immune: ['immunity', 'elderberry', 'ginger', 'turmeric', 'support'],
  ginger: ['ginger', 'spice', 'spicy', 'immunity', 'digestive'],
  strawberry: ['strawberry', 'berry', 'berries'],
  detox: ['cleanse', 'reset', 'green', 'chlorophyll', 'sea moss', 'alkaline'],
  cleanse: ['detox', 'reset', 'green', 'chlorophyll'],
  blue: ['blue', 'blueberry', 'blue spirulina', 'spirulina'],
  glow: ['golden', 'beauty', 'skin', 'radiance'],
  inflammation: ['anti inflammatory', 'turmeric', 'ginger', 'recovery'],
  digestion: ['digestive', 'gut', 'ginger', 'sea moss'],
};

export function normalizeStorefrontText(value) {
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

function getTokenDistance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return Number.POSITIVE_INFINITY;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function getExpandedSearchGroups(query) {
  const normalized = normalizeStorefrontText(query);
  const tokens = normalized.split(' ').filter(Boolean);

  return tokens.map((token) => Array.from(new Set([
    token,
    ...(SEARCH_SYNONYMS[token] || []).map(normalizeStorefrontText),
  ].filter(Boolean))));
}

function tokenOrPhraseMatchesText(term, searchableText, searchableTokens) {
  if (!term) return false;
  if (searchableText.includes(term)) return true;

  const termTokens = term.split(' ').filter(Boolean);
  if (termTokens.length > 1) {
    return termTokens.every((token) => tokenOrPhraseMatchesText(token, searchableText, searchableTokens));
  }

  if (term.length < 4) return false;

  return searchableTokens.some((token) => {
    if (token.includes(term) || term.includes(token)) return true;
    const threshold = term.length >= 7 ? 2 : 1;
    return getTokenDistance(term, token) <= threshold;
  });
}

export function resolveCategoryAlias(value) {
  const normalized = normalizeStorefrontText(value);
  if (!normalized || normalized === 'all') {
    return 'all';
  }

  const direct = CATEGORY_META_BY_ID[normalized];
  if (direct) {
    return direct.id;
  }

  for (const [canonical, aliases] of Object.entries(CATEGORY_ALIAS_MAP)) {
    if (aliases.includes(normalized)) {
      return canonical;
    }
  }

  return normalized;
}

export function getCategoryMetaById(categoryId) {
  const canonicalId = resolveCategoryAlias(categoryId);
  return CATEGORY_META_BY_ID[canonicalId] || null;
}

export function getCategoryLabelById(categoryId, fallback = 'Wellness Collection') {
  if (!categoryId || categoryId === 'all') {
    return fallback;
  }

  const meta = getCategoryMetaById(categoryId);
  if (meta?.label) {
    return meta.label;
  }

  const normalized = normalizeStorefrontText(categoryId);
  if (!normalized) {
    return fallback;
  }

  return normalized
    .split(' ')
    .map(word => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : ''))
    .join(' ')
    .trim() || fallback;
}

export function getCategorySortOrder(categoryId) {
  const meta = getCategoryMetaById(categoryId);
  return meta?.sortOrder || 999;
}

export function getCanonicalProductCategoryId(product) {
  const value =
    product?.intelligentCategory ||
    product?.categoryData?.name ||
    product?.category;

  const resolved = resolveCategoryAlias(value);
  return resolved === 'all' ? '' : resolved;
}

export function getCanonicalProductCategoryLabel(product, fallback = 'Wellness Collection') {
  return getCategoryLabelById(getCanonicalProductCategoryId(product), fallback);
}

export function getCanonicalProductCategoryIcon(product, fallback = '📦') {
  const meta = getCategoryMetaById(getCanonicalProductCategoryId(product));
  return meta?.icon || fallback;
}

export function getProductCategoryAliases(product) {
  return Array.from(new Set([
    product?.intelligentCategory,
    product?.categoryData?.name,
    product?.category
  ]
    .map(resolveCategoryAlias)
    .filter(Boolean)
    .filter(value => value !== 'all')));
}

export function productMatchesCategory(product, selectedCategory) {
  const target = resolveCategoryAlias(selectedCategory || 'all');
  if (!target || target === 'all') {
    return true;
  }

  return getProductCategoryAliases(product).includes(target);
}

export function getProductSearchText(product) {
  const ingredientSegments = (product?.ingredients || []).flatMap((ingredient) => {
    if (typeof ingredient === 'string') {
      return [ingredient];
    }

    if (ingredient && typeof ingredient === 'object') {
      return [ingredient.name, ...(ingredient.benefits || [])].filter(Boolean);
    }

    return [];
  });

  return normalizeStorefrontText([
    product?.name,
    product?.description,
    product?.benefitStory,
    product?.intelligentCategory,
    product?.categoryData?.name,
    product?.category,
    ...(product?.benefits || []),
    ...(product?.healthBenefitLabels || []),
    ...ingredientSegments
  ].filter(Boolean).join(' '));
}

export function productMatchesSearchQuery(product, query) {
  const normalizedSearchTerm = normalizeStorefrontText(query);
  if (normalizedSearchTerm.length < 2) {
    return true;
  }

  const searchableText = getProductSearchText(product);
  if (!searchableText) {
    return false;
  }

  if (searchableText.includes(normalizedSearchTerm)) {
    return true;
  }

  const searchableTokens = searchableText.split(' ').filter(Boolean);
  const groups = getExpandedSearchGroups(normalizedSearchTerm);
  return groups.every((group) => group.some((term) => tokenOrPhraseMatchesText(term, searchableText, searchableTokens)));
}

export function getProductSearchRelevanceScore(product, query) {
  const normalizedSearchTerm = normalizeStorefrontText(query);
  if (normalizedSearchTerm.length < 2) {
    return 0;
  }

  const searchableText = getProductSearchText(product);
  const productName = normalizeStorefrontText(product?.name || '');
  const searchableTokens = searchableText.split(' ').filter(Boolean);
  let score = 0;

  if (productName === normalizedSearchTerm) score += 120;
  if (productName.startsWith(normalizedSearchTerm)) score += 80;
  if (productName.includes(normalizedSearchTerm)) score += 50;
  if (searchableText.includes(normalizedSearchTerm)) score += 35;

  getExpandedSearchGroups(normalizedSearchTerm).forEach((group) => {
    const directToken = group[0];
    if (tokenOrPhraseMatchesText(directToken, productName, productName.split(' ').filter(Boolean))) {
      score += 20;
      return;
    }

    if (group.some((term) => tokenOrPhraseMatchesText(term, searchableText, searchableTokens))) {
      score += 8;
    }
  });

  return score;
}

export function buildCatalogRoute({ search = '', category = 'all', basePath = '/catalog' } = {}) {
  const params = new URLSearchParams();
  const normalizedSearch = (search || '').trim();
  const normalizedCategory = resolveCategoryAlias(category || 'all');

  if (normalizedSearch.length >= 2) {
    params.set('search', normalizedSearch);
  }

  if (normalizedCategory && normalizedCategory !== 'all') {
    params.set('category', normalizedCategory);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
