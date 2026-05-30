/**
 * 🚀 Gratog Pay Flow — Sample Product Catalog
 * Realistic data for market testing
 */

import type { PayFlowProduct } from './types';

export const SAMPLE_PRODUCTS: PayFlowProduct[] = [
  // LEMONADES
  {
    id: 'lm-001',
    name: 'Classic Lemonade',
    category: 'lemonades',
    priceCents: 600, // $6.00
    image: '/images/products/classic-lemonade.jpg',
    ingredients: 'Fresh lemons, cane sugar, filtered water',
    available: true,
    stockQuantity: 24,
    tags: ['popular'],
    upsells: [
      { id: 'boba', name: 'Add Boba', priceCents: 100, description: 'Chewy tapioca pearls' },
      { id: 'large', name: 'Make it Large', priceCents: 200 }
    ],
    isPopular: true
  },
  {
    id: 'lm-002',
    name: 'Strawberry Lemonade',
    category: 'lemonades',
    priceCents: 700,
    image: '/images/products/strawberry-lemonade.jpg',
    ingredients: 'Fresh strawberries, lemons, agave nectar',
    available: true,
    stockQuantity: 18,
    tags: ['popular', 'boba-compatible'],
    upsells: [
      { id: 'boba', name: 'Add Boba', priceCents: 100 },
      { id: 'large', name: 'Make it Large', priceCents: 200 }
    ],
    isPopular: true
  },
  {
    id: 'lm-003',
    name: 'Lavender Lemonade',
    category: 'lemonades',
    priceCents: 750,
    image: '/images/products/lavender-lemonade.jpg',
    ingredients: 'Culinary lavender, fresh lemons, honey',
    available: true,
    stockQuantity: 12,
    tags: ['boba-compatible'],
    upsells: [
      { id: 'boba', name: 'Add Boba', priceCents: 100 },
      { id: 'large', name: 'Make it Large', priceCents: 200 }
    ]
  },
  {
    id: 'lm-004',
    name: 'Ginger Lemonade',
    category: 'lemonades',
    priceCents: 700,
    image: '/images/products/ginger-lemonade.jpg',
    ingredients: 'Fresh ginger root, lemons, maple syrup',
    available: true,
    stockQuantity: 8,
    tags: ['immune-boost'],
    upsells: [
      { id: 'boba', name: 'Add Boba', priceCents: 100 },
      { id: 'large', name: 'Make it Large', priceCents: 200 }
    ]
  },

  // JUICES
  {
    id: 'jc-001',
    name: 'Green Glow',
    category: 'juices',
    priceCents: 850,
    image: '/images/products/green-glow.jpg',
    ingredients: 'Kale, cucumber, celery, apple, lemon, ginger',
    available: true,
    stockQuantity: 15,
    tags: ['popular', 'detox', 'immune-boost'],
    upsells: [
      { id: 'large', name: 'Make it Large', priceCents: 250 },
      { id: 'shot', name: 'Add Wellness Shot', priceCents: 300 }
    ],
    isPopular: true
  },
  {
    id: 'jc-002',
    name: 'Sunrise Citrus',
    category: 'juices',
    priceCents: 800,
    image: '/images/products/sunrise-citrus.jpg',
    ingredients: 'Orange, grapefruit, turmeric, black pepper',
    available: true,
    stockQuantity: 20,
    tags: ['immune-boost', 'energy'],
    upsells: [
      { id: 'large', name: 'Make it Large', priceCents: 250 }
    ]
  },
  {
    id: 'jc-003',
    name: 'Beet Bliss',
    category: 'juices',
    priceCents: 850,
    image: '/images/products/beet-bliss.jpg',
    ingredients: 'Beet, carrot, apple, ginger, lemon',
    available: true,
    stockQuantity: 10,
    tags: ['energy'],
    upsells: [
      { id: 'large', name: 'Make it Large', priceCents: 250 }
    ]
  },
  {
    id: 'jc-004',
    name: 'Tropical Green',
    category: 'juices',
    priceCents: 900,
    image: '/images/products/tropical-green.jpg',
    ingredients: 'Spinach, pineapple, mango, coconut water',
    available: true,
    stockQuantity: 6,
    tags: ['detox', 'energy'],
    upsells: [
      { id: 'large', name: 'Make it Large', priceCents: 250 }
    ]
  },

  // SEA MOSS GEL
  {
    id: 'sm-001',
    name: 'Original Sea Moss Gel',
    category: 'sea-moss',
    priceCents: 2500,
    image: '/images/products/sea-moss-original.jpg',
    ingredients: 'Wildcrafted sea moss, spring water, key lime',
    available: true,
    stockQuantity: 20,
    tags: ['popular', 'immune-boost'],
    isPopular: true
  },
  {
    id: 'sm-002',
    name: 'Dragonfruit Sea Moss',
    category: 'sea-moss',
    priceCents: 2800,
    image: '/images/products/sea-moss-dragonfruit.jpg',
    ingredients: 'Sea moss, dragonfruit, agave, lime',
    available: true,
    stockQuantity: 14,
    tags: ['immune-boost'],
    isNew: true
  },
  {
    id: 'sm-003',
    name: 'Mango Sea Moss',
    category: 'sea-moss',
    priceCents: 2800,
    image: '/images/products/sea-moss-mango.jpg',
    ingredients: 'Sea moss, fresh mango, coconut water',
    available: true,
    stockQuantity: 4,
    // @ts-ignore — type mismatch
    tags: ['immune-boost', 'low-stock']
  },

  // REFRESHERS
  {
    id: 'rf-001',
    name: 'Cucumber Mint Refresher',
    category: 'refreshers',
    priceCents: 650,
    image: '/images/products/cucumber-mint.jpg',
    ingredients: 'Cucumber, fresh mint, lime, agave',
    available: true,
    stockQuantity: 22,
    tags: ['popular', 'refresher-base', 'boba-compatible'],
    upsells: [
      { id: 'boba', name: 'Add Boba', priceCents: 100 },
      { id: 'large', name: 'Make it Large', priceCents: 200 }
    ],
    isPopular: true
  },
  {
    id: 'rf-002',
    name: 'Watermelon Basil',
    category: 'refreshers',
    priceCents: 700,
    image: '/images/products/watermelon-basil.jpg',
    ingredients: 'Fresh watermelon, basil, lime, hint of salt',
    available: true,
    stockQuantity: 16,
    tags: ['refresher-base', 'boba-compatible'],
    upsells: [
      { id: 'boba', name: 'Add Boba', priceCents: 100 },
      { id: 'large', name: 'Make it Large', priceCents: 200 }
    ]
  },
  {
    id: 'rf-003',
    name: 'Hibiscus Cooler',
    category: 'refreshers',
    priceCents: 650,
    image: '/images/products/hibiscus-cooler.jpg',
    ingredients: 'Hibiscus flowers, ginger, lime, agave',
    available: true,
    stockQuantity: 14,
    tags: ['refresher-base', 'boba-compatible'],
    upsells: [
      { id: 'boba', name: 'Add Boba', priceCents: 100 },
      { id: 'large', name: 'Make it Large', priceCents: 200 }
    ]
  },

  // BOBA
  {
    id: 'bb-001',
    name: 'Brown Sugar Boba Milk',
    category: 'boba',
    priceCents: 750,
    image: '/images/products/boba-brown-sugar.jpg',
    ingredients: 'Brown sugar syrup, oat milk, tapioca pearls',
    available: true,
    stockQuantity: 30,
    tags: ['popular', 'boba-compatible'],
    upsells: [
      { id: 'large', name: 'Make it Large', priceCents: 200 }
    ],
    isPopular: true
  },
  {
    id: 'bb-002',
    name: 'Taro Boba Latte',
    category: 'boba',
    priceCents: 800,
    image: '/images/products/boba-taro.jpg',
    ingredients: 'Taro paste, oat milk, boba pearls',
    available: true,
    stockQuantity: 20,
    tags: ['boba-compatible'],
    upsells: [
      { id: 'large', name: 'Make it Large', priceCents: 200 }
    ]
  },
  {
    id: 'bb-003',
    name: 'Matcha Boba',
    category: 'boba',
    priceCents: 850,
    image: '/images/products/boba-matcha.jpg',
    ingredients: 'Ceremonial matcha, oat milk, boba pearls',
    available: true,
    stockQuantity: 12,
    tags: ['boba-compatible', 'energy'],
    upsells: [
      { id: 'large', name: 'Make it Large', priceCents: 200 }
    ]
  },
  {
    id: 'bb-004',
    name: 'Thai Tea Boba',
    category: 'boba',
    priceCents: 750,
    image: '/images/products/boba-thai.jpg',
    ingredients: 'Thai tea blend, condensed oat milk, boba',
    available: false, // SOLD OUT for demo
    stockQuantity: 0,
    tags: ['boba-compatible'],
    upsells: [
      { id: 'large', name: 'Make it Large', priceCents: 200 }
    ]
  },

  // SPECIALS
  {
    id: 'sp-001',
    name: 'Immunity Bundle',
    category: 'specials',
    priceCents: 2200,
    originalPriceCents: 2800,
    image: '/images/products/immunity-bundle.jpg',
    ingredients: 'Green Glow + Sea Moss Shot + Ginger Lemonade',
    available: true,
    stockQuantity: 10,
    tags: ['popular', 'immune-boost'],
    isPopular: true
  },
  {
    id: 'sp-002',
    name: 'Couples Refresher Pack',
    category: 'specials',
    priceCents: 1800,
    originalPriceCents: 2400,
    image: '/images/products/couples-pack.jpg',
    ingredients: 'Any 2 refreshers + 2 lemonades',
    available: true,
    stockQuantity: 8,
    tags: ['refresher-base']
  },
  {
    id: 'sp-003',
    name: 'Boba Lover Box',
    category: 'specials',
    priceCents: 3200,
    originalPriceCents: 4000,
    image: '/images/products/boba-box.jpg',
    ingredients: '4 boba drinks of your choice',
    available: true,
    stockQuantity: 5,
    // @ts-ignore — type mismatch
    tags: ['boba-compatible', 'low-stock']
  }
];

// Category display order
export const CATEGORY_ORDER = [
  'lemonades',
  'juices', 
  'sea-moss',
  'refreshers',
  'boba',
  'specials'
] as const;

// Helper to get products by category
export function getProductsByCategory(category: string): PayFlowProduct[] {
  if (category === 'all') return SAMPLE_PRODUCTS.filter(p => p.available);
  return SAMPLE_PRODUCTS.filter(p => p.category === category && p.available);
}

// Helper to format price
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Helper to get availability badge
export function getAvailabilityBadge(product: PayFlowProduct): { 
  text: string; 
  variant: 'available' | 'low' | 'sold-out' 
} {
  if (!product.available || product.stockQuantity === 0) {
    return { text: 'Sold Out', variant: 'sold-out' };
  }
  if (product.stockQuantity <= 5) {
    return { text: `${product.stockQuantity} Left`, variant: 'low' };
  }
  if (product.isPopular) {
    return { text: 'Popular', variant: 'available' };
  }
  return { text: 'Available', variant: 'available' };
}
