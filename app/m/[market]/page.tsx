import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getActiveMarketPickups } from '@/data/markets';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';
import {
  buildMarketQrMenu,
  MARKET_INFORMATIONAL_CATEGORIES,
  resolveMarketQrId,
} from '@/lib/market-qr-policy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = {
  title: 'Market Menu | Taste of Gratitude',
  description: 'Explore bottled lemonades, fresh juices, sea moss and prepared drinks at the Taste of Gratitude market booth.',
};

type PageProps = { params: Promise<{ market: string }> };

function displayTime(value: string): string {
  const [hourRaw, minute = '00'] = value.split(':');
  const hour = Number(hourRaw);
  if (!Number.isFinite(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export default async function MarketQrPage({ params }: PageProps) {
  const requested = (await params).market;
  const marketId = resolveMarketQrId(requested);
  if (!marketId) notFound();
  const market = getActiveMarketPickups().find(item => item.id === marketId);
  if (!market) notFound();

  // Read only. No stock should be inferred from a weekly menu, Square's
  // catalog flags, or an unaudited per-market inventory.
  let storefrontProducts: any[] = [];
  try {
    const result = await getStorefrontCatalogSnapshot();
    storefrontProducts = Array.isArray(result.products) ? result.products : [];
  } catch {
    // Approved prices and known ingredients remain browsable without DB.
    // Availability continues to be explicitly unverified.
  }
  const entries = buildMarketQrMenu(storefrontProducts);
  const groups = [
    { id: 'lemonade', title: 'Bottled Lemonades', detail: '16 oz bottles, ask about today\'s flavors' },
    { id: 'juice', title: 'Bottled Juices', detail: 'Fresh bottled drinks, ask about current batches' },
    { id: 'gel', title: 'Sea Moss Gel', detail: 'Prepared in small batches; ask about size and availability' },
  ] as const;
  const [opening, closing] = market.hours.split('-');

  return (
    <main className="min-h-screen bg-[#faf8f2] text-stone-950">
      <header className="bg-emerald-950 text-white">
        <div className="mx-auto max-w-3xl px-5 py-8 sm:py-11">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Taste of Gratitude · Market Menu</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Explore what we're making</h1>
          <h2 className="mt-5 text-xl font-semibold text-white">{market.name}</h2>
          <p className="mt-1 text-sm text-emerald-100">{market.addressLine}</p>
          <p className="mt-1 text-sm text-emerald-100">
            {market.pickupDays} · {displayTime(opening || '')} – {displayTime(closing || '')}
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-50">
            Browse ingredients and prices while you're here. Ask our booth team what is in stock right now.
            No account or signup is required to view the menu.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="#bottled-menu" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">See bottled menu</a>
            <a href="#booth-menu" className="rounded-full border border-emerald-200 px-5 py-3 text-sm font-bold text-white">Prepared at the booth</a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-5">
        <section aria-label="How market orders work" className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-950">See something you love? Ask at the booth.</h2>
          <p className="mt-2 text-sm leading-6 text-amber-950">
            This QR menu is informational while market-specific digital stock and Square checkout
            are being verified. Nothing here is an online order, reservation or payment.
            Our team can confirm stock and complete in-person purchases.
          </p>
        </section>

        <section id="bottled-menu" aria-labelledby="bottled-heading" className="scroll-mt-5">
          <h2 id="bottled-heading" className="text-2xl font-bold">Bottled drinks & sea moss</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            These are our approved bottled product lines. They are the only product families
            eligible for future digital market purchasing, after live availability is certified.
            Today's stock must be confirmed at the booth.
          </p>
          {groups.map(group => (
            <section key={group.id} aria-label={group.title} className="mt-7">
              <h3 className="text-xl font-semibold">{group.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{group.detail}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {entries.filter(item => item.kind === group.id).map(item => (
                  <article key={item.slug} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-bold leading-6">{item.name}</h4>
                      <span className="shrink-0 text-lg font-bold tabular-nums text-emerald-800">
                        ${(item.approvedPriceCents / 100).toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Ask at booth for availability</p>
                    {item.ingredients.length ? (
                      <p className="mt-3 text-sm leading-6 text-stone-700">
                        <span className="font-semibold">Ingredients:</span> {item.ingredients.join(' · ')}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-stone-700">
                        Ask our team for the full ingredient and allergen information before ordering.
                      </p>
                    )}
                    {item.allergens.length > 0 && (
                      <p className="mt-2 text-sm font-semibold text-stone-700">Allergen notes: {item.allergens.join(' · ')}</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </section>

        <section id="booth-menu" aria-labelledby="booth-heading" className="scroll-mt-5">
          <h2 id="booth-heading" className="text-2xl font-bold">Explore the booth menu</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Boba, refreshers, shots, teas and other prepared items are information-only online.
            They are ordered directly with our team, not through the digital cart.
            Ask for today's specific flavors, prices and allergy information.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {MARKET_INFORMATIONAL_CATEGORIES.map(category => (
              <article key={category.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                <h3 className="font-bold">{category.label}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{category.detail}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">Ask at booth · Not sold online</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-100 bg-white p-5">
          <h2 className="text-lg font-bold">Planning a future market visit?</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Market preorders are separate from today's booth menu and subject to batch capacity,
            market pickup dates and secure checkout verification.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/preorder?market=${encodeURIComponent(market.id)}`}
              className="rounded-full border border-emerald-700 px-5 py-3 text-sm font-semibold text-emerald-900">
              Explore market preorders
            </Link>
            <a href={market.mapsUrl} target="_blank" rel="noopener noreferrer"
              className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-900">
              Directions
            </a>
            <Link href="/markets" className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-900">
              Other markets
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
