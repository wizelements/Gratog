import Link from 'next/link';
import { Building2, CheckCircle, Store, Truck, Users } from 'lucide-react';
import RetentionForm from '@/components/RetentionForm';
import { getFeaturedBundles } from '@/data/bundles';

export const metadata = {
  title: 'Wholesale & Partner Inquiries | Taste of Gratitude',
  description: 'Partner with Taste of Gratitude for Atlanta retail, market collaborations, and wholesale sea moss gels, drinks, refreshers, and shots.',
  alternates: { canonical: '/wholesale' },
  openGraph: {
    title: 'Wholesale & Partner Inquiries | Taste of Gratitude',
    description: 'Bring small-batch Taste of Gratitude products to your shop, studio, market, or community event.',
    url: 'https://tasteofgratitude.shop/wholesale',
    images: [{ url: '/images/gratog-bg.PNG', width: 1200, height: 630 }],
  },
};

const PARTNER_TYPES = [
  {
    icon: Store,
    title: 'Retail + shops',
    text: 'Small-batch gels, drinks, shots, and seasonal releases for local shelves.',
  },
  {
    icon: Building2,
    title: 'Studios + community spaces',
    text: 'Pickup-friendly boxes for yoga studios, gyms, spas, salons, and offices.',
  },
  {
    icon: Users,
    title: 'Markets + collaborations',
    text: 'Partner on pop-ups, tastings, product education, referral offers, and repeat orders.',
  },
];

export default function WholesalePage() {
  const bundles = getFeaturedBundles();

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-stone-950">
      <section className="border-b border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-950 py-14 text-white sm:py-20">
        <div className="container grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
              Wholesale • partnerships • community
            </p>
            <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
              Bring Taste of Gratitude products to your customers.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50/90">
              We work with retailers, studios, offices, markets, and community partners on small-batch products, product education, and coordinated pickup or local delivery.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#wholesale-inquiry" className="rounded-full bg-white px-7 py-3 font-bold text-emerald-950 hover:bg-emerald-50">
                Start a wholesale inquiry
              </Link>
              <Link href="/catalog" className="rounded-full border border-white/30 px-7 py-3 font-bold text-white hover:bg-white/10">
                Review the current catalog
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100">Partner fit</p>
            <div className="mt-5 grid gap-3">
              {['Atlanta-area pickup or coordinated local delivery', 'Small-batch quantities planned around current menus', 'Product details for sea moss gels, drinks, refreshers, and shots', 'A personal follow-up on availability, pricing, and timing'].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-white/10 p-3 text-sm text-emerald-50">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12 sm:py-16">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Who we partner with</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Wholesale should feel like community, not anonymous bulk ordering.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {PARTNER_TYPES.map((partner) => {
            const Icon = partner.icon;
            return (
              <article key={partner.title} className="rounded-[1.5rem] border border-emerald-900/10 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold text-stone-950">{partner.title}</h3>
                <p className="mt-3 leading-7 text-stone-600">{partner.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="container grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Suggested assortments</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Start with a mix of familiar flavors and formats.</h2>
            <p className="mt-4 leading-8 text-stone-700">
              These curated sets show possible product mixes. We will confirm current availability, quantities, and itemized pricing for every partner order.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {bundles.map((bundle) => (
              <article key={bundle.id} className="rounded-[1.25rem] border border-stone-200 bg-[#fbfaf5] p-5">
                <h3 className="font-semibold text-stone-950">{bundle.name}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{bundle.description}</p>
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{bundle.savingsText}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="wholesale-inquiry" className="container grid gap-8 py-12 sm:py-16 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Wholesale inquiry</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Tell us what kind of partner order you are planning.</h2>
          <div className="mt-6 grid gap-4 text-stone-700">
            <div className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <Truck className="mt-1 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <p>Share expected quantity, product type, pickup/delivery needs, and your launch timeline.</p>
            </div>
            <div className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <Store className="mt-1 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <p>We will follow up with availability, product fit, itemized pricing, and next steps.</p>
            </div>
          </div>
        </div>
        <RetentionForm
          intent="wholesale_inquiry"
          source="wholesale_page"
          title="Start a partner conversation"
          description="Share a few details about your business and order. We will follow up personally with availability and next steps."
          cta="Send wholesale inquiry"
          collectPhone
          requireEmail
          collectMessage
          messagePlaceholder="Tell us your business name, product interests, estimated quantity, event/order timeline, and pickup/delivery needs."
        />
      </section>
    </main>
  );
}
