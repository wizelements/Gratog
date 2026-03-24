/**
 * Ingredient Taxonomy System
 * Intelligent categorization based on ingredient analysis
 */

// Core ingredient definitions with benefits and visual elements
export const INGREDIENT_DATABASE = {
  'sea moss': {
    benefits: ['92 essential minerals', 'immune support', 'thyroid health'],
    icon: '🌊',
    color: 'emerald',
    category: 'Sea Moss Gels',
    weight: 10  // High weight for primary ingredient
  },
  'pineapple': {
    benefits: ['vitamin C', 'digestion', 'anti-inflammatory'],
    icon: '🍍',
    color: 'yellow',
    category: 'Lemonades & Juices',
    weight: 3
  },
  'turmeric': {
    benefits: ['anti-inflammatory', 'antioxidants', 'brain health'],
    icon: '🌟',
    color: 'orange',
    category: 'Wellness Shots',
    weight: 7
  },
  'ginger': {
    benefits: ['digestion', 'nausea relief', 'immunity'],
    icon: '🫚',
    color: 'amber',
    category: 'Lemonades & Juices',
    weight: 5
  },
  'lemon': {
    benefits: ['vitamin C', 'detox', 'alkalizing'],
    icon: '🍋',
    color: 'yellow',
    category: 'Lemonades & Juices',
    weight: 6
  },
  'lemonade': {
    benefits: ['hydration', 'refreshing', 'vitamin C'],
    icon: '🍋',
    color: 'yellow',
    category: 'Lemonades & Juices',
    weight: 8
  },
  'agave': {
    benefits: ['natural sweetener', 'low glycemic', 'energy'],
    icon: '🍯',
    color: 'amber',
    category: 'Lemonades & Juices',
    weight: 2
  },
  'blue lotus': {
    benefits: ['relaxation', 'focus', 'mood elevation'],
    icon: '🪷',
    color: 'blue',
    category: 'Herbal Blends & Teas',
    weight: 8
  },
  'basil': {
    benefits: ['stress relief', 'antioxidants', 'digestion'],
    icon: '🌿',
    color: 'green',
    category: 'Herbal Blends & Teas',
    weight: 6
  },
  'chlorophyll': {
    benefits: ['detoxification', 'oxygen boost', 'skin health'],
    icon: '💚',
    color: 'emerald',
    category: 'Lemonades & Juices',
    weight: 4
  },
  'cayenne': {
    benefits: ['metabolism', 'circulation', 'pain relief'],
    icon: '🌶️',
    color: 'red',
    category: 'Wellness Shots',
    weight: 6
  },
  'honey': {
    benefits: ['natural antibacterial', 'soothing', 'energy'],
    icon: '🍯',
    color: 'amber',
    category: 'Wellness Shots',
    weight: 4
  },
  'chia': {
    benefits: ['omega-3', 'fiber', 'sustained energy'],
    icon: '🌱',
    color: 'gray',
    category: 'Wellness Shots',
    weight: 4
  },
  'cranberry': {
    benefits: ['urinary health', 'antioxidants', 'vitamin C'],
    icon: '🫐',
    color: 'red',
    category: 'Lemonades & Juices',
    weight: 5
  },
  'strawberry': {
    benefits: ['vitamin C', 'heart health', 'antioxidants'],
    icon: '🍓',
    color: 'red',
    category: 'Lemonades & Juices',
    weight: 5
  },
  'blueberry': {
    benefits: ['antioxidants', 'brain health', 'heart health'],
    icon: '🫐',
    color: 'blue',
    category: 'Lemonades & Juices',
    weight: 5
  },
  'peach': {
    benefits: ['vitamin A', 'digestion', 'skin health'],
    icon: '🍑',
    color: 'orange',
    category: 'Lemonades & Juices',
    weight: 5
  },
  'mango': {
    benefits: ['vitamin C', 'digestion', 'immunity'],
    icon: '🥭',
    color: 'yellow',
    category: 'Lemonades & Juices',
    weight: 5
  },
  'apple': {
    benefits: ['fiber', 'heart health', 'hydration'],
    icon: '🍎',
    color: 'red',
    category: 'Lemonades & Juices',
    weight: 5
  },
  'rhubarb': {
    benefits: ['digestion', 'vitamin K', 'antioxidants'],
    icon: '🌺',
    color: 'pink',
    category: 'Herbal Blends & Teas',
    weight: 6
  },
  'orange': {
    benefits: ['vitamin C', 'immunity', 'hydration'],
    icon: '🍊',
    color: 'orange',
    category: 'Lemonades & Juices',
    weight: 5
  },
  'elderberry': {
    benefits: ['immune support', 'antioxidants', 'respiratory health'],
    icon: '🫐',
    color: 'purple',
    category: 'Wellness Shots',
    weight: 7
  },
  'melon': {
    benefits: ['hydration', 'vitamin C', 'refreshing'],
    icon: '🍈',
    color: 'green',
    category: 'Lemonades & Juices',
    weight: 5
  },
  'boba': {
    benefits: ['fun texture', 'energy boost', 'refreshing treat'],
    icon: '🧋',
    color: 'purple',
    category: 'Boba & Cream',
    weight: 10
  },
  'taro': {
    benefits: ['fiber', 'potassium', 'natural sweetness'],
    icon: '💜',
    color: 'purple',
    category: 'Boba & Cream',
    weight: 8
  },
  'matcha': {
    benefits: ['antioxidants', 'calm energy', 'metabolism'],
    icon: '🍵',
    color: 'green',
    category: 'Boba & Cream',
    weight: 8
  },
  'cream': {
    benefits: ['smooth texture', 'indulgent flavor', 'comfort treat'],
    icon: '🍦',
    color: 'amber',
    category: 'Boba & Cream',
    weight: 6
  },
  'milk tea': {
    benefits: ['antioxidants', 'energy', 'soothing'],
    icon: '🥛',
    color: 'amber',
    category: 'Boba & Cream',
    weight: 9
  },
  'caramel': {
    benefits: ['indulgent flavor', 'energy', 'comfort'],
    icon: '🍮',
    color: 'amber',
    category: 'Boba & Cream',
    weight: 5
  },
  'brown sugar': {
    benefits: ['minerals', 'natural sweetener', 'rich flavor'],
    icon: '🤎',
    color: 'amber',
    category: 'Boba & Cream',
    weight: 5
  },
  'maple': {
    benefits: ['antioxidants', 'natural sweetener', 'minerals'],
    icon: '🍁',
    color: 'amber',
    category: 'Boba & Cream',
    weight: 5
  },
  'vanilla': {
    benefits: ['calming', 'antioxidants', 'mood elevation'],
    icon: '🌼',
    color: 'amber',
    category: 'Boba & Cream',
    weight: 5
  }
};

