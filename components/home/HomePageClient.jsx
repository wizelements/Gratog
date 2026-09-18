'use client';

import { useMemo } from 'react';
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
import RetentionForm from '@/components/RetentionForm';
import { JsonLd } from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MARKETS } from '@/data/markets';
import {
  getCategoryLabel,
  normalizeProductKey,
  toStorefrontProduct,
} from '@/data/products';
import {
  getWeeklyMenuProducts,
  buildWeeklyMenu,
} from '@/data/weeklyMenu';

const ORDERING_STEPS = [
  { icon: ShoppingBag, title: 'Choose this week', text: 'Pick the products you want from the current small-batch menu.' },
  { icon: Store, title: 'Choose your market', text: 'Reserve for Serenbe or Dunwoody pickup while the batch is available.' },
  { icon: Package, title: 'We prepare it fresh', text: 'Your order is prepared around the week’s actual demand and pickup plan.' },
  { icon: Repeat, title: 'Pick up and come back', text: 'Grab your order Saturday, then check the next weekly menu when it drops.' },
];

function availabilityLabel(product) {
  if (product.soldOut || product.inventoryStatus === 'sold_out') return 'Sold out';
  if (product.inventoryStatus === 'limited' || product.weeklyStatus === 'limited') return 'Small batch';
  if (product.preorderOnly || product.isPreorder) return 'Reserve for pickup';
  return 'Available this week';
}

