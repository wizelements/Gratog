'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  MapPin,
  MessageCircle,
  Package,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import RetentionForm from '@/components/RetentionForm';
import { Button } from '@/components/ui/button';
import { track } from '@/utils/analytics';

interface MarketOption {
  id: string;
  name: string;
  shortName?: string;
  pickupDays?: string;
  hours?: string;
}

interface WeeklyProduct {
  id: string;
  slug?: string;
  name: string;
  category?: string;
  emoji?: string;
  price: number;
  image?: string;
  shortDescription?: string;
}

interface WeeklyMenuPageProps {
  markets: MarketOption[];
  weeklyProducts: WeeklyProduct[];
  weeklyMenu: { title: string; preorderLanguage: string; pickupLanguage: string };
}

export default function WeeklyMenuPage({ markets, weeklyProducts, weeklyMenu }: WeeklyMenuPageProps) {
  const marketOptions: Array<{ id: string; name: string }> = markets.map((m) => ({ id: m.id, name: m.shortName || m.name }));

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-stone-950">
      <section className="overflow-hidden border-b border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-950 text-white">
        <div className="container grid gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
              Fresh weekly drop • small-batch
            </p>
            <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
              Get the weekly menu before market day.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50/90 sm:text-xl">
              {weeklyMenu.preorderLanguage}
            </p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <Button asChild className="h-14 rounded-full bg-white px-8 text-base font-bold text-emerald-950 hover:bg-emerald-50">
                <Link href="/preorder" onClick={() => track('weeklymenu_preorder_click', { source: 'weeklymenu_hero' })}>
                  <ShoppingBag className="mr-2 h-5 w-5" aria-hidden="true" />
                  Preorder this week
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-14 rounded-full border-white/30 bg-transparent px-8 text-base font-bold text-white hover:bg-white/10 hover:text-white">
                <Link href="/catalog">Browse full catalog</Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Menu drops', value: 'Every week' },
                { label: 'Pickup', value: 'Atlanta markets' },
                { label: 'Batch style', value: 'Small-batch' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-100">{stat.label}</p>
                  <p className="mt-1 font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/20 bg-white/95 p-5 text-stone-950 shadow-2xl shadow-emerald-950/40">
            <div className="rounded-[1.5rem] bg-emerald-50 p-4">
              <MessageCircle className="h-6 w-6 text-emerald-700" aria-hidden="true" />
              <h2 className="mt-3 text-2xl font-semibold text-stone-950">Weekly menu texts</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Drop your number and pick your preferred market. We send one menu text before market day with a direct preorder link.
              </p>
              <div className="mt-5">
                <RetentionForm
                  intent="weekly_menu_texts"
                  source="weekly_menu_landing"
                  title="Text me the menu"
                  description=""
                  cta="Text me the menu"
                  collectEmail={false}
                  collectPhone
                  collectMarket
                  marketOptions={marketOptions}
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">This week&apos;s menu</p>
              <h2 className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl">Fresh this week.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">{weeklyMenu.pickupLanguage}</p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {weeklyProducts.map((product, index) => (
              <article
                key={product.id}
                className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-emerald-900/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Link href={`/product/${product.slug || product.id}`} className="block">
                  <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading={index < 3 ? 'eager' : 'lazy'} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-5xl">{product.emoji || '🛍️'}</div>
                    )}
                  </div>
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">{product.category || 'Weekly item'}</p>
                  <h3 className="mt-1 text-xl font-semibold text-stone-950">{product.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{product.shortDescription}</p>
                  <div className="mt-auto flex items-center justify-between pt-5">
                    <span className="text-lg font-bold text-emerald-800">${product.price.toFixed(2)}</span>
                    <Button asChild variant="outline" size="sm" className="rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                      <Link href={`/preorder?product=${encodeURIComponent(product.slug || product.id)}&utm_source=weeklymenu_card`}>Reserve</Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-emerald-900/10 bg-white py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl">A low-friction weekly rhythm.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: MessageCircle, title: 'Get the menu text', text: 'Know what is fresh before you arrive.' },
              { icon: ShoppingBag, title: 'Reserve your batch', text: 'Use the direct link to preorder for your market.' },
              { icon: Package, title: 'Pick up fresh', text: 'Grab your order at the booth and taste what is new.' },
            ].map(({ icon: Icon, title, text }, index) => (
              <div key={title} className="rounded-[1.5rem] border border-stone-200 bg-[#fbfaf5] p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-700 text-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Step {index + 1}</p>
                <h3 className="mt-2 text-lg font-semibold text-stone-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container grid gap-10 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-emerald-900/10 bg-emerald-950 p-6 text-white shadow-xl shadow-emerald-950/15 sm:p-8">
            <Sparkles className="h-8 w-8 text-emerald-200" aria-hidden="true" />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Join the Gratitude Box waitlist.</h2>
            <p className="mt-3 text-emerald-50/90">
              A reserved weekly box of gels, drinks, and shots at your chosen market. Pause or skip any week.
            </p>
            <Button asChild className="mt-6 h-12 rounded-full bg-white px-6 text-emerald-950 hover:bg-emerald-50">
              <Link href="/subscriptions/gratitude-box">
                See the Gratitude Box <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <div className="rounded-[2rem] border border-emerald-900/10 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Market pickup</p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">Choose the market closest to you.</h2>
            <div className="mt-5 grid gap-3">
              {markets.map((market) => (
                <div key={market.id} className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4">
                  <div>
                    <p className="font-semibold text-stone-950">{market.name}</p>
                    <p className="text-sm text-stone-600">
                      <Clock className="mr-1 inline h-4 w-4 text-emerald-700" aria-hidden="true" />
                      {market.pickupDays || 'Saturday pickup'}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                    <Link href={`/preorder?market=${encodeURIComponent(market.id)}&utm_source=weeklymenu_market_card`}>
                      <MapPin className="mr-1 h-4 w-4" aria-hidden="true" />
                      Preorder
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-emerald-700 to-emerald-950 py-14 text-white">
        <div className="container grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Not ready to preorder yet?</h2>
            <p className="mt-3 max-w-2xl text-emerald-50/90">
              Get one text per week with the menu and a direct preorder link. No spam. Reply STOP to opt out.
            </p>
            <div className="mt-5 grid gap-2 text-sm text-emerald-50/90 sm:grid-cols-3">
              {['Weekly menu texts', 'Market reminders', 'First access to limited batches'].map((item) => (
                <p key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-200" aria-hidden="true" />
                  {item}
                </p>
              ))}
            </div>
          </div>
          <RetentionForm
            intent="weekly_menu_texts"
            source="weekly_menu_footer"
            title="Get weekly menu texts"
            description="Drop your number and preferred market."
            cta="Text me the menu"
            collectEmail={false}
            collectPhone
            collectMarket
            marketOptions={marketOptions}
          />
        </div>
      </section>
    </main>
  );
}
