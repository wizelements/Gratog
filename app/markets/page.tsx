'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  HelpCircle,
  MapPin,
  Navigation,
  Package,
  Shield,
  ShoppingBag,
  Sparkles,
  Store,
  SunMedium,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import RetentionForm from '@/components/RetentionForm';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { track } from '@/utils/analytics';

const DAY_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

function formatHoursRange(hours: string): string {
  if (!hours || !hours.includes('-')) return hours || 'Market hours updating';

  const [start, end] = hours.split('-').map(t => t.trim());
  const fmt = (time: string) => {
    const [hStr, mStr = '00'] = time.split(':');
    let hour = parseInt(hStr, 10);
    if (Number.isNaN(hour)) return time;

    const ampm = hour >= 12 ? 'PM' : 'AM';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour}:${mStr} ${ampm}`;
  };

  return `${fmt(start)} – ${fmt(end)}`;
}

interface PublicMarket {
  id: string;
  name: string;
  shortName?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  hours: string;
  dayOfWeek: number;
  description: string;
  mapsUrl?: string;
  addressLine?: string;
  isActive: boolean;
  featured: boolean;
  parkingNotes?: string;
  preorderCutoff?: string;
  pickupDays?: string;
}

interface ProductItem {
  id: string;
  name: string;
  category: string;
  emoji: string;
  price: number;
  image?: string;
  description?: string;
  isPopular?: boolean;
  isNew?: boolean;
}

const TRUST_POINTS = [
  { icon: Package, label: 'Small-batch weekly prep' },
  { icon: Shield, label: 'Secure checkout before payment' },
  { icon: Sparkles, label: 'Samples + founder-led market care' },
];

const EXPERIENCE_STEPS = [
  {
    title: 'Preorder to reserve your batch',
    text: 'Choose what you want before market day so your weekly routine is held aside and ready for pickup.',
  },
  {
    title: 'Walk up for samples and discovery',
    text: 'Stop by the booth to taste what is fresh, ask questions, and learn which blends fit your routine.',
  },
  {
    title: 'Prepared fresh in small runs',
    text: 'Products are made in weekly batches so market pickup feels personal, fresh, and intentional.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Should I preorder or shop at the booth?',
    answer: 'Preorder when you want specific items reserved for your week. Walk up when you want to sample, ask questions, or see what small-batch inventory is available that day.',
  },
  {
    question: 'When should I place a preorder?',
    answer: 'Earlier in the week is best. If a market has a stricter cutoff, follow the cutoff listed on that market card before checkout.',
  },
  {
    question: 'Where do I pick up my order?',
    answer: 'Choose your market before checkout, then pick up during that market window. Your confirmation will include the selected pickup details.',
  },
  {
    question: 'Will there be walk-up inventory?',
    answer: 'Usually yes, but quantities are intentionally limited. Preordering is the safest option for weekly staples and larger orders.',
  },
];

function getFullAddress(market: PublicMarket) {
  return market.addressLine || `${market.address}, ${market.city}, ${market.state} ${market.zip}`;
}

function getNextMarketLabel(dayOfWeek: number) {
  const today = new Date();
  const diff = (dayOfWeek - today.getDay() + 7) % 7;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff} days`;
}

function getMarketMeta(market: PublicMarket) {
  const dayName = DAY_LABELS[market.dayOfWeek] || 'Saturday';

  return {
    dayName,
    hours: formatHoursRange(market.hours),
    pickupDays: market.pickupDays || `${dayName} pickup`,
    preorderCutoff: market.preorderCutoff || 'Order early in the week to reserve your batch',
    parkingNotes: market.parkingNotes || 'Use posted market parking and look for the Taste of Gratitude booth.',
  };
}

