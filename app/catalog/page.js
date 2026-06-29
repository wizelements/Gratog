export const dynamic = 'force-dynamic';

import CatalogPageClient from '@/components/catalog/CatalogPageClient';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';

export const revalidate = 300;

export const metadata = {
  title: 'Shop Weekly Market Products | Taste of Gratitude',
  description: 'Shop the current Taste of Gratitude weekly market catalog: sea moss gels, fresh lemonades, refreshers, wellness shots, and pickup-ready staples.',
  alternates: { canonical: '/catalog' },
  openGraph: {
    title: 'Shop Taste of Gratitude Weekly Market Products',
    description: 'Fresh small-batch sea moss gels, drinks, refreshers, and shots for Atlanta market pickup.',
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
    <CatalogPageClient
      initialProducts={products}
      initialCategories={categories}
    />
  );
}
