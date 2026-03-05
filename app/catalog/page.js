import CatalogPageClient from '@/components/catalog/CatalogPageClient';
import { getUnifiedProducts } from '@/lib/product-sync-engine';
import { getCategoriesWithCounts } from '@/lib/ingredient-taxonomy';
import { getDemoProducts, getDemoCategories } from '@/lib/demo-products';
import { logger } from '@/lib/logger';

export const revalidate = 300;

async function getCatalogBootstrap() {
  try {
    const products = await getUnifiedProducts({});
    if (Array.isArray(products) && products.length > 0) {
      return {
        products,
        categories: getCategoriesWithCounts(products)
      };
    }
  } catch (error) {
    logger.warn('CatalogPage', 'Server bootstrap failed, using demo fallback', {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return {
    products: getDemoProducts(),
    categories: getDemoCategories()
  };
}

export default async function CatalogPage() {
  const { products, categories } = await getCatalogBootstrap();

  return (
    <CatalogPageClient
      initialProducts={products}
      initialCategories={categories}
    />
  );
}
