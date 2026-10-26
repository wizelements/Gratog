/** Customer-facing bundles: lemonade four- and six-packs only. */
export interface ProductBundle {
  id: string; slug: string; name: string; productsIncluded: string[];
  description: string; savingsText: string; cta: string;
  checkoutMode: 'catalog-products'; squareCheckoutNote: string; featured?: boolean;
}
export const BUNDLES: ProductBundle[] = [
  {
    id: 'lemonade-four-pack', slug: 'lemonade-four-pack', name: 'Lemonade 4-Pack',
    productsIncluded: ['strawberry-bliss', 'supplemint', 'calm-waters', 'kissed-by-gods'],
    description: 'Choose any four eligible 16 oz lemonades. Mix flavors or repeat a favorite.',
    savingsText: '$43.99 · Save $3.97 compared with four $11.99 singles.',
    cta: 'Choose 4 lemonades',
    checkoutMode: 'catalog-products',
    squareCheckoutNote: 'Individual Square catalog variations, with server-priced bundle discount.',
    featured: true,
  },
  {
    id: 'lemonade-six-pack', slug: 'lemonade-six-pack', name: 'Lemonade 6-Pack',
    productsIncluded: ['strawberry-bliss', 'supplemint', 'calm-waters', 'kissed-by-gods', 'peach-lemonade'],
    description: 'Choose any six eligible 16 oz lemonades. Greater savings per bottle.',
    savingsText: '$62.99 · Save $8.95 compared with six $11.99 singles.',
    cta: 'Choose 6 lemonades',
    checkoutMode: 'catalog-products',
    squareCheckoutNote: 'Individual Square catalog variations, with server-priced bundle discount.',
    featured: true,
  },
];
export function getFeaturedBundles() { return BUNDLES.filter((bundle) => bundle.featured); }
export function getBundleBySlug(slug: string) {
  return BUNDLES.find((bundle) => bundle.slug === slug || bundle.id === slug) || null;
}
