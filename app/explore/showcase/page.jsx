export const dynamic = 'force-dynamic';

import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';
import { getCategoriesWithCounts } from '@/lib/ingredient-taxonomy';
import ShowcaseClient from './ShowcaseClient';

export const revalidate = 300;

async function getShowcaseData() {
  const snapshot = await getStorefrontCatalogSnapshot({});
  
  console.log('[Showcase] Catalog snapshot:', {
    productCount: snapshot.products?.length,
    categoryCount: snapshot.categories?.length,
    source: snapshot.source,
    isFallback: snapshot.isFallback,
    message: snapshot.message
  });
  
  return {
    products: snapshot.products || [],
    categories: snapshot.categories?.length > 0 
      ? snapshot.categories 
      : getCategoriesWithCounts(snapshot.products || [])
  };
}

export default async function ShowcasePage() {
  const { products, categories } = await getShowcaseData();

  return (
    <ShowcaseClient 
      initialProducts={products}
      initialCategories={categories}
    />
  );
}
