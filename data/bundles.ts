export interface ProductBundle {
  id: string;
  slug: string;
  name: string;
  productsIncluded: string[];
  description: string;
  savingsText: string;
  cta: string;
  checkoutMode: 'square-compatible-placeholder' | 'catalog-products';
  squareCheckoutNote: string;
  featured?: boolean;
}

export const BUNDLES: ProductBundle[] = [
  {
    id: 'starter-box',
    slug: 'starter-box',
    name: 'Starter Box',
    productsIncluded: ['kissed-by-gods', 'strawberry-bliss', 'blue-lotus-gel', 'spicy-bloom'],
    description: 'A first-week path with two drinks, one gel, and one shot so new customers can taste the range without guessing.',
    savingsText: 'Curated selection. Bundle savings will apply once Square bundle SKUs are live.',
    cta: 'Build your Starter Box',
    checkoutMode: 'square-compatible-placeholder',
    squareCheckoutNote: 'Use included product IDs as Square line items until a dedicated Square bundle variation exists.',
    featured: true,
  },
  {
    id: 'weekly-wellness-box',
    slug: 'weekly-wellness-box',
    name: 'Weekly Routine Box',
    productsIncluded: ['kissed-by-gods', 'supplemint', 'strawberry-bliss', 'black-minerals', 'grateful-greens-gel'],
    description: 'Four weekly drinks plus one gel for customers who already know they want a routine.',
    savingsText: 'Curated weekly set. Individual item prices apply at checkout.',
    cta: 'Plan my week',
    checkoutMode: 'square-compatible-placeholder',
    squareCheckoutNote: 'Can be represented as five Square catalog line items or a future Square bundle item.',
    featured: true,
  },
  {
    id: 'market-favorites',
    slug: 'market-favorites',
    name: 'Market Favorites',
    productsIncluded: ['kissed-by-gods', 'supplemint', 'strawberry-bliss'],
    description: 'The three bottles most likely to convert walk-up shoppers into weekly reorder customers.',
    savingsText: 'Popular market-day set. Individual item prices apply at checkout.',
    cta: 'Shop the favorites',
    checkoutMode: 'catalog-products',
    squareCheckoutNote: 'All included items should map to individual Square products when live catalog is synced.',
    featured: true,
  },
  {
    id: 'mineral-reset',
    slug: 'mineral-reset',
    name: 'Warm-Spice & Greens Box',
    productsIncluded: ['black-minerals', 'grateful-greens-gel', 'grateful-defense'],
    description: 'A mineral-focused path with one bold drink, one greens gel, and one elderberry-forward shot.',
    savingsText: 'Curated warm-spice set. Individual item prices apply at checkout.',
    cta: 'Start the reset',
    checkoutMode: 'square-compatible-placeholder',
    squareCheckoutNote: 'Use product IDs as individual line items until a dedicated Square bundle SKU exists.',
    featured: false,
  },
  {
    id: 'hydration-refresh-box',
    slug: 'hydration-refresh-box',
    name: 'Summer Refresher Box',
    productsIncluded: ['strawberry-rose-ginger', 'cucumber-mint-ginger', 'electric-melon', 'peach-refresher'],
    description: 'A lighter refresher collection for hot market days, first-time customers, and hydration routines.',
    savingsText: 'Seasonal refresher set. Individual item prices apply at checkout.',
    cta: 'Refresh my week',
    checkoutMode: 'square-compatible-placeholder',
    squareCheckoutNote: 'Can be built from individual refresher line items or activated as a Square bundle later.',
    featured: false,
  },
];

export function getFeaturedBundles() {
  return BUNDLES.filter((bundle) => bundle.featured);
}

export function getBundleBySlug(slug: string) {
  return BUNDLES.find((bundle) => bundle.slug === slug || bundle.id === slug) || null;
}
