'use client';

import { useMemo, useState } from 'react';
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
  Sparkles,
  Store,
  Users,
} from 'lucide-react';
import QuickAddButton from '@/components/QuickAddButton';
import RetentionForm from '@/components/RetentionForm';
import { JsonLd } from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BUNDLES } from '@/data/bundles';
import { MARKETS } from '@/data/markets';
import {
  getBestSellerProducts,
  getCategoryLabel,
  getProductBySlugOrId,
  normalizeProductKey,
  toStorefrontProduct,
} from '@/data/products';
import {
  WEEKLY_MENU,
  WEEKLY_MENU_CATEGORIES,
  getWeeklyMenuProducts,
} from '@/data/weeklyMenu';
import { track } from '@/utils/analytics';

const FLAVOR_PROFILE_LINKS = [
  { label: 'Tropical', href: '/request-a-flavor?profile=tropical' },
  { label: 'Berry-forward', href: '/request-a-flavor?profile=berry-forward' },
  { label: 'Citrus', href: '/request-a-flavor?profile=citrus' },
  { label: 'Ginger-forward', href: '/request-a-flavor?profile=ginger-forward' },
  { label: 'Mint-forward', href: '/request-a-flavor?profile=mint-forward' },
  { label: 'Herbal', href: '/request-a-flavor?profile=herbal' },
  { label: 'Creamy or coconut', href: '/request-a-flavor?profile=creamy-coconut' },
  { label: 'Blue spirulina', href: '/request-a-flavor?profile=blue-spirulina' },
  { label: 'Surprise me', href: '/request-a-flavor?profile=surprise-me' },
];

const CUSTOMER_PATHS = [
  { icon: Users, title: 'Join a shared batch', text: 'Add your request to a pooled flavor batch. We confirm the batch once demand reaches the threshold.' },
  { icon: Package, title: 'Request a microbatch', text: 'Need a smaller custom run? We may offer a dedicated batch option with a setup fee after owner review.' },
  { icon: Store, title: 'Sample at the market', text: 'Meet us at Serenbe or Dunwoody to taste what is fresh before you reserve a larger size.' },
];

const ORDERING_STEPS = [
  {
    icon: Mail,
    title: 'Get the menu',
    text: 'Start with the weekly email so you know what is fresh before market day.',
  },
  {
    icon: ShoppingBag,
    title: 'Reserve your batch',
    text: 'Use preorder to hold the gels, drinks, refreshers, and shots you want for pickup.',
  },
  {
    icon: Package,
    title: 'Pick up fresh',
    text: 'Grab your reserved order at the booth during market hours.',
  },
  {
    icon: Repeat,
    title: 'Come back next week',
    text: 'Sign up for menu reminders so you see the next batch first.',
  },
];

function ingredientPreview(product) {
  return product.ingredients.slice(0, 3).join(', ');
}

function availabilityLabel(product) {
  if (product.soldOut || product.inventoryStatus === 'sold_out') return 'Sold out';
  if (product.inventoryStatus === 'limited' || product.weeklyStatus === 'limited') return 'Small batch';
  if (product.preorderOnly) return 'Reserve for pickup';
  return 'Available this week';
}

