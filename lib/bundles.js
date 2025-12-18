import { PRODUCTS } from '@/lib/products';

export const PRODUCT_BUNDLES = [
  {
    id: 'wellness-starter-pack',
    name: 'Wellness Starter Pack',
    description: 'Perfect introduction to sea moss wellness. Everything you need to kickstart your health journey.',
    products: ['elderberry-moss', 'grateful-guardian', 'gratitude-defense'],
    discountPercent: 15,
    badge: 'Best Value',
    featured: true
  },
  {
    id: 'energy-boost-bundle',
    name: 'Energy Boost Bundle',
    description: 'Natural energy and vitality boost. Power through your day with these invigorating blends.',
    products: ['blue-lotus', 'golden-glow-gel', 'rejuvenate'],
    discountPercent: 12,
    badge: 'Popular',
    featured: true
  },
  {
    id: 'family-pack',
    name: 'Family Pack',
    description: 'Stock up and save big. Perfect for households that prioritize wellness together.',
    products: ['healing-harmony', 'pineapple-basil', 'apple-cranberry', 'supplemint'],
    discountPercent: 20,
    badge: 'Best Savings',
    featured: true
  },
  {
    id: 'immunity-shield',
    name: 'Immunity Shield Bundle',
    description: 'Fortify your defenses naturally. A powerful combination for immune system support.',
    products: ['elderberry-moss', 'grateful-guardian', 'spicy-bloom'],
    discountPercent: 15,
    badge: 'Immune Boost',
    featured: false
  },
  {
    id: 'detox-refresh',
    name: 'Detox & Refresh Bundle',
    description: 'Cleanse and rejuvenate your body. Natural detox support for a fresh start.',
    products: ['kissed-by-gods', 'rejuvenate', 'supplemint'],
    discountPercent: 10,
    badge: 'Cleanse',
    featured: false
  }
];

export const FREQUENTLY_BOUGHT_TOGETHER = {
  'elderberry-moss': ['grateful-guardian', 'gratitude-defense'],
  'healing-harmony': ['floral-tide', 'pineapple-basil'],
  'golden-glow-gel': ['rejuvenate', 'spicy-bloom'],
  'blue-lotus': ['grateful-greens', 'golden-glow-gel'],
  'grateful-greens': ['blue-lotus', 'kissed-by-gods'],
  'floral-tide': ['healing-harmony', 'apple-cranberry'],
  'pineapple-basil': ['pineapple-mango', 'supplemint'],
  'apple-cranberry': ['grateful-guardian', 'pineapple-basil'],
  'grateful-guardian': ['elderberry-moss', 'gratitude-defense'],
  'rejuvenate': ['golden-glow-gel', 'kissed-by-gods'],
  'supplemint': ['pineapple-basil', 'rejuvenate'],
  'pineapple-mango': ['pineapple-basil', 'pineapple-melon'],
  'kissed-by-gods': ['grateful-greens', 'rejuvenate'],
  'gratitude-defense': ['spicy-bloom', 'elderberry-moss'],
  'spicy-bloom': ['gratitude-defense', 'golden-glow-gel']
};

export const UPSELL_OPTIONS = {
  'gratitude-defense': {
    upgradeProductId: 'elderberry-moss',
    message: 'Upgrade to full-size gel for 7x more!',
    savingsPercent: 40
  },
  'spicy-bloom': {
    upgradeProductId: 'floral-tide',
    message: 'Get the full 16oz for all-day energy!',
    savingsPercent: 35
  }
};

export function getProductById(productId) {
  return PRODUCTS.find(p => p.id === productId || p.slug === productId);
}

export function getBundleWithProducts(bundleId) {
  const bundle = PRODUCT_BUNDLES.find(b => b.id === bundleId);
  if (!bundle) return null;
  
  const products = bundle.products
    .map(pid => getProductById(pid))
    .filter(Boolean);
  
  const originalTotal = products.reduce((sum, p) => sum + (p.price || 0), 0);
  const discountAmount = originalTotal * (bundle.discountPercent / 100);
  const bundlePrice = originalTotal - discountAmount;
  
  return {
    ...bundle,
    productDetails: products,
    originalTotal,
    discountAmount,
    bundlePrice,
    savings: discountAmount
  };
}

export function getAllBundlesWithProducts() {
  return PRODUCT_BUNDLES.map(bundle => getBundleWithProducts(bundle.id)).filter(Boolean);
}

export function getFeaturedBundles() {
  return getAllBundlesWithProducts().filter(b => b.featured);
}

export function getFrequentlyBoughtTogether(productId) {
  const relatedIds = FREQUENTLY_BOUGHT_TOGETHER[productId] || [];
  const mainProduct = getProductById(productId);
  
  if (!mainProduct) return null;
  
  const relatedProducts = relatedIds
    .map(pid => getProductById(pid))
    .filter(Boolean);
  
  if (relatedProducts.length === 0) return null;
  
  const allProducts = [mainProduct, ...relatedProducts];
  const totalPrice = allProducts.reduce((sum, p) => sum + (p.price || 0), 0);
  const discountPercent = 10;
  const discountAmount = totalPrice * (discountPercent / 100);
  const bundlePrice = totalPrice - discountAmount;
  
  return {
    mainProduct,
    relatedProducts,
    allProducts,
    totalPrice,
    discountPercent,
    discountAmount,
    bundlePrice
  };
}

export function getUpsellOption(productId) {
  const upsell = UPSELL_OPTIONS[productId];
  if (!upsell) return null;
  
  const currentProduct = getProductById(productId);
  const upgradeProduct = getProductById(upsell.upgradeProductId);
  
  if (!currentProduct || !upgradeProduct) return null;
  
  const priceDifference = upgradeProduct.price - currentProduct.price;
  
  return {
    currentProduct,
    upgradeProduct,
    message: upsell.message,
    savingsPercent: upsell.savingsPercent,
    priceDifference,
    valueMultiplier: (upgradeProduct.price / currentProduct.price).toFixed(1)
  };
}
