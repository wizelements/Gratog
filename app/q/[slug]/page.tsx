import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LABEL_QUANTITY_MAX, resolveLabelProduct } from '@/lib/label-commerce';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<PageProps, 'params'>) {
  const { slug } = await params;
  const resolved = resolveLabelProduct(slug);
  const product = resolved.product;

  return {
    title: product ? `Pay for ${product.name} | Taste of Gratitude` : 'Scan & Pay | Taste of Gratitude',
    description: product
      ? `Securely pay for ${product.name} from Taste of Gratitude.`
      : 'Secure scan-to-pay checkout for Taste of Gratitude market products.',
    robots: { index: false, follow: false },
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LabelPayPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const resolved = resolveLabelProduct(slug);
  if (!resolved.product) notFound();

  const product = resolved.product;
  const paid = firstParam(query.paid) === '1';
  const error = firstParam(query.error);
  const market = firstParam(query.market) || '';

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900">
      <section className="mx-auto max-w-md overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-xl shadow-emerald-950/5">
        <div className="bg-emerald-950 px-6 py-7 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
            Taste of Gratitude
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Scan & Pay</h1>
          <p className="mt-2 text-sm leading-6 text-emerald-100">
            Market + pop-up checkout for the item in your hand.
          </p>
        </div>

        <div className="space-y-6 p-6">
          {paid ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Payment complete</p>
              <h2 className="mt-1 text-2xl font-semibold">Thank you.</h2>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                Your Square checkout returned successfully. Keep this screen available if the booth team needs to confirm your purchase.
              </p>
              <p className="mt-3 text-xs text-stone-500">
                Want another one? This same QR can be scanned again to start a brand-new purchase.
              </p>
            </div>
          ) : null}

          <div>
            <p className="text-sm font-medium capitalize text-emerald-800">{product.category}</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">{product.name}</h2>
            <div className="mt-3 flex items-baseline justify-between gap-4">
              <span className="text-stone-600">{product.size}</span>
              {resolved.payable ? (
                <span className="text-2xl font-semibold">${product.price.toFixed(2)}</span>
              ) : (
                <span className="text-sm font-semibold text-amber-700">Price unavailable</span>
              )}
            </div>
          </div>

          {error === 'payment' ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Secure checkout could not be created. Please pay with the booth team or try again.
            </div>
          ) : null}

          {error === 'unavailable' ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              This label is valid, but this item does not currently have an approved checkout price.
            </div>
          ) : null}

          {resolved.payable ? (
            <form action="/api/label-checkout" method="post" className="space-y-4">
              <input type="hidden" name="slug" value={product.slug} />
              <input type="hidden" name="market" value={market} />

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Quantity</span>
                <select
                  name="quantity"
                  defaultValue="1"
                  className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base"
                >
                  {Array.from({ length: LABEL_QUANTITY_MAX }, (_, index) => index + 1).map((quantity) => (
                    <option value={quantity} key={quantity}>
                      {quantity}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="h-14 w-full rounded-2xl bg-emerald-950 px-5 text-base font-semibold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-200"
              >
                Pay securely with Square
              </button>

              <p className="text-center text-xs leading-5 text-stone-500">
                A fresh Square checkout is created for every purchase. The QR on this label stays reusable.
              </p>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-stone-700">
                This product is not enabled for label checkout yet. We will not guess or charge an unverified price.
              </p>
              <Link
                href="/weekly-menu?source=label"
                className="flex h-12 items-center justify-center rounded-xl border border-emerald-900 font-semibold text-emerald-950"
              >
                See current menu
              </Link>
            </div>
          )}

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
