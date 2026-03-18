import CatalogPageClient from '@/components/catalog/CatalogPageClient';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';

export const revalidate = 300;

async function getCatalogBootstrap() {
  const snapshot = await getStorefrontCatalogSnapshot({});

  return {
    products: snapshot.products,
    categories: snapshot.categories
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