function ProductMarketCard({ product, commerceProduct = null, priority = false }) {
  const storefrontProduct = useMemo(
    () => commerceProduct || toStorefrontProduct(product),
    [commerceProduct, product]
  );
  const displayPrice = Number(storefrontProduct?.price ?? product.price ?? 0);
  const displaySize =
    storefrontProduct?.size ||
    storefrontProduct?.variantLabel ||
    storefrontProduct?.variations?.[0]?.name ||
    product.sizes?.[0] ||
    '';

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-emerald-900/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
          <img
            src={product.image}
            alt={`${product.name} from Taste of Gratitude`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading={priority ? 'eager' : 'lazy'}
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
            <Link href={`/product/${product.slug}`} className="mt-1 block text-xl font-semibold leading-tight text-stone-950 hover:text-emerald-800">
              {product.name}
            </Link>
          </div>
          <p className="shrink-0 text-lg font-bold text-emerald-800">
            {displayPrice > 0 ? `$${displayPrice.toFixed(2)}` : 'See details'}
            {displaySize ? <span className="ml-1 text-xs font-medium text-stone-500">· {displaySize}</span> : null}
          </p>
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-600">{product.shortDescription}</p>
        <div className="mt-auto pt-5">
          <QuickAddButton
            product={storefrontProduct}
            selectedVariant={storefrontProduct?.variations?.[0]}
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
  weekStart,
  weekEnd,
}) {
  const weeklyMenu = useMemo(() => buildWeeklyMenu(weekStart, weekEnd), [weekStart, weekEnd]);
  const weeklyProducts = useMemo(() => getWeeklyMenuProducts('all').slice(0, 6), []);
  const commerceProductByKey = useMemo(() => {
    const map = new Map();
    (Array.isArray(initialFeaturedProducts) ? initialFeaturedProducts : []).forEach((product) => {
      [product?.curatedProductId, product?.id, product?.slug, product?.name]
        .map(normalizeProductKey)
        .filter(Boolean)
        .forEach((key) => map.set(key, product));
    });
    return map;
  }, [initialFeaturedProducts]);
  const getCommerceProduct = (product) =>
    commerceProductByKey.get(normalizeProductKey(product.id)) ||
    commerceProductByKey.get(normalizeProductKey(product.slug)) ||
    commerceProductByKey.get(normalizeProductKey(product.name)) ||
    null;

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-stone-950">
      <JsonLd id="home-organization-schema" data={organizationSchema} />
      <JsonLd id="home-faq-schema" data={faqSchema} />

      <section className="border-b border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-950 text-white">
        <div className="container grid gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
              Atlanta farmers markets • fresh weekly batches
            </p>
            <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Preorder this week. Pick it up fresh Saturday.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50/90 sm:text-xl">
              Taste of Gratitude makes small-batch sea moss gels, lemonades, refreshers, shots, and market favorites around the week’s real demand.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="h-14 rounded-full bg-white px-8 text-base font-bold text-emerald-950 hover:bg-emerald-50">
                <Link href="/weekly-menu">Shop this week</Link>
              </Button>
              <Button asChild variant="outline" className="h-14 rounded-full border-white/30 bg-transparent px-8 text-base font-bold text-white hover:bg-white/10 hover:text-white">
                <Link href="/markets">Choose a pickup market</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-emerald-50/80">
              Weekly market preorders can be reserved at normal item quantities. Choose your pickup market before payment.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/20 bg-white/95 p-6 text-stone-950 shadow-2xl shadow-emerald-950/40">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">This week at a glance</p>
            <h2 className="mt-3 text-3xl font-semibold">{weeklyMenu.title}</h2>
            <p className="mt-3 leading-7 text-stone-600">
              Reserve before market day so we know what to make and what to hold for you.
            </p>
            <div className="mt-5 grid gap-3">
              {MARKETS.slice(0, 2).map((market) => (
                <div key={market.id} className="rounded-2xl bg-emerald-50 p-4">
                  <p className="font-semibold text-emerald-950">{market.name}</p>
                  <p className="mt-1 text-sm text-emerald-800">{market.pickupDays} • {market.hours}</p>
                </div>
              ))}
            </div>
            <Button asChild variant="outline" className="mt-5 h-11 w-full rounded-full border-emerald-300 text-emerald-900 hover:bg-emerald-100">
              <Link href="/weekly-menu">See available products</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="weekly-menu" className="scroll-mt-24 py-14 sm:py-16">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">This week’s preorder menu</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Choose what you want us to hold.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
                Start with the week’s available products. Reserve online, choose your market, and pick up fresh Saturday.
              </p>
            </div>
            <Button asChild className="h-12 rounded-full bg-emerald-700 px-6 text-white hover:bg-emerald-800">
              <Link href="/weekly-menu">View the full weekly menu</Link>
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {weeklyProducts.map((product, index) => (
              <ProductMarketCard
                key={product.id}
                product={product}
                commerceProduct={getCommerceProduct(product)}
                priority={index < 3}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-emerald-900/10 bg-white py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">How market preorder works</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Four steps. No guessing.</h2>
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
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Saturday market pickup</p>
              <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Choose the market that works for you.</h2>
            </div>
            <Button asChild variant="outline" className="h-12 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
              <Link href="/markets">Full market details</Link>
            </Button>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {MARKETS.slice(0, 2).map((market) => (
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
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">Scheduled delivery is next</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Help us build the first delivery routes around real demand.</h2>
            <p className="mt-4 max-w-2xl leading-8 text-emerald-50/90">
              We are market-first today. The next step is planned Atlanta-area delivery windows on specific route days—not random on-demand delivery.
            </p>
            <div className="mt-6 grid gap-3">
              {[
                'Tell us your neighborhood or ZIP',
                'Tell us which weekday or evening works best',
                'We will open route days where enough customers line up',
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
            title="Help shape the delivery route"
            description="Share your area and the day or time that would make delivery useful for you."
            cta="Add my delivery interest"
            collectMessage
            messagePlaceholder="Neighborhood or ZIP + preferred delivery day/time"
            successTitle="Delivery interest received."
            successDescription="We’ll use this to plan practical route days and contact you when your area opens."
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
              Golf tournaments have been a strong fit, but we are available for much more: corporate events, community gatherings, wellness events, private celebrations, pop-ups, tournaments, and other vendor opportunities.
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
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">What we can plan around</p>
            <div className="mt-5 grid gap-4 text-sm text-stone-700">
              <p className="rounded-2xl bg-stone-50 p-4"><Store className="mr-2 inline h-4 w-4 text-emerald-700" />Vendor setup and product sales</p>
              <p className="rounded-2xl bg-stone-50 p-4"><Package className="mr-2 inline h-4 w-4 text-emerald-700" />Preplanned product quantities and menu fit</p>
              <p className="rounded-2xl bg-stone-50 p-4"><Users className="mr-2 inline h-4 w-4 text-emerald-700" />Sampling, education, and guest interaction</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-stone-100/70 py-14">
        <div className="container grid gap-8 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm">
            <Heart className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Founder-led and market-built</p>
            <h2 className="mt-2 text-3xl font-semibold">Started at home. Grew through real market conversations.</h2>
            <p className="mt-4 leading-8 text-stone-700">
              Taste of Gratitude began with Jenneisha soaking, blending, sharing, and teaching people how to use sea moss in everyday routines—then grew through repeat farmers-market relationships.
            </p>
            <Button asChild variant="outline" className="mt-6 h-11 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
              <Link href="/about">Read our story</Link>
            </Button>
          </div>
          <div className="rounded-[2rem] bg-white p-6 shadow-sm">
            <Mail className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Can’t find your favorite?</p>
            <h2 className="mt-2 text-3xl font-semibold">Ask for the next batch.</h2>
            <p className="mt-4 leading-8 text-stone-700">
              Flavor requests help us plan future batches. A request is not a reservation until availability, quantity, price, and pickup are confirmed.
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
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Get next week’s menu.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-emerald-50/90">
              One useful email: weekly menu, pickup reminders, and important product updates.
            </p>
          </div>
          <RetentionForm
            intent="email_signup"
            source="homepage_retention_footer"
            title="Join the weekly menu email"
            description="Get the next menu and market pickup reminder."
            cta="Send me the weekly menu"
          />
        </div>
      </section>
    </main>
  );
}