function ProductMarketCard({ product, priority = false, commerceProduct = null }) {
  const storefrontProduct = useMemo(() => commerceProduct || toStorefrontProduct(product), [commerceProduct, product]);
  const productSize = product.sizes?.[0] || '';

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-emerald-900/10 bg-white shadow-sm shadow-emerald-950/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-950/10">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
          <img
            src={product.image}
            alt={`${product.name} from Taste of Gratitude`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading={priority ? 'eager' : 'lazy'}
          />
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-900 shadow-sm">
            {availabilityLabel(product)}
          </div>
        </div>
      </Link>
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">{getCategoryLabel(product.category)}</p>
            <Link href={`/product/${product.slug}`} className="mt-1 block text-xl font-semibold leading-tight text-stone-950 hover:text-emerald-800">
              {product.name}
            </Link>
          </div>
          <p className="shrink-0 text-lg font-bold text-emerald-800">${product.price.toFixed(2)}{productSize && <span className="ml-1 text-xs font-medium text-stone-500">· {productSize}</span>}</p>
        </div>
        <p className="text-sm leading-6 text-stone-600">{product.shortDescription}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-700">{ingredientPreview(product)}</span>
        </div>
        <div className="mt-auto pt-5">
          <QuickAddButton
            product={storefrontProduct}
            selectedVariant={storefrontProduct.variations?.[0]}
            className="h-11 w-full rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function BundleCard({ bundle }) {
  const included = bundle.productsIncluded.map((id) => getProductBySlugOrId(id)).filter(Boolean);

  return (
    <article className="rounded-[1.5rem] border border-emerald-900/10 bg-white p-5 shadow-sm">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Curated set</p>
      <h3 className="text-xl font-semibold text-stone-950">{bundle.name}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">{bundle.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {included.map((product) => (
          <span key={product.id} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
            {product.name}
          </span>
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{bundle.savingsText}</p>
      <Button asChild variant="outline" className="mt-5 h-11 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
        <Link href={`/catalog?search=${encodeURIComponent(included[0]?.name || bundle.name)}`}>{bundle.cta}</Link>
      </Button>
    </article>
  );
}

export default function HomePageClient({
  initialFeaturedProducts = [],
  organizationSchema,
  faqSchema,
}) {
  const [activeCategory, setActiveCategory] = useState('all');
  const weeklyProducts = useMemo(() => getWeeklyMenuProducts(activeCategory), [activeCategory]);
  const bestSellers = useMemo(() => getBestSellerProducts(), []);
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
  const totalWeeklyItems = getWeeklyMenuProducts('all').length;

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-stone-950">
      <JsonLd id="home-organization-schema" data={organizationSchema} />
      <JsonLd id="home-faq-schema" data={faqSchema} />

      <section className="overflow-hidden border-b border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-950 text-white">
        <div className="container grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
              Fresh batches guided by customer requests
            </p>
            <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Tell us what you want to sip next.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50/90 sm:text-xl">
              Request a flavor, reserve a gallon, or meet us at the market to sample what is fresh. We confirm availability before you pay.
            </p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <Button asChild className="h-14 rounded-full bg-white px-8 text-base font-bold text-emerald-950 hover:bg-emerald-50">
                <Link href="/request-a-flavor" onClick={() => track('click_request_flavor', { source: 'homepage_hero' })}>
                  Request a flavor
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-14 rounded-full border-white/30 bg-transparent px-8 text-base font-bold text-white hover:bg-white/10 hover:text-white">
                <Link href="/markets" onClick={() => track('click_find_market', { source: 'homepage_hero' })}>
                  Find a market
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-emerald-50/80">
              Requests help us plan. Your request becomes an order only after we confirm the flavor, quantity, price, and pickup details.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {CUSTOMER_PATHS.map((path) => (
                <div key={path.title} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <path.icon className="mb-2 h-5 w-5 text-emerald-200" aria-hidden="true" />
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-100">{path.title}</p>
                  <p className="mt-1 text-sm leading-5 text-white/90">{path.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/20 bg-white/95 p-5 text-stone-950 shadow-2xl shadow-emerald-950/40">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Popular flavor profiles</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {FLAVOR_PROFILE_LINKS.map((profile) => (
                <Link
                  key={profile.label}
                  href={profile.href}
                  className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
                  onClick={() => track('select_flavor_profile', { source: 'homepage_hero', profile: profile.label })}
                >
                  {profile.label}
                </Link>
              ))}
            </div>
            <div className="mt-6 rounded-[1.5rem] bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-950">Weekly menu still available</p>
              <p className="mt-1 text-sm leading-6 text-emerald-800">
                See what is already confirmed for this week, then request anything that is missing.
              </p>
              <Button asChild variant="outline" className="mt-3 h-11 w-full rounded-full border-emerald-300 text-emerald-900 hover:bg-emerald-100">
                <Link href="/weekly-menu" onClick={() => track('view_weekly_menu', { source: 'homepage_hero' })}>
                  View this week&apos;s menu
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="weekly-menu" className="scroll-mt-24 py-14 sm:py-18">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">{WEEKLY_MENU.title}</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">Fresh this week, made in small batches.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">{WEEKLY_MENU.preorderLanguage}</p>
            </div>
            <Button asChild className="h-12 rounded-full bg-emerald-700 px-6 text-white hover:bg-emerald-800">
              <Link href="/catalog">Shop the full menu</Link>
            </Button>
          </div>
          <div className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="tablist" aria-label="Filter weekly menu">
            {WEEKLY_MENU_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                  activeCategory === category.id
                    ? 'bg-emerald-700 text-white'
                    : 'border border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50'
                }`}
              >
                <span aria-hidden="true">{category.icon}</span> {category.label}
              </button>
            ))}
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {weeklyProducts.slice(0, 9).map((product, index) => (
              <ProductMarketCard key={product.id} product={product} commerceProduct={getCommerceProduct(product)} priority={index < 3} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-emerald-900/10 bg-white py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">How ordering works</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl">A simple way to order every week.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {ORDERING_STEPS.map(({ icon: Icon, title, text }, index) => (
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

      <section id="featured" className="scroll-mt-24 py-14">
        <div className="container grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Best sellers</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl">Start where the market already does.</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {bestSellers.map((product) => (
                <ProductMarketCard key={product.id} product={product} commerceProduct={getCommerceProduct(product)} />
              ))}
            </div>
          </div>
          <div className="sticky top-24 rounded-[2rem] border border-emerald-900/10 bg-emerald-950 p-6 text-white shadow-xl shadow-emerald-950/15">
            <Sparkles className="h-8 w-8 text-emerald-200" aria-hidden="true" />
            <h2 className="mt-4 text-3xl font-semibold">Find your starting point.</h2>
            <p className="mt-3 leading-7 text-emerald-50/90">Answer four questions and get a primary product, backup product, and bundle suggestion based on your flavor preference, product format, cadence, and avoid list.</p>
            <Button asChild className="mt-6 h-12 rounded-full bg-white px-6 text-emerald-950 hover:bg-emerald-50">
              <Link href="/quiz">Take the Product Quiz <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="what-is-sea-moss" className="scroll-mt-24 bg-stone-100/70 py-14">
        <div className="container grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="overflow-hidden rounded-[2rem] bg-stone-200 shadow-xl">
            <img src="/images/gratog-bg.PNG" alt="Small batch Taste of Gratitude products" className="h-80 w-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Founder story</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-stone-950">Started at home, then shared at the farmers market.</h2>
            <div className="mt-5 space-y-4 text-base leading-8 text-stone-700">
              <p>Taste of Gratitude began with Jenneisha soaking, blending, and sharing sea moss with family before bringing it to the farmers market.</p>
              <p>The brand works because customers do not just buy a drink. They learn how sea moss fits into smoothies, teas, and everyday drinks — then they come back.</p>
            </div>
            <Button asChild variant="outline" className="mt-6 h-12 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
              <Link href="/about">Read the story</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="markets" className="py-14">
        <div className="container">
          <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Market pickup</p>
              <h2 className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl">Reserve online. Pick up at the booth.</h2>
            </div>
            <Button asChild variant="outline" className="h-12 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
              <Link href="/markets">See all market details</Link>
            </Button>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {MARKETS.map((market) => (
              <article key={market.id} className="rounded-[1.5rem] border border-emerald-900/10 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">{market.pickupDays}</p>
                    <h3 className="mt-2 text-xl font-semibold text-stone-950">{market.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{market.description}</p>
                  </div>
                  <Store className="h-8 w-8 text-emerald-700" aria-hidden="true" />
                </div>
                <div className="mt-5 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
                  <p className="rounded-2xl bg-stone-50 p-3"><Clock className="mr-2 inline h-4 w-4 text-emerald-700" aria-hidden="true" />{market.hours}</p>
                  <p className="rounded-2xl bg-stone-50 p-3"><MapPin className="mr-2 inline h-4 w-4 text-emerald-700" aria-hidden="true" />{market.shortName}</p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button asChild className="h-11 rounded-full bg-emerald-700 text-white hover:bg-emerald-800">
                    <Link
                      href={`/preorder?market=${encodeURIComponent(market.id)}&utm_source=homepage_market&utm_campaign=weekly_menu_drop`}
                      onClick={() => track('home_preorder_click', { source: 'homepage_market_card', marketId: market.id })}
                    >
                      Reserve pickup
                    </Link>
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

      <section id="benefits" className="scroll-mt-24 bg-white py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Curated picks</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl">Try a ready-made set from this week’s menu.</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {BUNDLES.slice(0, 3).map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button asChild variant="outline" className="h-12 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
              <Link href="/weekly-menu?utm_source=homepage_bundles&utm_campaign=weekly_menu_drop">
                View weekly menu and build a box →
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Community proof</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-950">Built through real farmers market conversations.</h2>
            <div className="mt-6 rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
              <p className="leading-7 text-stone-700">
                Real customer reviews will appear here as they are collected. If you have tried Taste of Gratitude, share your review at the market or email us.
              </p>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-[2rem] bg-emerald-950 p-6 text-white">
              <Users className="h-8 w-8 text-emerald-200" aria-hidden="true" />
              <h3 className="mt-4 text-2xl font-semibold">Wholesale and partner inquiries</h3>
              <p className="mt-3 leading-7 text-emerald-50/90">Studios, retailers, cafes, and market partners can tell us what they need and receive a personal follow-up on products, quantities, and pickup or delivery.</p>
              <Button asChild className="mt-6 h-12 rounded-full bg-white px-6 text-emerald-950 hover:bg-emerald-50">
                <Link href="/wholesale">Wholesale inquiry</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-emerald-700 to-emerald-950 py-14 text-white">
        <div className="container grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <Heart className="h-8 w-8 text-emerald-200" aria-hidden="true" />
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">See what we are making next.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-emerald-50/90">Join the email list for new menus, ingredient notes, market reminders, and product updates.</p>
            <div className="mt-5 grid gap-2 text-sm text-emerald-50/90 sm:grid-cols-3">
              {['Weekly menu drops', 'Market pickup reminders', 'Product education'].map((item) => (
                <p key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-200" aria-hidden="true" />{item}</p>
              ))}
            </div>
          </div>
          <RetentionForm
            intent="email_signup"
            source="homepage_retention_footer"
            title="Join the weekly menu email"
            description="Get the next menu, ingredient notes, pickup reminders, and new-product updates."
            cta="Join weekly emails"
          />
        </div>
      </section>
    </main>
  );
}
