'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Package,
  Repeat,
  ShoppingBag,
  Sparkles,
  Star,
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

const STAT_CARDS = [
  { label: 'Weekly rhythm', value: 'Menu drops' },
  { label: 'Fulfillment', value: 'Market pickup' },
  { label: 'Batch style', value: 'Small-batch' },
];

const ORDERING_STEPS = [
  {
    icon: MessageCircle,
    title: 'Join the weekly menu',
    text: 'Start with a low-friction text so you know what is fresh before market day.',
  },
  {
    icon: ShoppingBag,
    title: 'Reserve your batch',
    text: 'When you already know what you want, use preorder to hold weekly staples for pickup.',
  },
  {
    icon: Package,
    title: 'Pick up fresh',
    text: 'Grab your reserved gels, drinks, refreshers, and shots at the booth.',
  },
  {
    icon: Repeat,
    title: 'Reorder next week',
    text: 'Join reminders so your routine continues with the next menu drop.',
  },
];

const RETENTION_PROMPTS = [
  {
    title: 'Reorder reminder',
    text: 'Get a nudge before your weekly staples usually run out.',
    intent: 'reorder_reminder',
  },
  {
    title: 'Referral prompt',
    text: 'Send a friend to the booth and get notified when referral rewards go live.',
    intent: 'referral_prompt',
  },
  {
    title: 'Review request',
    text: 'Share what you tried so new customers know where to start.',
    intent: 'review_request',
  },
  {
    title: 'Subscription waitlist',
    text: 'Be first to know when weekly wellness boxes can recur automatically.',
    intent: 'subscription_waitlist',
  },
];

function ingredientPreview(product) {
  return product.ingredients.slice(0, 3).join(', ');
}

function availabilityLabel(product) {
  if (product.soldOut || product.inventoryStatus === 'sold_out') return 'Sold out';
  if (product.inventoryStatus === 'limited' || product.weeklyStatus === 'limited') return 'Limited batch';
  if (product.preorderOnly) return 'Preorder';
  return 'Available this week';
}

