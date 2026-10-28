import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveLabelProduct } from '@/lib/label-commerce';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const { product } = await resolveLabelProduct(slug);
  return {
    title: product ? `${product.name} | Taste of Gratitude` : 'Product Guide | Taste of Gratitude',
    description: 'Explore product details and check current ordering availability with Taste of Gratitude.',
    robots: { index: false, follow: false },
  };
}

export default async function LabelPayPage({ params }: PageProps) {
  const { slug } = await params;
  const resolved = await resolveLabelProduct(slug);
  if (!resolved.product) notFound();
  const product = resolved.product;
  const productUrl = resolved.productPath ? `${resolved.productPath}?source=label` : null;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900">
      <section className="mx-auto max-w-md overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-xl shadow-emerald-950/5">
        <div className="bg-emerald-950 px-6 py-7 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
            Taste of Gratitude
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">A closer look.</h1>
          <p className="mt-2 text-sm leading-6 text-emerald-100">
            Discover your product and check current ordering options.
          </p>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <p className="text-sm font-medium capitalize text-emerald-800">{product.category}</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">{product.name}</h2>
            <div className="mt-3 flex items-baseline justify-between gap-4">
              <span className="text-stone-600">{product.size}</span>
              {product.priceVerified && product.price !== null ? (
                <span className="text-2xl font-semibold">${product.price.toFixed(2)}</span>
              ) : (
                <span className="text-sm font-semibold text-amber-700">Check current availability</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm leading-6 text-stone-700">
              {productUrl
                ? 'Open the product page to review availability, choose your items, and select an available fulfillment option before payment.'
                : 'This item is not currently available to order. Explore the current catalog or ask the booth team for help.'}
            </p>
            <Link
              href={productUrl || '/catalog?source=label'}
              className="flex min-h-14 items-center justify-center rounded-2xl bg-emerald-950 px-5 py-3 text-center text-base font-semibold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            >
              {productUrl ? 'View availability and order' : 'Explore the current catalog'}
            </Link>
            <p className="text-center text-xs leading-5 text-stone-500">
              At a market with a product in hand? The booth team can help with your purchase.
            </p>
          </div>

          {product.ingredients.length > 0 ? (
            <div className="border-t border-stone-200 pt-5">
              <h3 className="text-sm font-semibold">Ingredients</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{product.ingredients.join(' · ')}</p>
            </div>
          ) : null}

          <div className="border-t border-stone-200 pt-5 text-center">
            <Link href="/" className="text-sm font-medium text-emerald-800 hover:underline">
              tasteofgratitude.shop
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