// Category taxonomy with rules
export const CATEGORY_TAXONOMY = {
  'Sea Moss Gels': {
    primary_ingredients: ['sea moss'],
    description: 'Mineral-rich sea moss blends for daily wellness',
    icon: '🌊',
    color: 'emerald',
    tags: ['minerals', 'immunity', 'daily wellness']
  },
  'Lemonades & Juices': {
    primary_ingredients: ['lemon', 'ginger', 'agave', 'chlorophyll'],
    description: 'Refreshing fruit-based wellness beverages',
    icon: '🍋',
    color: 'yellow',
    tags: ['detox', 'energy', 'hydration']
  },
  'Wellness Shots': {
    primary_ingredients: ['turmeric', 'cayenne', 'ginger', 'honey'],
    description: 'Concentrated wellness boosters for targeted benefits',
    icon: '⚡',
    color: 'orange',
    tags: ['boost', 'metabolism', 'anti-inflammatory']
  },
  'Herbal Blends & Teas': {
    primary_ingredients: ['blue lotus', 'basil', 'rhubarb'],
    description: 'Calming and focusing herbal preparations',
    icon: '🪷',
    color: 'purple',
    tags: ['calm', 'focus', 'relaxation']
  },
  'Boba & Cream': {
    primary_ingredients: ['boba', 'taro', 'matcha', 'cream', 'milk tea'],
    description: 'Handcrafted boba drinks & cream toppings — Serenbe Markets exclusive',
    icon: '🧋',
    color: 'purple',
    tags: ['boba', 'cream', 'market exclusive', 'serenbe', 'handcrafted'],
    marketExclusive: true
  },
  'Bundles & Seasonal': {
    primary_ingredients: [],
    description: 'Curated collections and limited releases',
    icon: '🎁',
    color: 'teal',
    tags: ['value', 'seasonal', 'gift']
  }
};

