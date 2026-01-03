/**
 * Health Benefits Taxonomy System
 * Filter products by wellness goals - info board focused, not selling
 */

// Core wellness goals with associated ingredients and benefits
export const HEALTH_BENEFIT_FILTERS = {
  immunity: {
    id: 'immunity',
    label: 'Immune Support',
    icon: '🛡️',
    color: 'blue',
    keywords: ['immune', 'immunity', 'defense', 'antioxidants', 'vitamin c', 'elderberry', 'echinacea'],
    description: 'Products that support your body\'s natural defenses'
  },
  digestion: {
    id: 'digestion',
    label: 'Digestive Health',
    icon: '🌿',
    color: 'green',
    keywords: ['digestion', 'digestive', 'gut', 'prebiotic', 'fiber', 'ginger', 'nausea'],
    description: 'Support healthy digestion and gut wellness'
  },
  energy: {
    id: 'energy',
    label: 'Natural Energy',
    icon: '⚡',
    color: 'yellow',
    keywords: ['energy', 'vitality', 'endurance', 'metabolism', 'sustained', 'boost'],
    description: 'Clean, natural energy without the crash'
  },
  detox: {
    id: 'detox',
    label: 'Detox & Cleanse',
    icon: '💧',
    color: 'cyan',
    keywords: ['detox', 'cleanse', 'liver', 'alkalizing', 'purify', 'chlorophyll'],
    description: 'Support your body\'s natural cleansing processes'
  },
  antiInflammatory: {
    id: 'antiInflammatory',
    label: 'Anti-Inflammatory',
    icon: '🔥',
    color: 'orange',
    keywords: ['anti-inflammatory', 'inflammation', 'turmeric', 'joint', 'pain relief'],
    description: 'Natural support for reducing inflammation'
  },
  skinHealth: {
    id: 'skinHealth',
    label: 'Skin & Beauty',
    icon: '✨',
    color: 'pink',
    keywords: ['skin', 'collagen', 'beauty', 'glow', 'radiant', 'elasticity'],
    description: 'Nourish your skin from within'
  },
  stressRelief: {
    id: 'stressRelief',
    label: 'Calm & Focus',
    icon: '🧘',
    color: 'purple',
    keywords: ['stress', 'calm', 'focus', 'relaxation', 'anxiety', 'ashwagandha', 'adaptogen'],
    description: 'Support mental clarity and relaxation'
  },
  heartHealth: {
    id: 'heartHealth',
    label: 'Heart & Circulation',
    icon: '❤️',
    color: 'red',
    keywords: ['heart', 'circulation', 'cardiovascular', 'blood', 'hibiscus'],
    description: 'Support cardiovascular wellness'
  },
  thyroid: {
    id: 'thyroid',
    label: 'Thyroid Support',
    icon: '🌊',
    color: 'teal',
    keywords: ['thyroid', 'iodine', 'metabolism', 'hormonal', 'sea moss', '92 minerals'],
    description: 'Natural thyroid function support'
  },
  hydration: {
    id: 'hydration',
    label: 'Hydration',
    icon: '💦',
    color: 'sky',
    keywords: ['hydration', 'hydrating', 'alkaline water', 'electrolytes', 'refreshing'],
    description: 'Optimal hydration and mineral balance'
  }
};

/**
 * Match a product against health benefit filters
 * Returns array of matching benefit IDs
 */
export function getProductHealthBenefits(product) {
  const matches = [];
  
  // Build searchable text from product data
  const searchText = [
    product.name,
    product.description,
    product.benefitStory,
    ...(product.benefits || []),
    ...(product.tags || []),
    ...(product.ingredients || []).map(i => 
      typeof i === 'object' ? `${i.name} ${(i.benefits || []).join(' ')}` : i
    )
  ].filter(Boolean).join(' ').toLowerCase();
  
  // Check each health benefit filter
  for (const [benefitId, benefit] of Object.entries(HEALTH_BENEFIT_FILTERS)) {
    const hasMatch = benefit.keywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
    
    if (hasMatch) {
      matches.push(benefitId);
    }
  }
  
  return matches;
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
