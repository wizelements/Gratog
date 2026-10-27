import type { Metadata } from 'next';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';
import { isApprovedLemonadeLine } from '@/lib/lemonade-packs';
import LemonadePackBuilder from '@/components/bundles/LemonadePackBuilder';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '4-Pack & 6-Pack Lemonades | Taste of Gratitude',
  description: 'Mix and match eligible 16 oz Taste of Gratitude lemonades. Choose a 4-pack for $43.99 or 6-pack for $62.99. Availability and fulfillment confirmed before payment.',
  alternates: { canonical: '/lemonade-packs' },
};

export default async function LemonadePacksPage({ searchParams }: { searchParams: Promise<{ size?: string }> }) {
  const query = await searchParams;
  const snapshot = await getStorefrontCatalogSnapshot({});
  const eligible = snapshot.products.filter((product: any) => {
    const variants = Array.isArray(product.variations) ? product.variations : [];
    const variation = variants.find((v: any) => isApprovedLemonadeLine({
      ...product, unitPriceCents: Math.round(Number(v.price ?? product.price) * 100), subtitle: v.name,
    }));
    return !snapshot.isFallback && product.checkoutReady !== false &&
      product.available !== false && product.inStock !== false &&
      !product.soldOut && product.squareIsArchived !== true &&
      product.squareEcomAvailable !== false && variation &&
      isApprovedLemonadeLine({ ...product, unitPriceCents: 1199 });
  });
  return <LemonadePackBuilder products={eligible} initialSize={query.size === '6' ? 6 : 4} />;
}
