export const dynamic = 'force-dynamic';

import CatalogPageClient from '@/components/catalog/CatalogPageClient';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';
import { headers } from 'next/headers';
import { assertPreviewDatabaseIsolation } from '@/lib/preview-db-isolation';
import { connectToDatabase } from '@/lib/db-optimized';

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
  let products = snapshot.products;
  // Never manufacture merchant stock. The QA fixture is shown only on
  // an explicitly authorized, isolated Preview certification request.
  const requestHeaders = await headers();
  if (
    process.env.VERCEL_ENV === 'preview' &&
    process.env.DATABASE_NAME === 'tog_checkout_cert_20261016' &&
    requestHeaders.get('x-tog-certification-intent') === 'isolated-square-sandbox-20261016'
  ) {
    const databaseName = assertPreviewDatabaseIsolation();
    if (databaseName !== 'tog_checkout_cert_20261016') throw new Error('QA catalog denied');
    const { db } = await connectToDatabase();
    const fixture = await db.collection('unified_products').findOne({
      id: 'cert-ui-strawberry-bliss', source: 'qa_browser_certification_only',
    });
    const inventory = await db.collection('inventory').findOne({
      productId: 'cert-ui-strawberry-bliss', source: 'qa_browser_certification_only',
    });
    if (fixture && inventory && Number(inventory.currentStock) > 0) {
      const { _id, ...product } = fixture;
      products = [{
        ...product,
        currentStock: Number(inventory.currentStock),
        stock: Number(inventory.currentStock),
        inStock: true,
        checkoutReady: true,
        checkoutUnavailableReason: undefined,
        variationId: 'cert-ui-bliss-16oz',
        catalogObjectId: 'cert-ui-bliss-16oz',
      }, ...snapshot.products];
    }
  }
  return { products, categories: snapshot.categories };
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
