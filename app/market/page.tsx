import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  Heart,
  Package,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';
import {
  getHomepageBestSellers,
  getWeeklyMenuProducts,
} from '@/data/weeklyMenu';
import { getCategoryLabel } from '@/data/products';
import ProductVisual from '@/components/ProductVisual';

export const metadata = {
  title: 'Market Kiosk | Taste of Gratitude',
  description: 'Touch-friendly Taste of Gratitude market menu and ordering hub.',
  robots: { index: false, follow: false },
};

const categoryTiles = [
  { title: 'Fresh Drinks', detail: 'Lemonades + refreshers', icon: ShoppingBag },
  { title: 'Sea Moss Gels', detail: 'Small-batch jars + samples', icon: Package },
  { title: 'Wellness Shots', detail: 'Quick 2 oz favorites', icon: Heart },
];
function availabilityLabel(product: any) {
  if (product.soldOut || product.inventoryStatus === 'sold_out') return 'Sold out';
  if (product.inventoryStatus === 'limited' || product.weeklyStatus === 'limited') return 'Small batch';
  if (product.preorderOnly || product.inventoryStatus === 'preorder') return 'Reserve for pickup';
  return 'Available this week';
}

function priceLabel(product: any) {
  const hasGelSample =
    product.category === 'gels' &&
    Array.isArray(product.sizes) &&
    product.sizes.some((size: string) => /2\s*oz/i.test(size));

  if (hasGelSample) return 'From $11';
  return Number(product.price) > 0 ? `$${Number(product.price).toFixed(0)}` : 'See menu';
}

export default function MarketKioskPage() {
  const bestSellers = getHomepageBestSellers().filter(
    (product) => product.activeWeeklyMenu && !product.soldOut
  );
  const fallback = getWeeklyMenuProducts('all').filter((product) => !product.soldOut);
  const featured = (bestSellers.length >= 4 ? bestSellers : fallback).slice(0, 4);

  return (
    <main className="fixed inset-0 z-[9999] overflow-y-auto bg-[#fbfaf5] text-stone-950">
      <div className="min-h-dvh">
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-950 text-white">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-7 pb-10 pt-8 sm:px-10 lg:px-14 lg:pb-14 lg:pt-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-200">
                  Market mode
                </p>
                <p className="mt-1 text-sm text-emerald-50/75">Taste of Gratitude</p>
              </div>
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-emerald-50">
                TAP TO EXPLORE
              </span>
            </div>

            <div className="mt-10 max-w-4xl">
              <h1 className="text-balance text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
                What are you craving today?
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50/90 sm:text-xl">
                Fresh, small-batch drinks and sea moss favorites made with gratitude.
              </p>
            </div>
            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {categoryTiles.map(({ title, detail, icon: Icon }) => (
                <Link
                  key={title}
                  href="/weekly-menu"
                  className="group flex min-h-28 items-center gap-4 rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur transition hover:bg-white/15 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-950 shadow-lg">
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-xl font-semibold">{title}</span>
                    <span className="mt-1 block text-sm text-emerald-50/75">{detail}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-7 py-8 sm:px-10 lg:px-14">
          <div className="grid gap-4 lg:grid-cols-3">
            <Link
              href="/weekly-menu"
              className="group flex min-h-32 items-center justify-between rounded-[1.75rem] bg-emerald-700 p-6 text-white shadow-lg shadow-emerald-950/10 transition hover:bg-emerald-800"
            >
              <span>
                <ShoppingBag className="mb-3 h-7 w-7" aria-hidden="true" />
                <span className="block text-2xl font-semibold">Shop today&apos;s menu</span>
                <span className="mt-1 block text-sm text-emerald-50/85">See what&apos;s available now</span>
              </span>
              <ArrowRight className="h-7 w-7 transition group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href="/preorder"
              className="group flex min-h-32 items-center justify-between rounded-[1.75rem] border-2 border-emerald-800/15 bg-white p-6 shadow-sm transition hover:border-emerald-700/35 hover:shadow-md"
            >
              <span>
                <Clock className="mb-3 h-7 w-7 text-emerald-700" aria-hidden="true" />
                <span className="block text-2xl font-semibold">Order for later</span>
                <span className="mt-1 block text-sm text-stone-600">Reserve for a future pickup</span>
              </span>
              <ArrowRight className="h-7 w-7 text-emerald-800 transition group-hover:translate-x-1" aria-hidden="true" />
            </Link>

            <Link
              href="/quiz"
              className="group flex min-h-32 items-center justify-between rounded-[1.75rem] border-2 border-amber-700/15 bg-amber-50 p-6 shadow-sm transition hover:border-amber-700/35 hover:shadow-md"
            >
              <span>
                <Heart className="mb-3 h-7 w-7 text-amber-700" aria-hidden="true" />
                <span className="block text-2xl font-semibold">Help me pick</span>
                <span className="mt-1 block text-sm text-stone-600">Find a flavor direction fast</span>
              </span>
              <ArrowRight className="h-7 w-7 text-amber-800 transition group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="border-y border-emerald-950/10 bg-white">
          <div className="mx-auto max-w-6xl px-7 py-10 sm:px-10 lg:px-14">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Market favorites</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Start with a crowd favorite.</h2>
              </div>
              <Link href="/weekly-menu" className="hidden font-semibold text-emerald-800 hover:underline sm:inline">
                Full menu →
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  className="group overflow-hidden rounded-[1.5rem] border border-stone-200 bg-[#fbfaf5] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                    <ProductVisual
                      product={product}
                      variant="kiosk"
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 24vw"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                        {getCategoryLabel(product.category)}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-emerald-900">{priceLabel(product)}</span>
                    </div>
                    <h3 className="mt-2 text-xl font-semibold leading-tight">{product.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{product.shortDescription}</p>
                    <p className="mt-4 text-xs font-semibold text-emerald-800">{availabilityLabel(product)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-7 py-10 sm:px-10 lg:px-14">
          <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-[2rem] bg-emerald-950 p-7 text-white sm:p-9">
              <Store className="h-8 w-8 text-emerald-200" aria-hidden="true" />
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Take us with you</p>
              <h2 className="mt-2 text-3xl font-semibold">Reorder after the market.</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-emerald-50/85">
                Save <strong>tasteofgratitude.shop</strong> on your phone to see the weekly menu, preorder, and check upcoming pickup options.
              </p>
              <Link
                href="/weekly-menu"
                className="mt-6 inline-flex min-h-12 items-center rounded-full bg-white px-6 font-bold text-emerald-950 transition hover:bg-emerald-50"
              >
                Open the weekly menu <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="rounded-[2rem] border border-emerald-950/10 bg-stone-100 p-7 sm:p-9">
              <Users className="h-8 w-8 text-emerald-700" aria-hidden="true" />
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Bring us to your event</p>
              <h2 className="mt-2 text-2xl font-semibold">Book Taste of Gratitude.</h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Tournaments, corporate events, wellness gatherings, pop-ups, and private events.
              </p>
              <Link href="/events" className="mt-6 inline-flex min-h-12 items-center font-bold text-emerald-800 hover:underline">
                Event inquiries <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-6 text-sm text-stone-500">
            <span>Taste of Gratitude • Market Kiosk</span>
            <div className="flex gap-5">
              <Link href="/markets" className="font-semibold text-emerald-800 hover:underline">Market schedule</Link>
              <Link href="/" className="font-semibold text-emerald-800 hover:underline">Full website</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
