export const dynamic = 'force-dynamic';

import CatalogPageClient from '@/components/catalog/CatalogPageClient';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';

export const revalidate = 300;

export const metadata = {
  title: 'Shop Online in Georgia | Taste of Gratitude',
  description: 'Shop sea moss gels, lemonades, refreshers, and small-batch favorites online in Georgia. Eligible delivery and in-state shipping; separate market preorders available.',
  alternates: { canonical: '/catalog' },
  openGraph: {
    title: 'Shop Taste of Gratitude Online in Georgia',
    description: 'Explore fresh drinks and sea moss for Georgia customers. Select eligible Georgia fulfillment or market preorder pickup.',
    url: 'https://tasteofgratitude.shop/catalog',
    images: [{ url: '/images/gratog-bg.PNG', width: 1200, height: 630 }],
  },
};

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
    <main id="catalog-main">
      <CatalogPageClient
        initialProducts={products}
        initialCategories={categories}
      />
    </main>
  );
}
