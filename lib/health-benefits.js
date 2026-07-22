/**
 * Product-preference discovery taxonomy.
 *
 * This module maps ingredients and keywords to flavor/format dimensions
 * (e.g. berry-forward, ginger-forward, hydrating) so customers can explore
 * products without implying physiological outcomes.
 *
 * Internal keys are flavor/format labels, not health conditions.
 */

const DIRECT_INGREDIENT_SIGNAL_WEIGHT = 3;
const KEYWORD_SIGNAL_WEIGHT = 1;
const MINIMUM_MATCH_SCORE = 2;

const INGREDIENT_PREFERENCE_SIGNALS = {
  'sea moss': ['sea_moss_base', 'berry_elderberry', 'ginger_greens', 'hydrating'],
  'elderberry': ['berry_elderberry'],
  'echinacea': ['berry_elderberry'],
  'soursop': ['berry_elderberry', 'warm_comforting'],
  'ginger': ['ginger_greens', 'warm_comforting', 'berry_elderberry'],
  'turmeric': ['warm_comforting', 'berry_elderberry', 'hibiscus_tart'],
  'cinnamon': ['bold_spiced', 'ginger_greens', 'warm_comforting'],
  'star anise': ['ginger_greens', 'berry_elderberry'],
  'ashwagandha': ['calm_botanicals', 'bold_spiced'],
  'maca root': ['bold_spiced', 'calm_botanicals'],
  'horny goat weed': ['bold_spiced'],
  'blue spirulina': ['bold_spiced', 'light_fresh', 'berry_elderberry'],
  'spirulina': ['bold_spiced', 'light_fresh', 'berry_elderberry'],
  'chlorella': ['light_fresh', 'berry_elderberry', 'ginger_greens'],
  'chlorophyll': ['light_fresh', 'hydrating', 'floral_glow'],
  'holy basil': ['calm_botanicals', 'berry_elderberry'],
  'basil': ['calm_botanicals', 'ginger_greens'],
  'oregano': ['berry_elderberry', 'ginger_greens'],
  'hibiscus': ['hibiscus_tart', 'hydrating', 'warm_comforting'],
  'cranberry': ['berry_elderberry', 'hibiscus_tart', 'hydrating'],
  'grapefruit': ['light_fresh', 'hibiscus_tart', 'hydrating'],
  'orange': ['berry_elderberry', 'hydrating'],
  'lemon': ['light_fresh', 'berry_elderberry', 'hydrating'],
  'lime': ['light_fresh', 'berry_elderberry', 'hydrating'],
  'chia seeds': ['hydrating', 'bold_spiced', 'ginger_greens'],
  'cayenne': ['bold_spiced', 'hibiscus_tart', 'warm_comforting'],
  'bee pollen': ['bold_spiced', 'berry_elderberry'],
  'agave': ['bold_spiced'],
  'local honey': ['berry_elderberry', 'bold_spiced'],
  'pineapple': ['ginger_greens', 'warm_comforting', 'hydrating'],
  'mango': ['berry_elderberry', 'hydrating'],
  'apple': ['ginger_greens', 'hibiscus_tart', 'hydrating'],
  'mint': ['ginger_greens', 'hydrating'],
  'yellow watermelon': ['hydrating', 'hibiscus_tart'],
  'strawberry': ['hibiscus_tart', 'hydrating', 'berry_elderberry'],
  'rhubarb': ['ginger_greens', 'light_fresh'],
  'blue lotus': ['calm_botanicals', 'bold_spiced'],
  'rose': ['floral_glow'],
  'cucumber': ['light_fresh', 'hydrating'],
  'coconut': ['hydrating'],
};

const NORMALIZED_INGREDIENT_PREFERENCE_SIGNALS = Object.entries(INGREDIENT_PREFERENCE_SIGNALS).map(
  ([ingredient, preferenceIds]) => ({
    ingredient: normalizeText(ingredient),
    preferenceIds
  })
);

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getProductSearchSegments(product) {
  const ingredientSegments = (product.ingredients || []).flatMap((ingredient) => {
    if (typeof ingredient === 'string') {
      return [ingredient];
    }

    if (ingredient && typeof ingredient === 'object') {
      return [ingredient.name, ...(ingredient.benefits || [])].filter(Boolean);
    }

    return [];
  });

  return [
    product.name,
    product.description,
    product.benefitStory,
    ...(product.benefits || []),
    ...(product.tags || []),
    ...ingredientSegments
  ].filter(Boolean);
}

