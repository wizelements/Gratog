export const dynamic = 'force-dynamic';

import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';
import ShowcaseClient from './ShowcaseClient';

export const revalidate = 300;

export default async function ShowcasePage() {
  const snapshot = await getStorefrontCatalogSnapshot({});

  return (
    <ShowcaseClient initialProducts={snapshot.products || []} />
  );
}