/**
 * Analyze product name and description to extract ingredients
 */
export function extractIngredients(product) {
  const text = `${product.name} ${product.description || ''}`.toLowerCase();
  const found = [];
  
  for (const [ingredient, data] of Object.entries(INGREDIENT_DATABASE)) {
    if (text.includes(ingredient)) {
      found.push({ name: ingredient, ...data });
    }
  }
  
  return found;
}

/**
 * Auto-categorize product based on ingredients AND product name
 */
export function categorizeBIngredients(product) {
  const ingredients = extractIngredients(product);
  const name = (product.name || '').toLowerCase().trim();
  
  // Priority 0: Manual overrides for specific products
  const manualOverrides = {
    'kissed by gods': 'Lemonades & Juices',  // Basil Lemonade
    'blue lotus': 'Sea Moss Gels',           // Sea Moss Gel with Blue Lotus
  };
  
  if (manualOverrides[name]) {
    return manualOverrides[name];
  }
  
  // Priority 1: Boba & Cream products (market exclusive line)
  const bobaKeywords = ['boba', 'taro', 'matcha', 'milk tea', 'cream topping'];
  if (bobaKeywords.some(kw => name.includes(kw))) {
    return 'Boba & Cream';
  }

  // Priority 1b: Check for explicit product type keywords in name
  if (name.includes('freebie')) {
    return 'Bundles & Seasonal';
  }
  
  if (name.includes(' shot') || name.endsWith('shot')) {
    return 'Wellness Shots';
  }
  
  // Priority 2: Lemonade/Juice indicators (strong override)
  // Products with "lemonade", "zinger", or basil+lemon combo are lemonades
  const hasLemonadeIndicator = name.includes('lemonade') || name.includes('zinger');
  const hasBasilLemonCombo = ingredients.some(i => i.name === 'basil') && 
                             ingredients.some(i => i.name === 'lemon');
  
  if (hasLemonadeIndicator || hasBasilLemonCombo) {
    return 'Lemonades & Juices';
  }
  
  // Priority 3: Products with " gel" or "Gel" explicitly in name
  if (name.includes(' gel') || name.endsWith('gel') || name.includes('Gel')) {
    // If it has "gel" in name, it's a gel (even if other ingredients present)
    return 'Sea Moss Gels';
  }
  
  // Priority 4: Special product name rules
  // Blue Lotus, Elderberry Moss, etc. - if they contain sea moss or have gel-like properties
  const isSeaMossGelProduct = 
    name.includes('moss') || 
    name.includes('lotus') ||
    name.includes('grateful') ||
    name.includes('gratitude') ||
    name.includes('harmony') ||
    name.includes('defense') ||
    name.includes('guardian') ||
    name.includes('rooted') ||
    name.includes('bloom') ||
    name.includes('vibe') ||
    name.includes('mint') ||
    name.includes('aura') ||
    name.includes('tide') ||
    name.includes('glow');
  
  // If it has sea moss gel naming AND sea moss ingredient, it's a gel
  const hasSeaMoss = ingredients.some(i => i.name === 'sea moss');
  if (isSeaMossGelProduct && hasSeaMoss) {
    return 'Sea Moss Gels';
  }
  
  // Priority 5: Weighted scoring based on ingredients
  if (ingredients.length === 0) {
    // Fallback to name-based categorization
    if (name.includes('juice') || name.includes('blend')) {
      return 'Lemonades & Juices';
    }
    return 'Bundles & Seasonal';
  }
  
  // Weighted scoring system - ingredients have different importance
  const categoryScores = {};
  
  ingredients.forEach(ingredient => {
    const category = ingredient.category;
    const weight = ingredient.weight || 1;
    categoryScores[category] = (categoryScores[category] || 0) + weight;
  });
  
  // Return category with highest weighted score
  const sortedCategories = Object.entries(categoryScores)
    .sort(([, a], [, b]) => b - a);
  
  if (sortedCategories.length === 0) {
    return 'Bundles & Seasonal';
  }
  
  return sortedCategories[0][0];
}

