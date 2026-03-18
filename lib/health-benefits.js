/**
 * Health Benefits Taxonomy System
 * Filter products by wellness goals - info board focused, not selling
 */

const DIRECT_INGREDIENT_SIGNAL_WEIGHT = 3;
const KEYWORD_SIGNAL_WEIGHT = 1;
const MINIMUM_MATCH_SCORE = 2;

const INGREDIENT_HEALTH_SIGNALS = {
  'sea moss': ['thyroid', 'immunity', 'digestion', 'skinHealth', 'hydration'],
  'elderberry': ['immunity'],
  'echinacea': ['immunity'],
  'soursop': ['immunity', 'antiInflammatory'],
  'ginger': ['digestion', 'antiInflammatory', 'immunity'],
  'turmeric': ['antiInflammatory', 'immunity', 'heartHealth'],
  'cinnamon': ['energy', 'digestion', 'antiInflammatory'],
  'star anise': ['digestion', 'immunity'],
  'ashwagandha': ['stressRelief', 'energy'],
  'maca root': ['energy', 'stressRelief'],
  'horny goat weed': ['energy'],
  'blue spirulina': ['energy', 'detox', 'immunity'],
  'spirulina': ['energy', 'detox', 'immunity'],
  'chlorella': ['detox', 'immunity', 'digestion'],
  'chlorophyll': ['detox', 'hydration', 'skinHealth'],
  'holy basil': ['stressRelief', 'immunity'],
  'basil': ['stressRelief', 'digestion'],
  'oregano': ['immunity', 'digestion'],
  'hibiscus': ['heartHealth', 'hydration', 'antiInflammatory'],
  'cranberry': ['immunity', 'heartHealth', 'hydration'],
  'grapefruit': ['detox', 'heartHealth', 'hydration'],
  'orange': ['immunity', 'hydration'],
  'lemon': ['detox', 'immunity', 'hydration'],
  'lime': ['detox', 'immunity', 'hydration'],
  'chia seeds': ['hydration', 'energy', 'digestion'],
  'cayenne': ['energy', 'heartHealth', 'antiInflammatory'],
  'bee pollen': ['energy', 'immunity'],
  'agave': ['energy'],
  'local honey': ['immunity', 'energy'],
  'pineapple': ['digestion', 'antiInflammatory', 'hydration'],
  'mango': ['immunity', 'hydration'],
  'apple': ['digestion', 'heartHealth', 'hydration'],
  'mint': ['digestion', 'hydration'],
  'yellow watermelon': ['hydration', 'heartHealth'],
  'strawberry': ['heartHealth', 'hydration', 'immunity'],
  'rhubarb': ['digestion', 'detox'],
  'blue lotus': ['stressRelief', 'energy']
};