function MarketCard({ market }: { market: PublicMarket }) {
  const meta = getMarketMeta(market);
  const fullAddress = getFullAddress(market);
  const mapsUrl = market.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`;

  return (
    <article id={market.id} className="flex h-full scroll-mt-24 flex-col rounded-[1.75rem] border border-emerald-900/10 bg-white p-5 shadow-sm shadow-emerald-950/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-950/10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              {market.featured ? 'Flagship market' : 'Local pickup'}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              Next: {getNextMarketLabel(market.dayOfWeek)}
            </span>
          </div>
          <h3 className="text-xl font-semibold leading-tight text-stone-950">{market.name}</h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">{market.description}</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm">
          <Store className="h-6 w-6" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-stone-700">
        <div className="flex gap-3 rounded-2xl bg-stone-50 p-3">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          <div>
            <p className="font-semibold text-stone-950">{meta.dayName}s • {meta.hours}</p>
            <p className="text-stone-600">Pickup: {meta.pickupDays}</p>
          </div>
        </div>
        <div className="flex gap-3 rounded-2xl bg-stone-50 p-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold text-stone-950">Address</p>
            <p className="break-words text-stone-600">{fullAddress}</p>
          </div>
        </div>
        <div className="flex gap-3 rounded-2xl bg-stone-50 p-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          <div>
            <p className="font-semibold text-stone-950">Preorder cutoff</p>
            <p className="text-stone-600">{meta.preorderCutoff}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
          Best for weekly pickups
        </span>
        <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700">
          Walk-up inventory available
        </span>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          Samples when available
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-3 text-sm text-stone-600">
        <span className="font-semibold text-stone-950">Parking:</span> {meta.parkingNotes}
      </div>

      <div className="mt-5">
        <RetentionForm
          intent="weekly_menu_texts"
          source={`markets_page_${market.id}`}
          title={`Text me ${market.shortName || market.name} reminders`}
          description={`Get the weekly menu, cutoff reminder, and preorder link for ${market.shortName || market.name}.`}
          cta="Text me market reminders"
          collectEmail={false}
          collectPhone
          metadata={{ marketId: market.id, sourceCampaign: 'passive_preorder_funnel' }}
          compact
        />
      </div>

      <div className="mt-auto grid gap-3 pt-5 sm:grid-cols-2">
        <Button asChild className="h-12 rounded-full bg-emerald-700 text-white hover:bg-emerald-800">
          <Link
            href={`/preorder?market=${encodeURIComponent(market.id)}&utm_source=markets_page&utm_campaign=passive_preorder_funnel`}
            onClick={() => track('market_preorder_click', { source: 'markets_page_card', marketId: market.id })}
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Preorder pickup
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-12 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Get directions to ${market.name}`}>
            <Navigation className="h-4 w-4" aria-hidden="true" />
            Map
          </a>
        </Button>
      </div>
    </article>
  );
}

function MarketCardSkeleton() {
  return (
    <div className="rounded-[1.75rem] border border-emerald-900/10 bg-white p-5 shadow-sm">
      <div className="mb-5 flex justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-5 w-32 animate-pulse rounded-full bg-stone-100" />
          <div className="h-7 w-4/5 animate-pulse rounded bg-stone-100" />
          <div className="h-16 animate-pulse rounded bg-stone-100" />
        </div>
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-stone-100" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-16 animate-pulse rounded-2xl bg-stone-100" />
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="h-12 animate-pulse rounded-full bg-stone-100" />
        <div className="h-12 animate-pulse rounded-full bg-stone-100" />
      </div>
    </div>
  );
}

function ProductPreviewCard({ product }: { product: ProductItem }) {
  return (
    <Link
      href={`/preorder?category=${encodeURIComponent(product.category)}`}
      className="group flex min-w-[210px] max-w-[230px] snap-start gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md lg:min-w-0 lg:max-w-none"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl" aria-hidden="true">
            {product.emoji}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-5 text-stone-950 group-hover:text-emerald-800">
          {product.name}
        </p>
        <p className="mt-1 text-sm font-bold text-emerald-800">${product.price.toFixed(2)}</p>
        <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-stone-500">
          Reserve for pickup <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </p>
      </div>
    </Link>
  );
}

function getCategoryAndEmoji(product: any) {
  const name = (product.name || '').toLowerCase();
  const rawCategory = String(
    product.category ||
    product.categoryId ||
    product.categoryLabel ||
    product.displayCategory ||
    product.intelligentCategory ||
    product.categoryData?.name ||
    ''
  ).toLowerCase();
  const haystack = `${rawCategory} ${name}`;
  let category = 'specials';
  let emoji = product.emoji || '🛍️';

  if (haystack.includes('lemonade') || haystack.includes('juice') || haystack.includes('drink') || rawCategory === 'lemonades') {
    category = 'lemonades';
    emoji = '🍋';
  } else if (haystack.includes('moss') || haystack.includes('gel') || rawCategory === 'gels') {
    category = 'sea-moss';
    emoji = '🌿';
  } else if (haystack.includes('refresher')) {
    category = 'refreshers';
    emoji = '🍹';
  } else if (haystack.includes('shot')) {
    category = 'shots';
    emoji = '🥃';
  }

  return { category, emoji };
}

