/**
 * Enhanced Product Management with Square Integration
 * 
 * This replaces the static products.js with Square Catalog-driven product data.
 * Prices come from Square Catalog API, ensuring consistency with checkout.
 */

import { connectToDatabase } from './db-optimized';
import { fromMoney } from './money';

/**
 * Get all products from Square catalog cache
 */
export async function getProducts() {
  try {
    const { db } = await connectToDatabase();
    const products = await db.collection('square_products').find({}).toArray();
    
    return products.map(product => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      category: product.category,
      images: product.images,
      variations: product.variations.map(v => ({
        id: v.id,
        name: v.name,
        price: v.price, // Already in dollars from sync
        priceCents: v.priceCents,
        sku: v.sku,
        stock: v.stock || 0,
        trackInventory: v.trackInventory
      })),
      // Backward compatibility fields
      price: product.variations[0]?.price || 0,
      size: product.variations[0]?.name || 'Default',
      rewardPoints: calculateRewardPoints(product.category, product.variations[0]?.price || 0),
      featured: determineFeatured(product),
      squareCatalogId: product.squareCatalogId,
      lastSyncAt: product.lastSyncAt
    }));
    
  } catch (error) {
    console.error('Failed to get products from Square catalog:', error);
    
    // Fallback to static product data if Square sync fails
    return getFallbackProducts();
  }
}

/**
 * Get single product by slug with authoritative pricing
 */
export async function getProductBySlug(slug) {
  try {
    const { db } = await connectToDatabase();
    const product = await db.collection('square_products').findOne({ slug });
    
    if (!product) {
      return null;
    }
    
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      category: product.category,
      images: product.images,
      variations: product.variations,
      // Backward compatibility
      price: product.variations[0]?.price || 0,
      size: product.variations[0]?.name || 'Default',
      rewardPoints: calculateRewardPoints(product.category, product.variations[0]?.price || 0),
      squareCatalogId: product.squareCatalogId
    };
    
  } catch (error) {
    console.error('Failed to get product by slug:', error);
    return getFallbackProductBySlug(slug);
  }
}

/**
 * Get featured products
 */
export async function getFeaturedProducts() {
  const products = await getProducts();
  return products.filter(product => product.featured);
}

/**
 * Get products by category
 */
export async function getProductsByCategory(category) {
  const products = await getProducts();
  return products.filter(product => product.category === category);
}

/**
 * Calculate server-authoritative cart pricing using Square Orders API
 */
export async function calculateCartPricing(cartItems) {
  try {
    // Extract variation IDs and quantities for Square API
    const variationIds = cartItems.map(item => item.catalogObjectId || item.variationId);
    const quantities = cartItems.map(item => item.quantity || 1);
    
    const response = await fetch('/api/cart/price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        variationIds,
        quantities
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to calculate cart pricing');
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Cart pricing calculation failed');
    }
    
    return result.order;
    
  } catch (error) {
    console.error('Cart pricing calculation error:', error);
    
    // Fallback to client-side calculation
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + ((item.price || 0) * (item.quantity || 1));
    }, 0);
    
    return {
      totals: {
        subtotal,
        tax: subtotal * 0.08, // Estimate 8% tax
        discount: 0,
        total: subtotal * 1.08
      },
      lineItems: cartItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity
      }))
    };
  }
}

/**
 * Calculate reward points based on category and price
 */
function calculateRewardPoints(category, price) {
  const pointsMap = {
    'gel': 25,
    'lemonade': 15,
    'shot': 8,
    'default': 10
  };
  
  const basePoints = pointsMap[category?.toLowerCase()] || pointsMap.default;
  
  // Bonus points for higher-priced items
  if (price > 30) {
    return basePoints + 10;
  } else if (price > 20) {
    return basePoints + 5;
  }
  
  return basePoints;
}

/**
 * Determine if product should be featured
 */
function determineFeatured(product) {
  // Feature products with good images and reasonable pricing
  const hasImages = product.images && product.images.length > 0;
  const hasReasonablePrice = product.variations.some(v => v.price > 5 && v.price < 100);
  const isPopularCategory = ['gel', 'lemonade'].includes(product.category?.toLowerCase());
  
  return hasImages && hasReasonablePrice && isPopularCategory;
}

/**
 * Fallback product data (static) for when Square sync fails
 */
function getFallbackProducts() {
  return [
    {
      id: 'elderberry-moss',
      slug: 'elderberry-moss',
      name: 'Elderberry Moss',
      subtitle: 'Sea Moss Gel',
      description: 'Elderberry Moss Gels combine the natural benefits of sea moss and elderberry to support immune health.',
      price: 36.00,
      size: '16oz',
      category: 'gel',
      rewardPoints: 25,
      featured: true,
      images: [{
        url: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/CPFQJP5N2DGVL5US32BI5WFV.jpeg'
      }],
      variations: [{
        id: 'elderberry-moss-16oz',
        name: '16oz',
        price: 36.00,
        priceCents: 3600,
        stock: 10
      }]
    },
    {
      id: 'healing-harmony',
      slug: 'healing-harmony',
      name: 'Healing Harmony',
      subtitle: 'Soursop • Cinnamon • Star Anise',
      description: 'A harmonious blend featuring soursop, cinnamon, and star anise with sea moss.',
      price: 35.00,
      size: '16oz',
      category: 'gel',
      rewardPoints: 25,
      featured: true,
      images: [{
        url: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/ZHB653PNM4Q6HSEPML2YQRPP.jpeg'
      }],
      variations: [{
        id: 'healing-harmony-16oz',
        name: '16oz',
        price: 35.00,
        priceCents: 3500,
        stock: 8
      }]
    },
    {
      id: 'grateful-guardian',
      slug: 'grateful-guardian',
      name: 'Grateful Guardian',
      subtitle: 'Elderberry • Cranberry • Echinacea',
      description: 'A tangy immune powerhouse designed to boost immunity and support digestion.',
      price: 11.00,
      size: '16oz',
      category: 'lemonade',
      rewardPoints: 15,
      featured: true,
      images: [{
        url: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/BXLLKEBC55LYDWKNGR46FBOC.jpeg'
      }],
      variations: [{
        id: 'grateful-guardian-16oz',
        name: '16oz',
        price: 11.00,
        priceCents: 1100,
        stock: 15
      }]
    }
  ];
}

function getFallbackProductBySlug(slug) {
  return getFallbackProducts().find(p => p.slug === slug) || null;
}

/**
 * Backward compatibility function
 */
export function calculateRewardPoints(productIds) {
  // This is for backward compatibility with existing code
  return productIds.length * 15; // Average points per product
}