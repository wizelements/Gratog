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
  ShoppingBag,
  Store,
  Truck,
  Users,
} from 'lucide-react';
import QuickAddButton from '@/components/QuickAddButton';
import { LEMONADE_PACKS } from '@/lib/lemonade-packs';
import ProductVisual from '@/components/ProductVisual';
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
  { icon: ShoppingBag, title: 'Choose your favorites', text: 'Browse the regular shop, choose your sizes, and add eligible items to your cart.' },
  { icon: Truck, title: 'Check your delivery address', text: 'At checkout, enter your full Atlanta-area address. We confirm eligibility and available delivery options before payment.' },
  { icon: Package, title: 'Review your order', text: 'Confirm the item prices, delivery fee, and available time before placing your order.' },
  { icon: CheckCircle2, title: 'Receive confirmation', text: 'After successful payment, check your order confirmation for the confirmed fulfillment details.' },
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
          <ProductVisual
            product={storefrontProduct || product}
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
              Handcrafted in Atlanta • Georgia orders only
            </p>
            <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Your favorite flavors. No market trip required.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50/90 sm:text-xl">
              Ordering drinks or sea moss just for yourself? Shop online for eligible Atlanta-area delivery. Market visits are optional, and non-market pickup requests are handled separately.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="h-14 rounded-full bg-white px-8 text-base font-bold text-emerald-950 hover:bg-emerald-50">
                <Link href="/catalog">Shop for local delivery <ArrowRight className="ml-2 inline h-5 w-5" aria-hidden="true" /></Link>
              </Button>
              <Button asChild className="h-14 rounded-full bg-amber-300 px-8 text-base font-bold text-stone-950 hover:bg-amber-200">
                <Link href="/lemonade-packs">Shop lemonade packs</Link>
              </Button>
              <Button asChild variant="outline" className="h-14 rounded-full border-white/30 bg-transparent px-8 text-base font-bold text-white hover:bg-white/10 hover:text-white">
                <Link href="/contact?request=non-market-pickup">Request non-market pickup</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-emerald-50/80">
              Delivery is confirmed from your full address and product eligibility at checkout; it is not guaranteed by ZIP code alone. Browns Mill-area Monday pickup (12–5) is being arranged and is not an online reservation yet. We confirm the meeting address before any pickup order.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/20 bg-white/95 p-6 text-stone-950 shadow-2xl shadow-emerald-950/40">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Start with how you want to get it</p>
            <h2 className="mt-3 text-3xl font-semibold">Ordering for yourself?</h2>
            <p className="mt-3 leading-7 text-stone-600">You do not have to visit a farmers market to shop with us.</p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="flex items-center gap-2 font-semibold text-emerald-950"><Truck className="h-5 w-5" aria-hidden="true" /> Local delivery</p>
                <p className="mt-1 text-sm text-stone-700">Browse products, add to cart, then enter your address to check available delivery and fees.</p>
                <Link href="/catalog" className="mt-2 inline-flex min-h-10 items-center font-semibold text-emerald-800 underline underline-offset-4">Start a delivery order</Link>
              </div>
              <div className="rounded-2xl bg-stone-100 p-4">
                <p className="flex items-center gap-2 font-semibold"><MapPin className="h-5 w-5" aria-hidden="true" /> Pickup without a market</p>
                <p className="mt-1 text-sm text-stone-700">Browns Mill area, Mondays 12–5, is planned. Booking is not live; request an appointment and wait for location confirmation.</p>
                <Link href="/contact?request=non-market-pickup" className="mt-2 inline-flex min-h-10 items-center font-semibold text-emerald-800 underline underline-offset-4">Ask about neighborhood pickup</Link>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4">
                <p className="flex items-center gap-2 font-semibold"><Store className="h-5 w-5" aria-hidden="true" /> Prefer a market?</p>
                <p className="mt-1 text-sm text-stone-700">Market preorders are a separate option, not required for regular delivery orders.</p>
                <Link href="/weekly-menu" className="mt-2 inline-flex min-h-10 items-center font-semibold text-emerald-800 underline underline-offset-4">Browse market preorders</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="lemonade-packs" className="scroll-mt-24 border-b border-stone-200 bg-[#f5eee1] py-14 sm:py-20">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-800">New • Lemonade-only bundles</p>
              <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">More to sip. More to share.</h2>
              <p className="mt-4 max-w-2xl text-stone-700">Your choice of four or six handcrafted 16 oz lemonades. Mix and match available flavors, or stock up on one favorite.</p>
            </div>
            <p className="text-sm font-semibold text-stone-700">No juices, shots or sea moss gel in these offers.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {LEMONADE_PACKS.map((pack) => (
              <article key={pack.size} className="flex flex-col rounded-[2rem] border border-emerald-900/10 bg-white p-7 shadow-md sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">{pack.size === 6 ? 'Best per-bottle value' : 'A little more to enjoy'}</p>
                <h3 className="mt-2 text-3xl font-semibold">Lemonade {pack.size}-Pack</h3>
                <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <strong className="text-4xl tabular-nums text-emerald-950">&#36;{(pack.priceCents / 100).toFixed(2)}</strong>
                  <s className="text-xl text-stone-500">&#36;{(pack.regularCents / 100).toFixed(2)}</s>
                </div>
                <p className="mt-2 text-sm font-semibold text-emerald-800">Save &#36;{(pack.savingsCents / 100).toFixed(2)} on {pack.size} bottles</p>
                <p className="mt-5 flex-1 text-stone-600">Choose {pack.size} eligible lemonades. Repeat flavors freely. Discount automatically applied when qualifying bottles are in your cart.</p>
                <Button asChild className="mt-7 h-12 rounded-full bg-emerald-800 font-bold text-white hover:bg-emerald-900">
                  <Link href={`/lemonade-packs?size=${pack.size}`}>Choose {pack.size} lemonades <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
                </Button>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs text-stone-600">Pack prices exclude any fulfillment fees. Available flavors and delivery or pickup eligibility are verified at checkout. Pack and coupon discounts do not stack.</p>
        </div>
      </section>

      <section id="weekly-menu" className="scroll-mt-24 py-14 sm:py-16">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Browse the regular online shop</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Find your favorites.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
                Order for yourself without a market visit. Product availability and eligible delivery options are checked before payment. For market-only items, use the separate market preorder menu.
              </p>
            </div>
            <Button asChild className="h-12 rounded-full bg-emerald-700 px-6 text-white hover:bg-emerald-800">
              <Link href="/catalog">Browse the full shop</Link>
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
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">How to order for yourself</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">From your cart to your door.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-stone-600">Choose eligible products for local delivery without selecting a farmers market.</p>
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
              You can begin an eligible Atlanta-area delivery order in our regular shop right now. Enter your full address during checkout to check service and any delivery fee. For routes we do not yet serve, leave your neighborhood so we can plan future service.
            </p>
            <Button asChild className="mt-6 h-12 rounded-full bg-white px-7 font-bold text-emerald-950 hover:bg-emerald-50">
              <Link href="/catalog">Shop for local delivery <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
            </Button>
            <div className="mt-6 grid gap-3">
              {[
                'Choose products from the regular online shop',
                'Enter your complete delivery address during checkout',
                'Only pay after reviewing available fulfillment and fees',
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
            title="Outside our current delivery area?"
            description="Share your neighborhood or ZIP and preferred day to hear if a future route opens. This form is not an order."
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
