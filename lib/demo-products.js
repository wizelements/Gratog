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
    id: 'demo-elderberry-seamoss-16oz',
    slug: 'elderberry-sea-moss-gel-16oz',
    name: 'Elderberry Sea Moss Gel - 16oz',
    description: 'A small-batch elderberry sea moss gel made with sea moss and elderberry flavor. A simple, ingredient-forward option for your weekly routine.',
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
        benefits: ['Simple ingredient', 'Daily routine', 'Sea moss gel']
      },
      {
        name: 'elderberry',
        icon: '🫐',
        benefits: ['Berry flavor', 'Tart', 'Refreshing']
      }
    ],
    categoryData: {
      name: 'Sea Moss Gels',
      icon: '🥄',
      description: 'Sea moss gel with elderberry'
    },
    benefitStory: 'A simple elderberry-flavored sea moss gel for weekly routines.',
    tags: ['elderberry', 'sea moss gel', 'vegan'],
    variations: [
      { id: 'var-eld-16oz', name: '16oz Jar', price: 35.00, inStock: true }
    ],
    stock: 'in_stock'
  },
  {
    id: 'demo-seamoss-lemonade-16oz',
    slug: 'sea-moss-lemonade-16oz',
    name: 'Sea Moss Lemonade - 16oz',
    description: 'Refreshing sea moss lemonade infused with real lemon juice and natural sweetness. A delicious way to enjoy sea moss in your weekly routine.',
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
        benefits: ['Simple ingredient', 'Hydration']
      },
      {
        name: 'lemon',
        icon: '🍋',
        benefits: ['Citrus flavor', 'Refreshing', 'Natural']
      }
    ],
    categoryData: {
      name: 'Lemonades',
      icon: '🍋',
      description: 'Refreshing sea moss lemonades'
    },
    benefitStory: 'A refreshing sea moss lemonade for your weekly routine.',
    tags: ['lemonade', 'refreshing', 'citrus', 'hydration', 'vegan'],
    variations: [
      { id: 'var-lem-16oz', name: '16oz Bottle', price: 28.00, inStock: true }
    ],
    stock: 'in_stock'
  },
  {
    id: 'demo-purple-seamoss-gel-16oz',
    slug: 'purple-sea-moss-gel-16oz',
    name: 'Purple Sea Moss Gel - 16oz',
    description: 'Small-batch purple sea moss gel with a unique color and simple ingredient list.',
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
        benefits: ['Simple ingredient', 'Purple sea moss', 'Unique color']
      }
    ],
    categoryData: {
      name: 'Sea Moss Gels',
      icon: '🥄',
      description: 'Premium purple sea moss'
    },
    benefitStory: 'Our rare Purple Sea Moss offers the ocean\'s bounty with its striking color and wellness-supporting compounds.',
    tags: ['purple', 'sea moss gel', 'vegan'],
    variations: [
      { id: 'var-pur-16oz', name: '16oz Jar', price: 38.00, inStock: true }
    ],
    stock: 'in_stock'
  },
  {
    id: 'demo-grateful-defense-shot',
    slug: 'grateful-defense',
    name: 'Elderberry Ginger Shot - 2oz',
    description: 'Elderberry, cranberry, apple, ginger, lemon, echinacea, sea moss, and alkaline water in a concentrated 2oz bottle.',
    price: 5.00,
    priceCents: 500,
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=800&fit=crop'
    ],
    category: 'shot',
    intelligentCategory: 'Shots',
    featured: true,
    ingredients: [
      {
        name: 'sea moss',
        icon: '🌊',
        benefits: ['Minerals', 'Wellness']
      },
      {
        name: 'ginger',
        icon: '🫚',
        benefits: ['Digestive Support', 'Warming']
      },
      {
        name: 'elderberry',
        icon: '🫐',
        benefits: ['Immune-season routine', 'Berry flavor']
      },
      {
        name: 'lemon',
        icon: '🍋',
        benefits: ['Bright flavor', 'Citrus']
      }
    ],
    categoryData: {
      name: 'Wellness Shots',
      icon: '💪',
      description: 'Concentrated wellness shots'
    },
    benefitStory: 'One concentrated elderberry-forward shot featuring sea moss, ginger, lemon, cranberry, apple, and echinacea for a quick weekly market routine.',
    tags: ['wellness shot', 'ginger', 'elderberry', 'grateful defense', 'immune routine'],
    variations: [
      { id: 'var-shot-single', name: 'Single Shot (2oz)', price: 5.00, inStock: true },
      { id: 'var-shot-pack', name: '7-Day Pack', price: 35.00, inStock: true }
    ],
    stock: 'in_stock'
  },
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
