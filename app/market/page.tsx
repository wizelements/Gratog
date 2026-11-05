import Link from 'next/link';
import { getActiveMarketPickups } from '@/data/markets';

export const metadata = {
  title: 'Market Menus | Taste of Gratitude',
  description: 'See what’s on the menu at our Serenbe Farmers Market booth.',
};

export default function MarketLandingPage() {
  const markets = getActiveMarketPickups();
  return (
    <main className="min-h-screen bg-[#faf8f2] text-stone-950">
      <header className="bg-emerald-950 px-5 py-12 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Taste of Gratitude</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">See what’s fresh at Serenbe</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100">
            Take a look at our lemonades, juices, sea moss, and drinks made at the booth.
            We’ll confirm what’s available when you visit.
          </p>
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-5 py-8" aria-label="Available market menus">
        <div className="grid gap-4 md:grid-cols-2">
          {markets.map(market => (
            <article key={market.id} className="rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="text-xl font-bold">{market.name}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{market.addressLine}</p>
              <p className="mt-2 text-sm font-medium text-stone-700">{market.pickupDays}</p>
              <Link href={`/m/${encodeURIComponent(market.id)}`}
                className="mt-5 inline-block rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white">
                See the Serenbe menu
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-8 text-sm text-stone-600">
          You can explore the menu here. For now, please order boba, refreshers, teas,
          and shots directly at the booth. Ask our team about bottled items and pickup.
        </p>
      </section>
    </main>
  );
}