export default function MarketsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<PublicMarket[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [marketsError, setMarketsError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/storefront/catalog', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to fetch products');

        const data = await response.json();
        const transformedProducts = (data.products || [])
          .filter((p: any) => p.available !== false && (p.inStock !== false || p.isPreorder === true || p.purchaseStatus === 'preorder'))
          .map((p: any) => {
            const { category, emoji } = getCategoryAndEmoji(p);
            const name = (p.name || '').toLowerCase();

            return {
              id: p.id,
              name: p.name,
              category,
              emoji,
              price: p.price || (p.priceCents || 0) / 100,
              image: p.image,
              description: p.description,
              isPopular: p.isPopular || name.includes('original'),
              isNew: p.isNew || false,
            };
          });

        setProducts(transformedProducts);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setProducts([
          {
            id: 'fallback-golden-glow-gel',
            name: 'Golden Glow Gel',
            category: 'sea-moss',
            emoji: '🌿',
            price: 36,
            isPopular: true,
            description: 'Pineapple, orange, turmeric, ginger, honey, and sea moss in a golden gel.',
          },
          {
            id: 'fallback-kissed-by-gods',
            name: 'Kissed by Gods',
            category: 'lemonades',
            emoji: '🍋',
            price: 11,
            description: 'Basil, chlorophyll, ginger, lemon, sea moss, agave, and alkaline water.',
          },
          {
            id: 'fallback-grateful-defense',
            name: 'Elderberry Ginger Shot',
            category: 'shots',
            emoji: '🥃',
            price: 5,
            isNew: true,
            description: 'Elderberry, cranberry, apple, ginger, lemon, echinacea, sea moss, and alkaline water.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('/api/markets', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch markets');

        const data = await response.json();
        if (data.success && Array.isArray(data.markets)) {
          setMarkets(data.markets);
        } else {
          setMarketsError('No markets available right now.');
        }
      } catch (error) {
        console.error('Failed to fetch markets:', error);
        setMarketsError('Could not load markets. Please try again later.');
      } finally {
        setMarketsLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  const featuredProducts = useMemo(() => {
    const priority = ['sea-moss', 'lemonades', 'shots', 'juices', 'refreshers'];
    const priorityRank = (category: string) => {
      const index = priority.indexOf(category);
      return index === -1 ? 99 : index;
    };

    return [...products]
      .sort((a, b) => {
        const popularDelta = Number(!!b.isPopular) - Number(!!a.isPopular);
        if (popularDelta !== 0) return popularDelta;
        return priorityRank(a.category) - priorityRank(b.category);
      })
      .slice(0, 6);
  }, [products]);

  return (
    <div className="min-h-screen bg-[#fbfaf5] text-stone-950">
      <header className="overflow-hidden border-b border-emerald-900/10 bg-gradient-to-b from-[#f6f2e8] via-[#fbfaf5] to-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-16">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800 shadow-sm">
              Atlanta market pickup • fresh weekly batches
            </p>
            <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
              Meet Taste of Gratitude at the market, then reserve what nourishes your week.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-700 sm:text-xl">
              Founder-led sea moss blends, lemonades, juices, and wellness staples made in small batches for local pickup, samples, and real conversation.
            </p>

            <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
              <Button asChild className="min-h-[52px] rounded-full bg-emerald-700 px-7 text-base font-semibold text-white shadow-lg shadow-emerald-900/15 hover:bg-emerald-800">
                <a href="#market-list">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                  Choose your market
                </a>
              </Button>
              <Button asChild variant="outline" className="min-h-[52px] rounded-full border-emerald-200 bg-white px-7 text-base font-semibold text-emerald-900 hover:bg-emerald-50">
                <Link href="/preorder?utm_source=markets_hero&utm_campaign=passive_preorder_funnel" onClick={() => track('market_preorder_click', { source: 'markets_page_hero' })}>
                  <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                  Already ready? Preorder
                </Link>
              </Button>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {TRUST_POINTS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm font-medium text-stone-700 shadow-sm">
                  <Icon className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-white/80 bg-emerald-950 shadow-2xl shadow-emerald-950/15">
              <Image
                src="/images/gratog-bg.PNG"
                alt="Taste of Gratitude products prepared for a calm market pickup experience"
                fill
                priority
                sizes="(min-width: 1024px) 46vw, 100vw"
                className="object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/70 via-emerald-950/10 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 rounded-3xl border border-white/20 bg-white/90 p-4 shadow-xl backdrop-blur sm:bottom-6 sm:left-6 sm:right-6 sm:p-5">
                <p className="text-sm font-bold text-emerald-900">How market pickup works</p>
                <ol className="mt-3 grid gap-2 text-sm text-stone-700 sm:grid-cols-3">
                  <li className="rounded-2xl bg-emerald-50 p-3"><span className="font-semibold text-stone-950">1.</span> Browse</li>
                  <li className="rounded-2xl bg-emerald-50 p-3"><span className="font-semibold text-stone-950">2.</span> Preorder</li>
                  <li className="rounded-2xl bg-emerald-50 p-3"><span className="font-semibold text-stone-950">3.</span> Pickup</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-32 pt-10 sm:px-6 sm:pb-36 sm:pt-14 md:pb-14 lg:px-8">
        <section id="market-list" className="scroll-mt-24">
          <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Pickup markets
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Choose the market that fits your week.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-stone-600">
              Every card shows the address, market window, preorder guidance, pickup expectations, and directions before you commit.
            </p>
          </div>

          {marketsLoading ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {[1, 2].map(i => <MarketCardSkeleton key={i} />)}
            </div>
          ) : marketsError ? (
            <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 text-center">
              <HelpCircle className="mx-auto mb-3 h-8 w-8 text-amber-600" aria-hidden="true" />
              <p className="font-semibold text-amber-950">{marketsError}</p>
              <p className="mt-1 text-sm text-amber-800">You can still browse the live catalog or start a preorder while we refresh market details.</p>
              <Button asChild className="mt-5 rounded-full bg-emerald-700 text-white hover:bg-emerald-800">
                <Link href="/catalog">Browse Catalog</Link>
              </Button>
            </div>
          ) : markets.length === 0 ? (
            <div className="rounded-[1.75rem] border border-stone-200 bg-white p-6 text-center">
              <Store className="mx-auto mb-3 h-8 w-8 text-stone-400" aria-hidden="true" />
              <p className="font-semibold text-stone-950">No markets listed yet.</p>
              <p className="mt-1 text-sm text-stone-600">We're setting up the next market schedule. Browse the catalog in the meantime.</p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {markets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-12 grid gap-4 rounded-[2rem] border border-emerald-900/10 bg-white p-5 shadow-sm sm:p-6 lg:grid-cols-3 lg:p-8">
          {EXPERIENCE_STEPS.map((step, index) => (
            <div key={step.title} className="rounded-3xl bg-[#f6f2e8] p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                {index + 1}
              </div>
              <h3 className="text-lg font-semibold text-stone-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-700">{step.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-[2rem] border border-emerald-900/10 bg-emerald-950 p-5 text-white shadow-xl shadow-emerald-950/10 sm:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-100">
                <SunMedium className="h-4 w-4" aria-hidden="true" />
                Fresh this week
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Market favorites without the oversized scroll.</h2>
              <p className="mt-3 text-emerald-50/90">
                A compact preview of what customers often reserve for pickup. Browse the full catalog when you are ready.
              </p>
              <Button asChild className="mt-5 h-12 rounded-full bg-white text-emerald-950 hover:bg-emerald-50">
                <Link href="/catalog">
                  Browse Full Catalog
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {loading ? (
              <div className="flex snap-x gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {[1, 2, 3].map(item => (
                  <div key={item} className="h-28 min-w-[210px] animate-pulse snap-start rounded-2xl bg-white/15" />
                ))}
              </div>
            ) : featuredProducts.length > 0 ? (
              <div className="flex snap-x gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0">
                {featuredProducts.map((product) => (
                  <ProductPreviewCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 text-emerald-50">
                Fresh products are syncing now. You can still start from the catalog or choose a pickup market.
              </div>
            )}
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              Market FAQ
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">Clear before you order.</h2>
            <p className="mt-3 text-base leading-7 text-stone-600">
              The market flow should feel simple: know what to buy, where to go, when to arrive, and what happens after checkout.
            </p>
          </div>
          <Accordion type="single" collapsible className="rounded-[1.75rem] border border-stone-200 bg-white px-5 shadow-sm">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem key={item.question} value={`faq-${index}`} className="border-stone-200 last:border-0">
                <AccordionTrigger className="py-5 text-left text-base font-semibold text-stone-950 hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-base leading-7 text-stone-600">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mt-12 rounded-[2rem] bg-gradient-to-br from-emerald-700 to-emerald-950 p-6 text-white shadow-xl shadow-emerald-950/15 sm:p-8 lg:p-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Ready to reserve your weekly batch?</h2>
              <p className="mt-3 max-w-2xl text-emerald-50/90">
                Start with the live catalog, choose pickup or shipping at checkout, and get clear next steps after payment.
              </p>
            </div>
            <div className="grid gap-3 sm:flex">
              <Button asChild className="h-12 rounded-full bg-white px-6 text-emerald-950 hover:bg-emerald-50">
                <Link href="/preorder">Shop This Week</Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white">
                <Link href="/weekly-menu">View Weekly Menu</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-900/10 bg-white/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-2xl backdrop-blur md:hidden" aria-label="Market quick actions">
        <div className="grid grid-cols-2 gap-3">
          <Button asChild className="h-12 rounded-full bg-emerald-700 text-white hover:bg-emerald-800">
            <Link href="/preorder">Shop This Week</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-full border-emerald-200 text-emerald-900 hover:bg-emerald-50">
            <a href="#market-list">Find Market</a>
          </Button>
        </div>
      </nav>
    </div>
  );
}
