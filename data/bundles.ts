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
    savingsText: 'Bundle pricing ready for Square setup; founder can activate savings when bundle SKUs are created.',
    cta: 'Build your Starter Box',
    checkoutMode: 'square-compatible-placeholder',
    squareCheckoutNote: 'Use included product IDs as Square line items until a dedicated Square bundle variation exists.',
    featured: true,
  },
  {
    id: 'weekly-wellness-box',
    slug: 'weekly-wellness-box',
    name: 'Weekly Wellness Box',
    productsIncluded: ['kissed-by-gods', 'supplemint', 'strawberry-bliss', 'black-minerals', 'grateful-greens-gel'],
    description: 'Four weekly drinks plus one gel for customers who already know they want a routine.',
    savingsText: 'Perfect subscription precursor: set a weekly bundle discount once Square bundle inventory is active.',
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
    savingsText: 'Great for a 3-pack market pickup incentive.',
    cta: 'Shop the favorites',
    checkoutMode: 'catalog-products',
    squareCheckoutNote: 'All included items should map to individual Square products when live catalog is synced.',
    featured: true,
  },
  {
    id: 'mineral-reset',
    slug: 'mineral-reset',
    name: 'Mineral Reset',
    productsIncluded: ['black-minerals', 'grateful-greens-gel', 'grateful-defense'],
    description: 'A mineral-focused path with one bold drink, one greens gel, and one elderberry-forward shot.',
    savingsText: 'Designed for reset campaigns, referral rewards, and subscription testing.',
    cta: 'Start the reset',
    checkoutMode: 'square-compatible-placeholder',
    squareCheckoutNote: 'Use product IDs as individual line items until a dedicated Square bundle SKU exists.',
    featured: false,
  },
  {
    id: 'hydration-refresh-box',
    slug: 'hydration-refresh-box',
    name: 'Hydration Refresh Box',
    productsIncluded: ['strawberry-rose-ginger', 'cucumber-mint-ginger', 'electric-melon', 'peach-refresher'],
    description: 'A lighter refresher collection for hot market days, first-time customers, and hydration routines.',
    savingsText: 'Use as a seasonal pickup box or summer weekly drop.',
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
