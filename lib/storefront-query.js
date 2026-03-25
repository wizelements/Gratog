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
    id: 'boba and cream',
    label: 'Boba',
    icon: '🧋',
    sortOrder: 5,
    aliases: ['boba and cream', 'boba cream', 'boba', 'cream', 'milk tea', 'taro'],
    marketExclusive: true
  },
  {
    id: 'bundles and seasonal',
    label: 'Bundles & Seasonal',
    icon: '🎁',
    sortOrder: 6,
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