function getIngredientTokens(product) {
  return (product.ingredients || [])
    .map((ingredient) => {
      if (typeof ingredient === 'string') {
        return normalizeText(ingredient);
      }

      if (ingredient && typeof ingredient === 'object') {
        return normalizeText(ingredient.name || '');
      }

      return '';
    })
    .filter(Boolean);
}

function ingredientMatchesSignal(ingredientToken, signalToken) {
  if (!ingredientToken || !signalToken) {
    return false;
  }

  if (ingredientToken === signalToken) {
    return true;
  }

  if (signalToken.length >= 4 && ingredientToken.includes(signalToken)) {
    return true;
  }

  return ingredientToken.length >= 4 && signalToken.includes(ingredientToken);
}

/**
 * Preference dimensions used for product discovery.
 *
 * Internal keys are slug-style flavor/format labels. They are not exposed as
 * health outcomes to shoppers.
 */
export const HEALTH_BENEFIT_FILTERS = {
  berry_elderberry: {
    id: 'berry_elderberry',
    label: 'Berry & Elderberry',
    icon: '🫐',
    color: 'blue',
    keywords: ['elderberry', 'echinacea', 'berry', 'strawberry', 'cranberry'],
    description: 'Berry-forward and elderberry-flavored options'
  },
  ginger_greens: {
    id: 'ginger_greens',
    label: 'Ginger & Greens',
    icon: '🌿',
    color: 'green',
    keywords: ['ginger', 'greens', 'fiber', 'mint', 'cucumber', 'chlorophyll'],
    description: 'Ginger, greens, and mint-forward options'
  },
  bold_spiced: {
    id: 'bold_spiced',
    label: 'Bold & Spiced',
    icon: '⚡',
    color: 'yellow',
    keywords: ['cayenne', 'maca', 'cinnamon', 'bold', 'spiced', 'star anise'],
    description: 'Bold, spiced flavors for a lively taste'
  },
  light_fresh: {
    id: 'light_fresh',
    label: 'Light & Fresh',
    icon: '💧',
    color: 'cyan',
    keywords: ['refresh', 'chlorophyll', 'cucumber', 'light', 'lemon', 'lime', 'grapefruit'],
    description: 'Light, refreshing options for any day'
  },
  warm_comforting: {
    id: 'warm_comforting',
    label: 'Warm & Comforting',
    icon: '🔥',
    color: 'orange',
    keywords: ['turmeric', 'ginger', 'warm', 'comforting', 'soursop', 'pineapple'],
    description: 'Warm, comforting blends with turmeric and ginger'
  },
  floral_glow: {
    id: 'floral_glow',
    label: 'Floral & Glow',
    icon: '✨',
    color: 'pink',
    keywords: ['rose', 'hibiscus', 'glow', 'floral'],
    description: 'Floral and bright options for a refreshing taste'
  },
  calm_botanicals: {
    id: 'calm_botanicals',
    label: 'Calm Botanicals',
    icon: '🧘',
    color: 'purple',
    keywords: ['blue lotus', 'basil', 'holy basil', 'botanical', 'ashwagandha'],
    description: 'Botanical, calming flavors'
  },
  hibiscus_tart: {
    id: 'hibiscus_tart',
    label: 'Hibiscus & Tart',
    icon: '🌺',
    color: 'red',
    keywords: ['hibiscus', 'tart', 'cranberry', 'apple', 'watermelon'],
    description: 'Tart, hibiscus-forward options'
  },
  sea_moss_base: {
    id: 'sea_moss_base',
    label: 'Sea Moss Base',
    icon: '🌊',
    color: 'teal',
    keywords: ['sea moss', 'trace minerals', 'irish moss'],
    description: 'Sea moss and mineral-containing bases'
  },
  hydrating: {
    id: 'hydrating',
    label: 'Hydrating',
    icon: '💦',
    color: 'sky',
    keywords: ['hydration', 'hydrating', 'watermelon', 'refreshing', 'coconut', 'cucumber'],
    description: 'Refreshing, hydrating options'
  }
};

/**
 * Match a product against preference dimensions.
 *
 * @deprecated health-oriented naming kept for API compatibility; returns preference IDs.
 */
