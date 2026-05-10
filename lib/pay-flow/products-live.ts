/**
 * 🚀 Gratog Pay Flow — Live Product Data
 * Connects to existing Gratog product infrastructure
 * Uses storefront-products.js pattern
 */

import type { PayFlowProduct, PayFlowCategory } from './types';

// ============================================
// TRANSFORM: Gratog Product → PayFlow Product
// ============================================

interface GratogProduct {
  id: string;
  name: string;
  description?: string;
  price: number; // dollars
  priceCents?: number;
  images?: string[];
  image?: string;
  category?: string;
  categoryId?: string;
  ingredients?: string[];
  ingredientHighlights?: string[];
  available?: boolean;
  inStock?: boolean;
  stockQuantity?: number;
  quantity?: number;
  tags?: string[];
  isPopular?: boolean;
  isNew?: boolean;
  originalPrice?: number;
  variations?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  upsells?: Array<{
    id: string;
    name: string;
    price: number;
    description?: string;
  }>;
  squareData?: {
    itemId?: string;
    variationId?: string;
    catalogObjectId?: string;
  };
}

/**
 * Transform Gratog product format to PayFlow format
 */
export function transformToPayFlowProduct(product: GratogProduct): PayFlowProduct | null {
  // Skip only if explicitly disabled (available === false)
  // Allow preorder / out-of-stock items so they appear in the feed
  if (product.available === false) {
    return null;
  }
  
  // Determine price in cents
  const priceCents = product.priceCents 
    || Math.round((product.price || 0) * 100);
  
  // Determine category
  const category = mapToPayFlowCategory(product.category || product.categoryId);
  
  // Build ingredients string (1-line highlight)
  const ingredients = product.ingredientHighlights?.join(', ')
    || (Array.isArray(product.ingredients)
      ? product.ingredients.slice(0, 3).map((i: any) => typeof i === 'string' ? i : i?.name || '').filter(Boolean).join(', ')
      : '')
    || product.description?.split('\n')[0]?.replace(/^Ingredients:\s*/i, '').slice(0, 80)
    || '';
  
  // Get stock quantity
  const stockQuantity = product.stockQuantity 
    || product.quantity 
    || 10; // Default if unknown
  
  // Get image — only use real URLs, not fabricated paths
  const image = product.images?.[0] 
    || product.image 
    || '';
  
  // Transform tags
  const tags: PayFlowProduct['tags'] = [];
  if (product.isPopular) tags.push('popular');
  if (product.tags?.includes('boba')) tags.push('boba-compatible');
  if (product.tags?.includes('refresher')) tags.push('refresher-base');
  if (product.tags?.includes('immune')) tags.push('immune-boost');
  if (product.tags?.includes('energy')) tags.push('energy');
  if (product.tags?.includes('detox')) tags.push('detox');
  
  return {
    id: product.squareData?.catalogObjectId || product.id,
    name: product.name,
    category,
    priceCents,
    image,
    ingredients,
    available: product.available !== false,
    stockQuantity: product.inStock === false ? 0 : stockQuantity,
    tags,
    upsells: product.upsells || getDefaultUpsells(category),
    isPopular: product.isPopular,
    isNew: product.isNew,
    originalPriceCents: product.originalPrice 
      ? Math.round(product.originalPrice * 100) 
      : undefined
  };
}

/**
 * Map Gratog category to PayFlow category
 */
function mapToPayFlowCategory(gratogCategory?: string): PayFlowCategory {
  if (!gratogCategory) return 'specials';
  
  const cat = gratogCategory.toLowerCase();
  
  if (cat.includes('lemonade') || cat.includes('juice')) return 'lemonades';
  if (cat.includes('moss') || cat.includes('sea')) return 'sea-moss';
  if (cat.includes('refresher')) return 'refreshers';
  if (cat.includes('boba') || cat.includes('bubble')) return 'boba';
  if (cat.includes('shot') || cat.includes('wellness')) return 'specials';
  if (cat.includes('special') || cat.includes('bundle')) return 'specials';
  
  return 'specials';
}

/**
 * Default upsells by category
 */
function getDefaultUpsells(category: PayFlowCategory): PayFlowProduct['upsells'] {
  const upsellsByCategory: Record<PayFlowCategory, PayFlowProduct['upsells']> = {
    lemonades: [
      { id: 'boba', name: 'Add Boba', priceCents: 100, description: 'Chewy tapioca pearls' },
      { id: 'large', name: 'Make it Large', priceCents: 200 }
    ],
    juices: [
      { id: 'shot', name: 'Add Wellness Shot', priceCents: 300 },
      { id: 'large', name: 'Make it Large', priceCents: 250 }
    ],
    'sea-moss': [],
    refreshers: [
      { id: 'boba', name: 'Add Boba', priceCents: 100 },
      { id: 'large', name: 'Make it Large', priceCents: 200 }
    ],
    boba: [
      { id: 'large', name: 'Make it Large', priceCents: 200 }
    ],
    specials: [],
    all: []
  };
  
  return upsellsByCategory[category] || [];
}

// ============================================
// API FETCH FUNCTIONS
// ============================================

/**
 * Fetch products from Gratog storefront API
 * Mirrors pattern from lib/storefront-products.js
 */
export async function fetchLiveProducts(signal?: AbortSignal): Promise<PayFlowProduct[]> {
  try {
    // Use the unified products API (same source as catalog/shop pages)
    const response = await fetch('/api/products', {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
      signal
    });
    
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }
    
    if (!response.ok) {
      throw new Error(`Storefront API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.products || !Array.isArray(data.products)) {
      throw new Error('Invalid response format');
    }
    
    // Transform to PayFlow format
    const payFlowProducts = data.products
      .map(transformToPayFlowProduct)
      .filter(Boolean) as PayFlowProduct[];
    
    return payFlowProducts;
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    console.error('Failed to fetch live products:', error);
    
    // Fallback to demo products for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using demo products — check storefront API');
      return getDemoPayFlowProducts();
    }
    
    throw error;
  }
}

/**
 * Fetch products from admin API (fallback)
 */
export async function fetchAdminProducts(signal?: AbortSignal): Promise<PayFlowProduct[]> {
  try {
    const response = await fetch('/api/admin/products', {
      cache: 'no-store',
      signal
    });
    
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }
    
    if (!response.ok) {
      throw new Error(`Admin API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    const payFlowProducts = (data.products || [])
      .map(transformToPayFlowProduct)
      .filter(Boolean) as PayFlowProduct[];
    
    return payFlowProducts;
    
  } catch (error) {
    console.error('Failed to fetch admin products:', error);
    throw error;
  }
}

// ============================================
// DEMO PRODUCTS (Development Only)
// ============================================

function getDemoPayFlowProducts(): PayFlowProduct[] {
  // Import from data.ts for demo
  // In a real build, this would be tree-shaken in production
  return [
    {
      id: 'lm-001',
      name: 'Classic Lemonade',
      category: 'lemonades',
      priceCents: 600,
      image: '/images/products/classic-lemonade.jpg',
      ingredients: 'Fresh lemons, cane sugar, filtered water',
      available: true,
      stockQuantity: 24,
      tags: ['popular'],
      upsells: [
        { id: 'boba', name: 'Add Boba', priceCents: 100 },
        { id: 'large', name: 'Make it Large', priceCents: 200 }
      ],
      isPopular: true
    },
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
    }
  ];
}

// ============================================
// EXPORTS
// ============================================

export { getDemoPayFlowProducts };

// Re-export helpers
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

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