function ProductMarketCard({ product, priority = false, commerceProduct = null }) {
  const storefrontProduct = useMemo(() => commerceProduct || toStorefrontProduct(product), [commerceProduct, product]);
  const benefit = product.wellnessSupport[0] || 'Weekly wellness';

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
          <p className="shrink-0 text-lg font-bold text-emerald-800">${product.price.toFixed(2)}</p>
        </div>
        <p className="text-sm leading-6 text-stone-600">{product.shortDescription}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">{benefit}</span>
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
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Bundle-ready</p>
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
  initialCatalogCount = null,
  organizationSchema,
  faqSchema,
  featuredReviews = [],
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
  const hasFeaturedReviews = Array.isArray(featuredReviews) && featuredReviews.length > 0;
  const totalWeeklyItems = getWeeklyMenuProducts('all').length;
  const catalogBadge = Number.isFinite(initialCatalogCount) && initialCatalogCount > 0
    ? `${initialCatalogCount} live catalog items`
    : `${totalWeeklyItems} weekly menu items`;

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-stone-950">
      <JsonLd id="home-organization-schema" data={organizationSchema} />
      <JsonLd id="home-faq-schema" data={faqSchema} />

      <section className="overflow-hidden border-b border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-950 text-white">
        <div className="container grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
              {WEEKLY_MENU.eyebrow} • {catalogBadge}
            </p>
            <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Your weekly farmers market wellness routine starts here.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50/90 sm:text-xl">
              Taste of Gratitude is a fresh weekly menu of sea moss gels, lemonades, refreshers, and shots made in small batches for local pickup, education, and repeat wellness routines.
            </p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <Button asChild className="h-14 rounded-full bg-white px-8 text-base font-bold text-emerald-950 hover:bg-emerald-50">
                <Link href="/weekly-menu?utm_source=homepage_hero&utm_campaign=passive_preorder_funnel" onClick={() => track('home_preorder_click', { source: 'homepage_hero_weekly_menu_cta' })}>
                  Get Menu Texts
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-14 rounded-full border-white/30 bg-transparent px-8 text-base font-bold text-white hover:bg-white/10 hover:text-white">
                <Link href="/catalog">Shop This Week</Link>
              </Button>
              <Button asChild variant="outline" className="h-14 rounded-full border-white/30 bg-transparent px-8 text-base font-bold text-white hover:bg-white/10 hover:text-white">
                <Link href="/quiz">Take the Wellness Quiz</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-emerald-50/80">
              Already a market regular?{' '}
              <Link
                href="/preorder"
                onClick={() => track('home_preorder_click', { source: 'homepage_hero_regular_link' })}
                className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
              >
                Reserve your market pickup →
              </Link>
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {STAT_CARDS.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-100">{stat.label}</p>
                  <p className="mt-1 font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div id="weekly-texts" className="rounded-[2rem] border border-white/20 bg-white/95 p-4 text-stone-950 shadow-2xl shadow-emerald-950/40 sm:p-5">
            <div className="overflow-hidden rounded-[1.5rem] bg-stone-100">
              <img src="/images/gratog-bg.PNG" alt="Taste of Gratitude market products" className="h-64 w-full object-cover sm:h-80" />
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {['Menu text', 'Reserve', 'Pickup'].map((item, index) => (
                <div key={item} className="rounded-2xl bg-emerald-50 p-3 text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">0{index + 1}</p>
                  <p className="font-semibold text-emerald-950">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <RetentionForm
                intent="weekly_menu_texts"
                source="homepage_hero"
                title="Get weekly menu texts"
                description="Drop your number for menu drops, limited-batch reminders, and pickup updates before market day."
                cta="Text me the menu"
                collectEmail={false}
                collectPhone
                metadata={{ sourceCampaign: 'passive_preorder_funnel' }}
                compact
              />
            </div>
          </div>
        </div>
      </section>

      <section id="weekly-menu" className="scroll-mt-24 py-14 sm:py-18">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">{WEEKLY_MENU.title}</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">Fresh this week, not a stale catalog.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">{WEEKLY_MENU.preorderLanguage}</p>
            </div>
            <Button asChild className="h-12 rounded-full bg-emerald-700 px-6 text-white hover:bg-emerald-800">
              <Link href="/catalog">Open Full Shop</Link>
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
            <h2 className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl">A market rhythm customers can repeat.</h2>
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
            <p className="mt-3 leading-7 text-emerald-50/90">Answer four questions and get a primary product, backup product, and bundle suggestion based on your wellness goal, product preference, cadence, and avoid list.</p>
            <Button asChild className="mt-6 h-12 rounded-full bg-white px-6 text-emerald-950 hover:bg-emerald-50">
              <Link href="/quiz">Take the Wellness Quiz <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
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
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-stone-950">Built from a health journey, then shared at the farmers market.</h2>
            <div className="mt-5 space-y-4 text-base leading-8 text-stone-700">
              <p>Taste of Gratitude began as Jenneisha&apos;s personal wellness routine: soaking, blending, and sharing sea moss with family before it became a market table.</p>
              <p>The brand works because customers do not just buy a drink. They learn how sea moss fits into smoothies, teas, daily minerals, hydration, and weekly routines — then they come back.</p>
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
                      href={`/preorder?market=${encodeURIComponent(market.id)}&utm_source=homepage_market&utm_campaign=passive_preorder_funnel`}
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
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Bundle system</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl">Subscription-ready boxes without waiting on backend automation.</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {BUNDLES.slice(0, 3).map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button asChild variant="outline" className="h-12 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
              <Link href="/weekly-menu?utm_source=homepage_bundles&utm_campaign=passive_preorder_funnel">
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
            <h2 className="mt-2 text-3xl font-semibold text-stone-950">A farmers market brand grows through real routines.</h2>
            <div className="mt-6 grid gap-4">
              {hasFeaturedReviews ? featuredReviews.map((review, index) => (
                <blockquote key={`${review.name || 'review'}-${index}`} className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex gap-1 text-yellow-500" aria-label={`${review.rating} star review`}>
                    {Array.from({ length: Math.max(1, Math.round(Number(review.rating) || 5)) }).map((_, starIndex) => <Star key={starIndex} className="h-4 w-4 fill-current" aria-hidden="true" />)}
                  </div>
                  <p className="leading-7 text-stone-700">“{review.comment}”</p>
                  <footer className="mt-4 text-sm font-semibold text-stone-950">{review.name || 'Taste of Gratitude customer'}</footer>
                </blockquote>
              )) : [
                'The booth makes wellness feel approachable, not intimidating.',
                'I love being able to taste, ask questions, and come back the next week.',
                'The drinks make sea moss easy to work into my routine.',
              ].map((quote) => (
                <blockquote key={quote} className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm leading-7 text-stone-700">“{quote}”</blockquote>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-[2rem] bg-emerald-950 p-6 text-white">
              <Users className="h-8 w-8 text-emerald-200" aria-hidden="true" />
              <h3 className="mt-4 text-2xl font-semibold">Wholesale and partner inquiries</h3>
              <p className="mt-3 leading-7 text-emerald-50/90">Wellness studios, retailers, cafes, and market partners can start a low-friction inquiry now, even before wholesale automation is fully connected.</p>
              <Button asChild className="mt-6 h-12 rounded-full bg-white px-6 text-emerald-950 hover:bg-emerald-50">
                <Link href="/wholesale">Wholesale inquiry</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {RETENTION_PROMPTS.map((prompt) => (
                <div key={prompt.intent} className="rounded-[1.5rem] border border-emerald-900/10 bg-white p-4 shadow-sm">
                  <MessageCircle className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold text-stone-950">{prompt.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{prompt.text}</p>
                  <div className="mt-4">
                    <RetentionForm
                      intent={prompt.intent}
                      source="homepage_retention_prompt"
                      title={prompt.title}
                      description={prompt.text}
                      cta="Notify me"
                      collectPhone={prompt.intent === 'reorder_reminder' || prompt.intent === 'subscription_waitlist'}
                      compact
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-emerald-700 to-emerald-950 py-14 text-white">
        <div className="container grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <Heart className="h-8 w-8 text-emerald-200" aria-hidden="true" />
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Keep the weekly routine going.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-emerald-50/90">Join the email list for menu drops, sea moss education, market reminders, subscription updates, referral prompts, and review requests.</p>
            <div className="mt-5 grid gap-2 text-sm text-emerald-50/90 sm:grid-cols-3">
              {['Weekly menu drops', 'Market pickup reminders', 'Subscription waitlist'].map((item) => (
                <p key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-200" aria-hidden="true" />{item}</p>
              ))}
            </div>
          </div>
          <RetentionForm
            intent="email_signup"
            source="homepage_retention_footer"
            title="Join the wellness community"
            description="Get the next menu, product education, reorder reminders, and early subscription updates."
            cta="Join weekly emails"
          />
        </div>
      </section>
    </main>
  );
}
