/**
 * Demo Products - Fallback when Square API fails
 * Used for development and as safety net in production
 * 
 * DISABLED IN PRODUCTION by default. 
 * Set NEXT_PUBLIC_ENABLE_DEMO_PRODUCTS=true to enable in any environment.
 */

// Demo products are OFF in production unless explicitly enabled
const DEMO_ENABLED =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_ENABLE_DEMO_PRODUCTS === 'true';

export const DEMO_PRODUCTS = [
  {
    id: 'demo-seamoss-gold-16oz',
    slug: 'gold-sea-moss-gel-16oz',
    name: 'Gold Sea Moss Gel - 16oz',
    description: 'Premium wildcrafted gold sea moss gel packed with 92 essential minerals. Supports immune function, thyroid health, and overall wellness. Hand-crafted in small batches for maximum freshness.',
    price: 32.00,
    priceCents: 3200,
    image: 'https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?w=800&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=800&fit=crop'
    ],
    category: 'gel',
    intelligentCategory: 'Sea Moss Gels',
    featured: true,
    ingredients: [
      {
        name: 'sea moss',
        icon: '🌊',
        benefits: ['92 Minerals', 'Immune Support', 'Thyroid Health', 'Energy Boost']
      }
    ],
    categoryData: {
      name: 'Sea Moss Gels',
      icon: '🥄',
      description: 'Pure wildcrafted sea moss gel'
    },
    benefitStory: 'Our premium Gold Sea Moss Gel is harvested from pristine Atlantic waters and hand-crafted to preserve all 92 essential minerals your body needs.',
    tags: ['wildcrafted', 'gold', 'sea moss', 'immune support', 'vegan', 'gluten-free'],
    variations: [
      { id: 'var-16oz', name: '16oz Jar', price: 32.00, inStock: true },
      { id: 'var-32oz', name: '32oz Jar', price: 55.00, inStock: true }
    ],
    stock: 'in_stock',
    rating: 4.9,
    reviews: 124
  },
  {
    id: 'demo-elderberry-seamoss-16oz',
    slug: 'elderberry-sea-moss-gel-16oz',
    name: 'Elderberry Sea Moss Gel - 16oz',
    description: 'Powerful combination of wildcrafted sea moss and organic elderberries. Packed with antioxidants and vitamins for superior immune support. Perfect for cold and flu season.',
    price: 35.00,
    priceCents: 3500,
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&h=800&fit=crop'
    ],
    category: 'gel',
    intelligentCategory: 'Sea Moss Gels',
    featured: true,
    ingredients: [
      {
        name: 'sea moss',
        icon: '🌊',
        benefits: ['92 Minerals', 'Immune Support', 'Energy']
      },
      {
        name: 'elderberry',
        icon: '🫐',
        benefits: ['Antioxidants', 'Vitamin C', 'Immune Defense']
      }
    ],
    categoryData: {
      name: 'Sea Moss Gels',
      icon: '🥄',
      description: 'Sea moss gel with elderberry'
    },
    benefitStory: 'Combining the ocean\'s 92 minerals with elderberry\'s immune-boosting power, this blend is your wellness warrior.',
    tags: ['wildcrafted', 'elderberry', 'immune support', 'antioxidants', 'vegan'],
    variations: [
      { id: 'var-eld-16oz', name: '16oz Jar', price: 35.00, inStock: true }
    ],
    stock: 'in_stock',
    rating: 4.9,
    reviews: 89
  },
  {
    id: 'demo-seamoss-lemonade-16oz',
    slug: 'sea-moss-lemonade-16oz',
    name: 'Sea Moss Lemonade - 16oz',
    description: 'Refreshing sea moss lemonade infused with real lemon juice and natural sweetness. A delicious way to get your daily minerals while staying hydrated.',
    price: 28.00,
    priceCents: 2800,
    image: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?w=800&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?w=800&h=800&fit=crop'
    ],
    category: 'lemonade',
    intelligentCategory: 'Lemonades',
    featured: true,
    ingredients: [
      {
        name: 'sea moss',
        icon: '🌊',
        benefits: ['92 Minerals', 'Hydration']
      },
      {
        name: 'lemon',
        icon: '🍋',
        benefits: ['Vitamin C', 'Detox', 'Digestive Aid']
      }
    ],
    categoryData: {
      name: 'Lemonades',
      icon: '🍋',
      description: 'Refreshing sea moss lemonades'
    },
    benefitStory: 'Turn your wellness routine into a treat! Our Sea Moss Lemonade makes it easy and delicious to nourish your body every day.',
    tags: ['lemonade', 'refreshing', 'vitamin c', 'hydration', 'vegan'],
    variations: [
      { id: 'var-lem-16oz', name: '16oz Bottle', price: 28.00, inStock: true }
    ],
    stock: 'in_stock',
    rating: 4.8,
    reviews: 67
  },
  {
    id: 'demo-purple-seamoss-gel-16oz',
    slug: 'purple-sea-moss-gel-16oz',
    name: 'Purple Sea Moss Gel - 16oz',
    description: 'Rare wildcrafted purple sea moss gel, rich in anthocyanins and antioxidants. Known for enhanced skin health, anti-inflammatory properties, and superior mineral content.',
    price: 38.00,
    priceCents: 3800,
    image: 'https://images.unsplash.com/photo-1505575370712-d75b24fa99b5?w=800&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1505575370712-d75b24fa99b5?w=800&h=800&fit=crop'
    ],
    category: 'gel',
    intelligentCategory: 'Sea Moss Gels',
    featured: true,
    ingredients: [
      {
        name: 'purple sea moss',
        icon: '💜',
        benefits: ['92+ Minerals', 'Anthocyanins', 'Skin Health', 'Anti-inflammatory']
      }
    ],
    categoryData: {
      name: 'Sea Moss Gels',
      icon: '🥄',
      description: 'Premium purple sea moss'
    },
    benefitStory: 'Our rare Purple Sea Moss is the ocean\'s beauty secret - packed with antioxidants that support radiant skin and youthful vitality.',
    tags: ['wildcrafted', 'purple', 'rare', 'antioxidants', 'skin health', 'vegan'],
    variations: [
      { id: 'var-pur-16oz', name: '16oz Jar', price: 38.00, inStock: true }
    ],
    stock: 'in_stock',
    rating: 5.0,
    reviews: 45
  },
  {
    id: 'demo-wellness-shot-ginger',
    slug: 'ginger-turmeric-wellness-shot',
    name: 'Ginger Turmeric Wellness Shot - 2oz',
    description: 'Concentrated wellness shot with sea moss, ginger, turmeric, and cayenne. Your daily immune boost and natural energy in one powerful shot.',
    price: 6.00,
    priceCents: 600,
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=800&fit=crop'
    ],
    category: 'shot',
    intelligentCategory: 'Wellness Shots',
    featured: true,
    ingredients: [
      {
        name: 'sea moss',
        icon: '🌊',
        benefits: ['Minerals', 'Energy']
      },
      {
        name: 'ginger',
        icon: '🫚',
        benefits: ['Anti-inflammatory', 'Digestive Support']
      },
      {
        name: 'turmeric',
        icon: '🟡',
        benefits: ['Antioxidants', 'Joint Health']
      },
      {
        name: 'cayenne',
        icon: '🌶️',
        benefits: ['Metabolism', 'Circulation']
      }
    ],
    categoryData: {
      name: 'Wellness Shots',
      icon: '💪',
      description: 'Concentrated wellness shots'
    },
    benefitStory: 'One shot. Maximum impact. Start your day with this concentrated burst of wellness that delivers everything your body needs in seconds.',
    tags: ['wellness shot', 'ginger', 'turmeric', 'energy', 'immune support'],
    variations: [
      { id: 'var-shot-single', name: 'Single Shot (2oz)', price: 6.00, inStock: true },
      { id: 'var-shot-pack', name: '7-Day Pack', price: 35.00, inStock: true }
    ],
    stock: 'in_stock',
    rating: 4.9,
    reviews: 156
  },
  {
    id: 'demo-seamoss-combo-pack',
    slug: 'sea-moss-variety-pack',
    name: 'Sea Moss Variety Pack',
    description: 'Try all our flavors! Includes Gold Sea Moss, Elderberry, and Lemonade. Perfect for discovering your favorite or sharing with family.',
    price: 85.00,
    priceCents: 8500,
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=800&fit=crop'
    ],
    category: 'gel',
    intelligentCategory: 'Sea Moss Gels',
    featured: true,
    ingredients: [
      {
        name: 'sea moss',
        icon: '🌊',
        benefits: ['92 Minerals', 'Complete Wellness']
      }
    ],
    categoryData: {
      name: 'Sea Moss Gels',
      icon: '🥄',
      description: 'Variety pack bundle'
    },
    benefitStory: 'Can\'t decide? Don\'t! Our Variety Pack lets you experience the full spectrum of sea moss wellness - from pure gold to elderberry immune support to refreshing lemonade.',
    tags: ['variety pack', 'bundle', 'value', 'gift', 'sampler'],
    variations: [
      { id: 'var-variety', name: 'Variety Pack (3x 16oz)', price: 85.00, inStock: true }
    ],
    stock: 'in_stock',
    rating: 4.9,
    reviews: 92
  }
];

