'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Heart,
  Mail,
  MapPin,
  Package,
  Repeat,
  ShoppingBag,
  Store,
  Truck,
  Users,
} from 'lucide-react';
import QuickAddButton from '@/components/QuickAddButton';
import ProductVisual from '@/components/ProductVisual';
import RetentionForm from '@/components/RetentionForm';
import { JsonLd } from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MARKETS } from '@/data/markets';
import { getCategoryLabel } from '@/data/products';

const ORDERING_STEPS = [
  { icon: ShoppingBag, title: 'Explore the menu', text: 'Find a flavor you love in this week’s selection.' },
  { icon: Store, title: 'Choose a pickup market', text: 'Select a participating market when placing your preorder.' },
  { icon: Package, title: 'We prepare your order', text: 'We’ll have your confirmed order ready for your selected market pickup.' },
  { icon: Repeat, title: 'Pick up and enjoy', text: 'Visit our booth during your pickup window and take home your favorites.' },
];

function availabilityLabel(product) {
  if (product.soldOut || product.inventoryStatus === 'sold_out') return 'Sold out';
  if (product.inventoryStatus === 'limited' || product.weeklyStatus === 'limited') return 'Small batch';
  if (product.preorderOnly || product.isPreorder) return 'Reserve for pickup';
  return 'Available this week';
}