const NORMALIZED_INGREDIENT_HEALTH_SIGNALS = Object.entries(INGREDIENT_HEALTH_SIGNALS).map(
  ([ingredient, benefitIds]) => ({
    ingredient: normalizeText(ingredient),
    benefitIds
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

// Core wellness goals with associated ingredients and benefits
export const HEALTH_BENEFIT_FILTERS = {
  immunity: {
    id: 'immunity',
    label: 'Immune Support',
    icon: '🛡️',
    color: 'blue',
    keywords: ['immune', 'immunity', 'defense', 'antioxidants', 'vitamin c', 'elderberry', 'echinacea', 'respiratory', 'wellness boost'],
    description: 'Products that support your body\'s natural defenses'
  },
  digestion: {
    id: 'digestion',
    label: 'Digestive Health',
    icon: '🌿',
    color: 'green',
    keywords: ['digestion', 'digestive', 'gut', 'prebiotic', 'fiber', 'ginger', 'nausea', 'bloating', 'microbiome'],
    description: 'Support healthy digestion and gut wellness'
  },
  energy: {
    id: 'energy',
    label: 'Natural Energy',
    icon: '⚡',
    color: 'yellow',
    keywords: ['energy', 'vitality', 'endurance', 'metabolism', 'sustained', 'boost', 'stamina', 'focus', 'performance'],
    description: 'Clean, natural energy without the crash'
  },
  detox: {
    id: 'detox',
    label: 'Detox & Cleanse',
    icon: '💧',
    color: 'cyan',
    keywords: ['detox', 'cleanse', 'liver', 'alkalizing', 'purify', 'chlorophyll', 'cellular rejuvenation', 'flush'],
    description: 'Support your body\'s natural cleansing processes'
  },
  antiInflammatory: {
    id: 'antiInflammatory',
    label: 'Anti-Inflammatory',
    icon: '🔥',
    color: 'orange',
    keywords: ['anti-inflammatory', 'inflammation', 'turmeric', 'joint', 'pain relief', 'recovery', 'comfort'],
    description: 'Natural support for reducing inflammation'
  },
  skinHealth: {
    id: 'skinHealth',
    label: 'Skin & Beauty',
    icon: '✨',
    color: 'pink',
    keywords: ['skin', 'collagen', 'beauty', 'glow', 'radiant', 'elasticity', 'complexion'],
    description: 'Nourish your skin from within'
  },
  stressRelief: {
    id: 'stressRelief',
    label: 'Calm & Focus',
    icon: '🧘',
    color: 'purple',
    keywords: ['stress', 'calm', 'focus', 'relaxation', 'anxiety', 'ashwagandha', 'adaptogen', 'mood', 'mental clarity'],
    description: 'Support mental clarity and relaxation'
  },
  heartHealth: {
    id: 'heartHealth',
    label: 'Heart & Circulation',
    icon: '❤️',
    color: 'red',
    keywords: ['heart', 'circulation', 'cardiovascular', 'blood', 'hibiscus', 'vascular', 'blood flow'],
    description: 'Support cardiovascular wellness'
  },
  thyroid: {
    id: 'thyroid',
    label: 'Thyroid Support',
    icon: '🌊',
    color: 'teal',
    keywords: ['thyroid', 'iodine', 'metabolism', 'hormonal', 'sea moss', '92 minerals', 'mineral rich', 'trace minerals'],
    description: 'Natural thyroid function support'
  },
  hydration: {
    id: 'hydration',
    label: 'Hydration',
    icon: '💦',
    color: 'sky',
    keywords: ['hydration', 'hydrating', 'alkaline water', 'electrolytes', 'refreshing', 'replenish', 'thirst'],
    description: 'Optimal hydration and mineral balance'
  }
};

/**
 * Match a product against health benefit filters
 * Returns array of matching benefit IDs
 */
export function getProductHealthBenefits(product) {
  const scores = Object.keys(HEALTH_BENEFIT_FILTERS).reduce((acc, benefitId) => {
    acc[benefitId] = 0;
    return acc;
  }, {});

  const ingredientDrivenMatches = new Set();
  const normalizedSearchText = normalizeText(getProductSearchSegments(product).join(' '));
  const ingredientTokens = getIngredientTokens(product);

  ingredientTokens.forEach((ingredientToken) => {
    NORMALIZED_INGREDIENT_HEALTH_SIGNALS.forEach(({ ingredient, benefitIds }) => {
      if (!ingredientMatchesSignal(ingredientToken, ingredient)) {
        return;
      }

      benefitIds.forEach((benefitId) => {
        scores[benefitId] += DIRECT_INGREDIENT_SIGNAL_WEIGHT;
        ingredientDrivenMatches.add(benefitId);
      });
    });
  });

  Object.entries(HEALTH_BENEFIT_FILTERS).forEach(([benefitId, benefit]) => {
    const keywordHits = benefit.keywords.reduce((hits, keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword) {
        return hits;
      }

      return normalizedSearchText.includes(normalizedKeyword) ? hits + 1 : hits;
    }, 0);

    scores[benefitId] += keywordHits * KEYWORD_SIGNAL_WEIGHT;
  });

  return Object.keys(HEALTH_BENEFIT_FILTERS)
    .filter((benefitId) => ingredientDrivenMatches.has(benefitId) || scores[benefitId] >= MINIMUM_MATCH_SCORE)
    .sort((a, b) => {
      if (scores[b] !== scores[a]) {
        return scores[b] - scores[a];
      }

      return HEALTH_BENEFIT_FILTERS[a].label.localeCompare(HEALTH_BENEFIT_FILTERS[b].label);
    });
}

/**
 * Enrich product with health benefit data
 */
export function enrichProductWithHealthBenefits(product) {
  const healthBenefits = getProductHealthBenefits(product);
  
  return {
    ...product,
    healthBenefits,
    healthBenefitLabels: healthBenefits.map(id => HEALTH_BENEFIT_FILTERS[id]?.label).filter(Boolean),
    primaryHealthBenefit: healthBenefits[0] ? HEALTH_BENEFIT_FILTERS[healthBenefits[0]] : null
  };
}

/**
 * Filter products by health benefit
 */
export function filterProductsByHealthBenefit(products, benefitId) {
  if (!benefitId || benefitId === 'all') {
    return products;
  }
  
  return products.filter(product => {
    const benefits = product.healthBenefits || getProductHealthBenefits(product);
    return benefits.includes(benefitId);
  });
}

/**
 * Get health benefit counts for product list
 */
export function getHealthBenefitCounts(products) {
  const counts = {};
  
  products.forEach(product => {
    const benefits = product.healthBenefits || getProductHealthBenefits(product);
    benefits.forEach(benefitId => {
      counts[benefitId] = (counts[benefitId] || 0) + 1;
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
 * Get combined health benefits for a bundle
 */
export function getBundleHealthBenefits(bundleProducts) {
  const allBenefits = new Set();
  const ingredientSet = new Set();
  
  bundleProducts.forEach(product => {
    const benefits = product.healthBenefits || getProductHealthBenefits(product);
    benefits.forEach(b => allBenefits.add(b));
    
    (product.ingredients || []).forEach(i => {
      const name = typeof i === 'object' ? i.name : i;
      ingredientSet.add(name);
    });
  });
  
  return {
    healthBenefits: Array.from(allBenefits),
    uniqueIngredients: Array.from(ingredientSet),
    benefitLabels: Array.from(allBenefits).map(id => HEALTH_BENEFIT_FILTERS[id]?.label).filter(Boolean)
  };
}

export default HEALTH_BENEFIT_FILTERS;
