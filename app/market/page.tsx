import Link from 'next/link';
import { getActiveMarketPickups } from '@/data/markets';

export const metadata = {
  title: 'Market Menus | Taste of Gratitude',
  description: 'Find the right Taste of Gratitude farmers market and explore the current booth menu by QR.',
};

export default function MarketLandingPage() {
  const markets = getActiveMarketPickups();
  return (
    <main className="min-h-screen bg-[#faf8f2] text-stone-950">
      <header className="bg-emerald-950 px-5 py-12 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Taste of Gratitude</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Find your market menu</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100">
            Select the market you're visiting to explore bottled lemonades, fresh juices, sea moss
            and the prepared drinks served by our team. Browse freely; digital stock is not
            confirmed until our booth team verifies today's selection.
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
                View this market's menu
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-8 text-sm text-stone-600">
          Digital market purchasing is not active until market inventory and Square payment
          verification are completed. Prepared boba, refreshers, teas and shots are ordered at
          the booth, not online.
        </p>
      </section>
    </main>
  );
}