/**
 * Get demo products with optional filtering
 * Returns empty array in production unless NEXT_PUBLIC_ENABLE_DEMO_PRODUCTS=true
 */
export function getDemoProducts(filters = {}) {
  // Return empty array if demos are disabled (production default)
  if (!DEMO_ENABLED) {
    return [];
  }
  
  let products = [...DEMO_PRODUCTS];
  
  // Apply category filter
  if (filters.category) {
    products = products.filter(p => p.category === filters.category);
  }
  
  // Apply search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.tags.some(tag => tag.includes(searchLower))
    );
  }
  
  // Apply ingredient filter
  if (filters.ingredient) {
    products = products.filter(p => 
      p.ingredients.some(ing => ing.name.toLowerCase().includes(filters.ingredient.toLowerCase()))
    );
  }
  
  // Apply tag filter
  if (filters.tag) {
    products = products.filter(p => p.tags.includes(filters.tag));
  }
  
  return products;
}

/**
 * Get categories from demo products
 * Returns empty array in production unless NEXT_PUBLIC_ENABLE_DEMO_PRODUCTS=true
 */
export function getDemoCategories() {
  // Return empty array if demos are disabled (production default)
  if (!DEMO_ENABLED) {
    return [];
  }
  
  return [
    { name: 'Sea Moss Gels', icon: '🥄', count: DEMO_PRODUCTS.filter(p => p.category === 'gel').length },
    { name: 'Lemonades', icon: '🍋', count: DEMO_PRODUCTS.filter(p => p.category === 'lemonade').length },
    { name: 'Wellness Shots', icon: '💪', count: DEMO_PRODUCTS.filter(p => p.category === 'shot').length }
  ];
}