/**
 * Generate benefit narrative from ingredients
 */
export function generateBenefitStory(product, ingredients = null) {
  const productIngredients = ingredients || extractIngredients(product);
  
  if (productIngredients.length === 0) {
    return `${product.name} brings you premium wellness in every serving.`;
  }
  
  // Get top 3 ingredients
  const top3 = productIngredients.slice(0, 3);
  const ingredientNames = top3.map(i => i.name).join(', ').replace(/, ([^,]*)$/, ' and $1');
  
  // Collect unique benefits
  const allBenefits = [...new Set(top3.flatMap(i => i.benefits))];
  const benefitText = allBenefits.slice(0, 3).join(', ').replace(/, ([^,]*)$/, ' and $1');
  
  return `${product.name} unites ${ingredientNames} to deliver ${benefitText} in every delicious serving.`;
}

/**
 * Get ingredient icons for product
 */
export function getIngredientIcons(product) {
  const ingredients = extractIngredients(product);
  return ingredients.map(i => i.icon).slice(0, 5);
}

/**
 * Get product tags based on ingredients
 */
export function generateProductTags(product) {
  const ingredients = extractIngredients(product);
  const category = categorizeBIngredients(product);
  
  const tags = new Set();
  
  // Add ingredient-based tags
  ingredients.forEach(ingredient => {
    ingredient.benefits.forEach(benefit => {
      // Extract key words from benefits
      const words = benefit.split(' ').filter(w => w.length > 4);
      words.forEach(word => tags.add(word.toLowerCase()));
    });
  });
  
  // Add category tags
  if (CATEGORY_TAXONOMY[category]) {
    CATEGORY_TAXONOMY[category].tags.forEach(tag => tags.add(tag));
  }
  
  return Array.from(tags);
}

/**
 * Check if a product is market-exclusive (Serenbe Markets only)
 */
export function isMarketExclusive(product) {
  const category = product?.intelligentCategory || categorizeBIngredients(product);
  return CATEGORY_TAXONOMY[category]?.marketExclusive === true;
}

/**
 * Enrich product with ingredient intelligence
 */
export function enrichProductWithIngredients(product) {
  const ingredients = extractIngredients(product);
  const category = categorizeBIngredients(product);
  const benefitStory = generateBenefitStory(product, ingredients);
  const icons = getIngredientIcons(product);
  const tags = generateProductTags(product);
  const marketExclusive = CATEGORY_TAXONOMY[category]?.marketExclusive === true;
  
  return {
    ...product,
    intelligentCategory: category,
    ingredients: ingredients.map(i => ({
      name: i.name,
      icon: i.icon,
      benefits: i.benefits
    })),
    benefitStory,
    ingredientIcons: icons,
    tags,
    categoryData: CATEGORY_TAXONOMY[category] || {},
    marketExclusive,
    marketExclusiveLabel: marketExclusive ? '🎪 Serenbe Markets Only' : null
  };
}

/**
 * Get all categories with product counts
 */
export function getCategoriesWithCounts(products) {
  const counts = {};
  
  products.forEach(product => {
    const category = product.intelligentCategory || categorizeBIngredients(product);
    counts[category] = (counts[category] || 0) + 1;
  });
  
  return Object.entries(CATEGORY_TAXONOMY).map(([name, data]) => ({
    name,
    ...data,
    count: counts[name] || 0
  }));
}