export function getProductHealthBenefits(product) {
  const scores = Object.keys(HEALTH_BENEFIT_FILTERS).reduce((acc, preferenceId) => {
    acc[preferenceId] = 0;
    return acc;
  }, {});

  const ingredientDrivenMatches = new Set();
  const normalizedSearchText = normalizeText(getProductSearchSegments(product).join(' '));
  const ingredientTokens = getIngredientTokens(product);

  ingredientTokens.forEach((ingredientToken) => {
    NORMALIZED_INGREDIENT_PREFERENCE_SIGNALS.forEach(({ ingredient, preferenceIds }) => {
      if (!ingredientMatchesSignal(ingredientToken, ingredient)) {
        return;
      }

      preferenceIds.forEach((preferenceId) => {
        scores[preferenceId] += DIRECT_INGREDIENT_SIGNAL_WEIGHT;
        ingredientDrivenMatches.add(preferenceId);
      });
    });
  });

  Object.entries(HEALTH_BENEFIT_FILTERS).forEach(([preferenceId, preference]) => {
    const keywordHits = preference.keywords.reduce((hits, keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword) {
        return hits;
      }

      return normalizedSearchText.includes(normalizedKeyword) ? hits + 1 : hits;
    }, 0);

    scores[preferenceId] += keywordHits * KEYWORD_SIGNAL_WEIGHT;
  });

  return Object.keys(HEALTH_BENEFIT_FILTERS)
    .filter((preferenceId) => ingredientDrivenMatches.has(preferenceId) || scores[preferenceId] >= MINIMUM_MATCH_SCORE)
    .sort((a, b) => {
      if (scores[b] !== scores[a]) {
        return scores[b] - scores[a];
      }

      return HEALTH_BENEFIT_FILTERS[a].label.localeCompare(HEALTH_BENEFIT_FILTERS[b].label);
    });
}

/**
 * Enrich product with preference labels.
 *
 * @deprecated health-oriented naming kept for API compatibility; uses preference dimensions.
 */
export function enrichProductWithHealthBenefits(product) {
  const preferenceIds = getProductHealthBenefits(product);

  return {
    ...product,
    healthBenefits: preferenceIds,
    healthBenefitLabels: preferenceIds.map(id => HEALTH_BENEFIT_FILTERS[id]?.label).filter(Boolean),
    primaryHealthBenefit: preferenceIds[0] ? HEALTH_BENEFIT_FILTERS[preferenceIds[0]] : null
  };
}

/**
 * Filter products by a preference dimension.
 *
 * @deprecated health-oriented naming kept for API compatibility.
 */
export function filterProductsByHealthBenefit(products, preferenceId) {
  if (!preferenceId || preferenceId === 'all') {
    return products;
  }

  return products.filter(product => {
    const preferences = product.healthBenefits || getProductHealthBenefits(product);
    return preferences.includes(preferenceId);
  });
}

/**
 * Get preference dimension counts for product list.
 *
 * @deprecated health-oriented naming kept for API compatibility.
 */
export function getHealthBenefitCounts(products) {
  const counts = {};

  products.forEach(product => {
    const preferences = product.healthBenefits || getProductHealthBenefits(product);
    preferences.forEach(preferenceId => {
      counts[preferenceId] = (counts[preferenceId] || 0) + 1;
    });
  });

  return Object.entries(HEALTH_BENEFIT_FILTERS)
    .map(([id, data]) => ({
      ...data,
      count: counts[id] || 0
    }))
    .filter(b => b.count > 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * Get combined preference dimensions for a bundle.
 *
 * @deprecated health-oriented naming kept for API compatibility.
 */
export function getBundleHealthBenefits(bundleProducts) {
  const allPreferences = new Set();
  const ingredientSet = new Set();

  bundleProducts.forEach(product => {
    const preferences = product.healthBenefits || getProductHealthBenefits(product);
    preferences.forEach(b => allPreferences.add(b));

    (product.ingredients || []).forEach(i => {
      const name = typeof i === 'object' ? i.name : i;
      ingredientSet.add(name);
    });
  });

  return {
    healthBenefits: Array.from(allPreferences),
    uniqueIngredients: Array.from(ingredientSet),
    benefitLabels: Array.from(allPreferences).map(id => HEALTH_BENEFIT_FILTERS[id]?.label).filter(Boolean)
  };
}

export default HEALTH_BENEFIT_FILTERS;