function ProductMarketCard({ product, priority = false }) {
  // Products arrive from the certified storefront snapshot, not from static
  // weekly-menu data. Do not display a fallback price or fabricate a cart item.
  const displayPrice = Number(product.price);
  const displaySize =
    product.size ||
    product.variantLabel ||
    product.variations?.[0]?.name ||
    '';

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-emerald-900/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/product/${product.slug || product.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
          <ProductVisual
            product={product}
            priority={priority}
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-emerald-900 shadow-sm">
            {availabilityLabel(product)}
          </span>
        </div>
      </Link>
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              {getCategoryLabel(product.category)}
            </p>
            <Link href={`/product/${product.slug || product.id}`} className="mt-1 block text-xl font-semibold leading-tight text-stone-950 hover:text-emerald-800">
              {product.name}
            </Link>
          </div>
          <p className="shrink-0 text-lg font-bold text-emerald-800">
            ${displayPrice.toFixed(2)}
            {displaySize ? <span className="ml-1 text-xs font-medium text-stone-500">· {displaySize}</span> : null}
          </p>
        </div>
        {product.shortDescription ? <p className="mt-3 text-sm leading-6 text-stone-600">{product.shortDescription}</p> : null}
        <div className="mt-auto pt-5">
          <QuickAddButton
            product={product}
            selectedVariant={product.variations?.[0]}
            className="h-11 w-full rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomePageClient({
  initialFeaturedProducts = [],
  organizationSchema,
  faqSchema,
}) {
  const featuredProducts = Array.isArray(initialFeaturedProducts) ? initialFeaturedProducts : [];

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-stone-950">
      <JsonLd id="home-organization-schema" data={organizationSchema} />
      <JsonLd id="home-faq-schema" data={faqSchema} />

      <section className="border-b border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-950 text-white">
        <div className="container grid gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
              Handcrafted in Atlanta • Georgia orders only
            </p>
            <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Fresh flavors. Made with gratitude.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50/90 sm:text-xl">
              Explore our small-batch lemonades, refreshers, and sea moss favorites. See current products first, then choose an eligible ordering option without guessing what is available.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="h-14 rounded-full bg-white px-8 text-base font-bold text-emerald-950 hover:bg-emerald-50">
                <Link href="/catalog">Shop drinks & sea moss</Link>
              </Button>
              <Button asChild variant="outline" className="h-14 rounded-full border-white/30 bg-transparent px-8 text-base font-bold text-white hover:bg-white/10 hover:text-white">
                <Link href="/weekly-menu">Preorder for market pickup</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-emerald-50/80">
              Ordering from home? Options for eligible Georgia delivery or shipping depend on your products, address, and confirmed availability at checkout. Market-only preorders require a confirmed pickup market.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/20 bg-white/95 p-6 text-stone-950 shadow-2xl shadow-emerald-950/40">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Start with what sounds good</p>
            <h2 className="mt-3 text-3xl font-semibold">Find your next favorite.</h2>
            <p className="mt-3 leading-7 text-stone-600">
              Browse real product details, ingredients, prices, and current ordering options.
            </p>
            <div className="mt-5 grid gap-3">
              {[
                { label: 'Lemonades & refreshers', detail: 'Bright, handcrafted drinks', href: '/catalog' },
                { label: 'Sea moss favorites', detail: 'Explore gels and small-batch blends', href: '/catalog' },
                { label: 'Market preorders', detail: 'Reserve for a confirmed market', href: '/weekly-menu' },
              ].map((option) => (
                <Link key={option.label} href={option.href} className="group rounded-2xl bg-emerald-50 p-4 transition hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800">
                  <span className="flex items-center justify-between gap-3 font-semibold text-emerald-950">
                    {option.label}<ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                  <span className="mt-1 block text-sm text-emerald-800">{option.detail}</span>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-stone-600">
              Product availability and fulfillment are confirmed before payment.
            </p>
          </div>
        </div>
      </section>

      <section id="weekly-menu" className="scroll-mt-24 py-14 sm:py-16">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Shop our current collection</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Shop what’s available.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
                Compare our current checkout-connected products. For market-only favorites, use the separate market preorder menu.
              </p>
            </div>
            <Button asChild className="h-12 rounded-full bg-emerald-700 px-6 text-white hover:bg-emerald-800">
              <Link href="/catalog">Browse the full shop</Link>
            </Button>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProducts.map((product, index) => (
                <ProductMarketCard
                  key={product.variationId || product.id}
                  product={product}
                  priority={index < 3}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-900/10 bg-white p-6 text-stone-700">
              <p className="font-semibold text-stone-950">Explore the full menu</p>
              <p className="mt-2">Online checkout products are being confirmed. Browse the menu for product details and current ordering options; no unavailable item will be added here.</p>
              <Link href="/catalog" className="mt-4 inline-flex items-center gap-2 font-semibold text-emerald-800 underline underline-offset-4">
                View the shop <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-emerald-900/10 bg-white py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">How market preorder works</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Your market pickup, made simple.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {ORDERING_STEPS.map(({ icon: Icon, title, text }, index) => (
              <div key={title} className="rounded-[1.5rem] border border-stone-200 bg-[#fbfaf5] p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-700 text-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Step {index + 1}</p>
                <h3 className="mt-2 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="markets" className="py-14">
        <div className="container">
          <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Market pickup</p>
              <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">See where we’ll be.</h2>
            </div>
            <Button asChild variant="outline" className="h-12 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
              <Link href="/markets">Full market details</Link>
            </Button>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {MARKETS.slice(0, 3).map((market) => (
              <article key={market.id} className="rounded-[1.5rem] border border-emerald-900/10 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">{market.pickupDays}</p>
                    <h3 className="mt-2 text-2xl font-semibold">{market.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{market.description}</p>
                  </div>
                  <Store className="h-8 w-8 text-emerald-700" aria-hidden="true" />
                </div>
                <div className="mt-5 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
                  <p className="rounded-2xl bg-stone-50 p-3">
                    <Clock className="mr-2 inline h-4 w-4 text-emerald-700" aria-hidden="true" />
                    {market.hours}
                  </p>
                  <p className="rounded-2xl bg-stone-50 p-3">
                    <MapPin className="mr-2 inline h-4 w-4 text-emerald-700" aria-hidden="true" />
                    {market.shortName}
                  </p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button asChild className="h-11 rounded-full bg-emerald-700 text-white hover:bg-emerald-800">
                    <Link href="/weekly-menu">Preorder for pickup</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                    <Link href={`/markets#${market.id}`}>Market details</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="delivery" className="border-y border-emerald-900/10 bg-emerald-950 py-14 text-white">
        <div className="container grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div>
            <Truck className="h-8 w-8 text-emerald-200" aria-hidden="true" />
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">Interested in delivery?</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Want Taste of Gratitude delivered?</h2>
            <p className="mt-4 max-w-2xl leading-8 text-emerald-50/90">
              We’re exploring more Georgia delivery options, starting in the Atlanta area. Share your neighborhood and preferred day, and we’ll let you know if delivery becomes available near you.
            </p>
            <div className="mt-6 grid gap-3">
              {[
                'Share your neighborhood or ZIP code',
                'Tell us which day works best for you',
                'We’ll share updates if service becomes available in your area',
              ].map((item) => (
                <p key={item} className="flex items-start gap-3 text-sm text-emerald-50">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" aria-hidden="true" />
                  {item}
                </p>
              ))}
            </div>
          </div>
          <RetentionForm
            intent="scheduled_delivery_interest"
            source="homepage_delivery"
            title="Tell us where you’d like delivery"
            description="Tell us your ZIP code and preferred delivery day. We’ll contact you if a route opens nearby."
            cta="Keep me updated"
            collectMessage
            messagePlaceholder="Neighborhood or ZIP + preferred delivery day/time"
            successTitle="Thanks for letting us know!"
            successDescription="We’ll keep your area in mind and reach out if delivery becomes available."
          />
        </div>
      </section>

      <section id="events" className="py-14">
        <div className="container grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <Users className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Book Taste of Gratitude</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Bring the market experience to your event.</h2>
            <p className="mt-4 max-w-2xl leading-8 text-stone-700">
              From golf tournaments to corporate gatherings and neighborhood celebrations, we’d love to bring our drinks and sea moss favorites to your event. Tell us what you’re planning, and we’ll help you find the right menu and setup.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              {['Golf tournaments', 'Corporate events', 'Community events', 'Wellness events', 'Private gatherings', 'Pop-ups + vendor opportunities'].map((item) => (
                <span key={item} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-900">
                  {item}
                </span>
              ))}
            </div>
            <Button asChild className="mt-7 h-12 rounded-full bg-emerald-700 px-7 text-white hover:bg-emerald-800">
              <Link href="/events">Book us for an event <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="rounded-[2rem] border border-emerald-900/10 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Let’s make it a good fit</p>
            <div className="mt-5 grid gap-4 text-sm text-stone-700">
              <p className="rounded-2xl bg-stone-50 p-4"><Store className="mr-2 inline h-4 w-4 text-emerald-700" />Vendor setup and product sales</p>
              <p className="rounded-2xl bg-stone-50 p-4"><Package className="mr-2 inline h-4 w-4 text-emerald-700" />A menu and quantities that suit your event</p>
              <p className="rounded-2xl bg-stone-50 p-4"><Users className="mr-2 inline h-4 w-4 text-emerald-700" />Samples and friendly product conversations</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-stone-100/70 py-14">
        <div className="container grid gap-8 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm">
            <Heart className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Made with care. Shared with gratitude.</p>
            <h2 className="mt-2 text-3xl font-semibold">It started with a simple act of sharing.</h2>
            <p className="mt-4 leading-8 text-stone-700">
              Jenneisha first began making and sharing sea moss at home. What started with family grew into new flavors, familiar faces, and meaningful connections at local farmers markets.
            </p>
            <Button asChild variant="outline" className="mt-6 h-11 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
              <Link href="/about">Read our story</Link>
            </Button>
          </div>
          <div className="rounded-[2rem] bg-white p-6 shadow-sm">
            <Mail className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Can’t find your favorite?</p>
            <h2 className="mt-2 text-3xl font-semibold">Tell us what you’d love to see next.</h2>
            <p className="mt-4 leading-8 text-stone-700">
              Missing a favorite flavor? Send us a request. We’ll confirm what’s available, the price, and pickup details before you place an order.
            </p>
            <Button asChild variant="outline" className="mt-6 h-11 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
              <Link href="/request-a-flavor">Request a flavor</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-emerald-700 to-emerald-950 py-14 text-white">
        <div className="container grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <Mail className="h-8 w-8 text-emerald-200" aria-hidden="true" />
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">See what’s fresh next week.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-emerald-50/90">
              Get the next menu, market pickup reminders, and first word on returning favorites.
            </p>
          </div>
          <RetentionForm
            intent="email_signup"
            source="homepage_retention_footer"
            title="The weekly menu, in your inbox"
            description="Get the next menu and market pickup reminder."
            cta="Send me the weekly menu"
          />
        </div>
      </section>
    </main>
  );
}
