'use client';


import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ShoppingCart, 
  User, 
  Phone, 
  Mail,
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Loader2,
  Info,
  Plus,
  Minus,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import Link from "next/link";
import RetentionForm from "@/components/RetentionForm";
import BundleSuggestions from "@/components/preorder/BundleSuggestions";
import { getDeliveryZoneByZip, calculateDynamicDeliveryFee } from "@/lib/delivery-zones";
import { track } from "@/utils/analytics";

// Day-of-week labels
const DAY_LABELS: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

// Convert "HH:MM-HH:MM" to display format
function formatHoursRange(hours: string): string {
  if (!hours || !hours.includes('-')) return hours || '';
  const [start, end] = hours.split('-').map(t => t.trim());
  const fmt = (t: string) => {
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  };
  return `${fmt(start)} - ${fmt(end)}`;
}

// Market shape from /api/markets
interface MarketData {
  id: string;
  name: string;
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
  // Derived display fields (computed after fetch)
  day?: string;
  displayHours?: string;
  emoji?: string;
  fullAddress?: string;
}

// Product type from Square
interface PreorderItem {
  id: string;
  slug?: string;
  variationId?: string;
  catalogObjectId?: string;
  name: string;
  size: string;
  price: number;
  priceCents: number;
  category: string;
  emoji: string;
  available: number;
  image?: string;
  description?: string;
  isPopular?: boolean;
  isNew?: boolean;
  isPreorder?: boolean;
}

const PREORDER_MINIMUM = 60;

function normalizeCategoryText(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPreorderCategory(product: any): string {
  const raw = normalizeCategoryText(
    product?.category ||
    product?.categoryId ||
    product?.categoryLabel ||
    product?.displayCategory ||
    product?.intelligentCategory ||
    product?.categoryData?.name
  );
  const name = normalizeCategoryText(product?.name);
  const haystack = `${raw} ${name}`.trim();

  if (haystack.includes('shot')) return 'shots';
  if (haystack.includes('refresher')) return 'refreshers';
  if (haystack.includes('gel') || haystack.includes('moss') || raw === 'gels') return 'gels';
  if (haystack.includes('lemonade') || haystack.includes('juice') || haystack.includes('drink') || raw === 'lemonades') return 'lemonades';

  return raw || 'specials';
}

function getPreorderCategoryEmoji(category: string, fallback = '🛍️') {
  if (category === 'gels') return '🌿';
  if (category === 'lemonades') return '🍋';
  if (category === 'refreshers') return '🍹';
  if (category === 'shots') return '🥃';
  return fallback;
}

// Horizontal scroll category section
function PreorderLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center px-4">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading preorder options...</p>
      </div>
    </div>
  );
}

function CategorySection({ 
  title, 
  emoji, 
  products, 
  cart, 
  onUpdateCart 
}: { 
  title: string; 
  emoji: string;
  products: PreorderItem[];
  cart: Record<string, number>;
  onUpdateCart: (id: string, delta: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (products.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          {title}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((item) => {
          const qty = cart[item.id] || 0;
          return (
            <div 
              key={item.id}
              className="flex-shrink-0 w-[280px] snap-start bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Product Image */}
              <div className="relative h-40 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-6xl">{item.emoji}</span>
                )}
                {item.isPopular && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-medium">
                    <Star className="w-3 h-3 fill-current" />
                    Popular
                  </div>
                )}
                {item.isNew && (
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    New
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-1">{item.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2 h-10">{item.description || item.size}</p>
                
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <span className="text-xl font-bold text-emerald-600">${item.price.toFixed(2)}</span>
                    {item.size && item.size !== 'Regular' && (
                      <span className="text-xs text-gray-400 ml-1">{item.size}</span>
                    )}
                  </div>
                  
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    {qty > 0 ? (
                      <>
                        <button
                          onClick={() => onUpdateCart(item.id, -1)}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-semibold">{qty}</span>
                      </>
                    ) : null}
                    <button
                      onClick={() => onUpdateCart(item.id, 1)}
                      className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PreorderPage() {
  return (
    <Suspense fallback={<PreorderLoadingFallback />}>
      <PreorderPageContent />
    </Suspense>
  );
}

function PreorderPageContent() {
  const searchParams = useSearchParams();
  const marketId = searchParams.get("market");
  const utmSource = searchParams.get("utm_source") || searchParams.get("source") || "direct";
  const utmCampaign = searchParams.get("utm_campaign") || "weekly_menu_drop";
  const sourceCategory = searchParams.get("category") || null;
  const sourceProduct = searchParams.get("product") || null;
  
  const [step, setStep] = useState<"market" | "items" | "checkout">("market");
  const [selectedMarket, setSelectedMarket] = useState<MarketData | null>(null);
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [products, setProducts] = useState<PreorderItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [fulfillment, setFulfillment] = useState<{ type: 'pickup' | 'delivery'; address?: { zip?: string; line1?: string; city?: string; state?: string }; deliveryFee?: number; deliveryZone?: any }>({ type: 'pickup' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitlistNumber, setWaitlistNumber] = useState("");
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const preorderStartedTrackedRef = useRef(false);

  useEffect(() => {
    if (preorderStartedTrackedRef.current) return;
    preorderStartedTrackedRef.current = true;
    track('preorder_started', {
      marketId: marketId || null,
      utmSource,
      utmCampaign,
      category: sourceCategory,
      product: sourceProduct,
    });
  }, [marketId, utmSource, utmCampaign, sourceCategory, sourceProduct]);

  // Fetch markets from API
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('/api/markets', {
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to fetch markets');
        const data = await response.json();
        if (data.success && Array.isArray(data.markets)) {
          const enriched: MarketData[] = data.markets.map((m: any) => ({
            ...m,
            day: DAY_LABELS[m.dayOfWeek] || 'Saturday',
            displayHours: formatHoursRange(m.hours),
            emoji: m.featured ? '🏡' : '🏪',
            fullAddress: m.addressLine || `${m.address}, ${m.city}, ${m.state} ${m.zip}`,
          }));
          setMarkets(enriched);
        }
      } catch (error) {
        console.error('Failed to fetch markets:', error);
        toast.error('Could not load markets.');
      } finally {
        setMarketsLoading(false);
      }
    };
    fetchMarkets();
  }, []);

  // Fetch real products from Square
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await fetch('/api/storefront/catalog', {
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        
        // Transform Square products to preorder format
        const transformedProducts = (data.products || [])
          .filter((p: any) => p.available !== false && (p.inStock !== false || p.isPreorder === true || p.purchaseStatus === 'preorder'))
          .map((p: any) => {
            const defaultVariation = Array.isArray(p.variations) ? p.variations[0] : null;
            const name = (p.name || '').toLowerCase();
            const category = getPreorderCategory(p);
            const emoji = getPreorderCategoryEmoji(category, p.emoji || '🛍️');
            
            return {
              id: p.id,
              slug: p.slug,
              variationId: p.variationId || defaultVariation?.id,
              catalogObjectId: p.catalogObjectId || p.variationId || defaultVariation?.id,
              name: p.name,
              size: defaultVariation?.name || p.size || 'Regular',
              price: defaultVariation?.price || p.price || (p.priceCents || 0) / 100,
              priceCents: defaultVariation?.priceCents || p.priceCents || Math.round((p.price || 0) * 100),
              category,
              emoji,
              available: p.stockQuantity || 99,
              image: p.image,
              description: p.description,
              isPopular: p.isPopular || name.includes('original'),
              isNew: p.isNew || false,
              isPreorder: p.isPreorder === true || p.purchaseStatus === 'preorder' || p.inStock === false
            };
          });
        
        setProducts(transformedProducts);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        toast.error('Could not load products. Please try again.');
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    
    fetchProducts();
  }, []);

  // Initialize market from URL once markets are loaded
  useEffect(() => {
    if (marketId && markets.length > 0 && !selectedMarket) {
      const market = markets.find(m => m.id === marketId);
      if (market) {
        setSelectedMarket(market);
        setStep("items");
        track('preorder_market_selected', {
          marketId: market.id,
          source: 'query_param',
          utmSource,
          utmCampaign,
        });
      }
    }
  }, [marketId, markets, selectedMarket, utmSource, utmCampaign]);

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = products.find(p => p.id === id);
    return sum + (item?.price || 0) * qty;
  }, 0);

  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const cartCategoryCounts = Object.entries(cart).reduce((acc, [id, qty]) => {
    const item = products.find(p => p.id === id);
    if (item?.category) acc[item.category] = (acc[item.category] || 0) + qty;
    return acc;
  }, {} as Record<string, number>);

  const preorderSubtotal = cartTotal;
  const preorderMinimumMet = preorderSubtotal === 0 || preorderSubtotal >= PREORDER_MINIMUM;
  const preorderRulesMet = preorderMinimumMet;
  const preorderRemaining = Math.max(0, PREORDER_MINIMUM - preorderSubtotal);
  const preorderProgress = Math.min(100, Math.round((preorderSubtotal / PREORDER_MINIMUM) * 100));

  const deliveryMinCents = Number(process.env.PREORDER_DELIVERY_MIN_CENTS || 5000);
  const deliveryMinDollars = deliveryMinCents / 100;
  const deliveryAvailable = Math.round(cartTotal * 100) >= deliveryMinCents;

  const orderTotal = cartTotal + (fulfillment.type === 'delivery' ? (fulfillment.deliveryFee || 0) / 100 : 0);

  const updateCart = (id: string, delta: number) => {
    const item = products.find(p => p.id === id);
    setCart(prev => {
      const current = prev[id] || 0;
      const newQty = Math.max(0, current + delta);
      if (newQty === 0) {
        if (current > 0) {
          track('preorder_item_removed', {
            productId: id,
            productName: item?.name,
            category: item?.category,
            marketId: selectedMarket?.id || marketId,
          });
        }
        const { [id]: _, ...rest } = prev; // eslint-disable-line @typescript-eslint/no-unused-vars
        return rest;
      }
      if (newQty > current) {
        track('preorder_item_added', {
          productId: id,
          productName: item?.name,
          category: item?.category,
          price: item?.price,
          marketId: selectedMarket?.id || marketId,
          quantity: newQty,
        });
      } else if (newQty < current) {
        track('preorder_item_removed', {
          productId: id,
          productName: item?.name,
          category: item?.category,
          marketId: selectedMarket?.id || marketId,
          quantity: newQty,
        });
      }
      return { ...prev, [id]: newQty };
    });
  };

  const handleSubmitPreorder = async () => {
    if (!selectedMarket) return;

    if (!preorderRulesMet) {
      track('preorder_minimum_error', {
        marketId: selectedMarket.id,
        subtotal: preorderSubtotal,
        remaining: preorderRemaining,
        itemCount: cartItemCount,
      });
      toast.error(
        `Preorders require a $${PREORDER_MINIMUM.toFixed(2)} minimum. Add $${preorderRemaining.toFixed(2)} more.`
      );
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const orderItems = Object.entries(cart).map(([id, qty]) => {
        const product = products.find(p => p.id === id);
        return {
          id,
          productId: id,
          slug: product?.slug,
          variationId: product?.variationId,
          catalogObjectId: product?.catalogObjectId,
          name: product?.name || id,
          quantity: qty,
          price: product?.price || 0,
          size: product?.size,
          category: product?.category,
          imageUrl: product?.image,
          isPreorder: true
        };
      });

      const response = await fetch('/api/preorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: selectedMarket.id,
          customer,
          items: orderItems,
          total: cartTotal,
          fulfillment: fulfillment.type === 'delivery' ? {
            type: 'delivery',
            address: fulfillment.address,
            fee: fulfillment.deliveryFee || 0,
            zone: fulfillment.deliveryZone?.name || null,
          } : { type: 'pickup' },
          metadata: {
            source: 'preorder_page',
            utmSource,
            utmCampaign,
            landingMarketId: marketId || null,
            category: sourceCategory,
            product: sourceProduct,
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        const preorder = data.preorder || {};
        const nextWaitlistNumber = preorder.waitlistNumber || data.waitlistNumber || "";
        const nextPaymentUrl = data.payment?.url || "";

        setOrderNumber(preorder.orderNumber || data.orderNumber || "");
        setWaitlistNumber(nextWaitlistNumber);
        setWaitlistPosition(preorder.waitlistPosition || data.waitlistPosition || null);
        setPaymentUrl(nextPaymentUrl);
        setOrderComplete(true);
        track('preorder_submitted', {
          marketId: selectedMarket.id,
          total: cartTotal,
          itemCount: cartItemCount,
          orderNumber: preorder.orderNumber || data.orderNumber || "",
          waitlistNumber: nextWaitlistNumber,
          status: nextPaymentUrl ? 'pending_payment' : 'pending_confirmation',
          utmSource,
          utmCampaign,
        });
        if (nextPaymentUrl) {
          toast.success('Preorder reserved. Redirecting to secure payment...');
          window.location.assign(nextPaymentUrl);
        } else {
          toast.success(`Preorder placed! Your number is ${nextWaitlistNumber}`);
        }
      } else {
        track('preorder_failed', {
          marketId: selectedMarket.id,
          cartTotal,
          itemCount: cartItemCount,
          error: data.error || 'unknown',
        });
        toast.error(data.error || 'Failed to place preorder');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group products by category
  const productsByCategory = products.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PreorderItem[]>);

  const categoryOrder: { key: string; label: string; emoji: string }[] = [
    { key: 'gels', label: 'Sea Moss Gels', emoji: '🌿' },
    { key: 'lemonades', label: 'Lemonades', emoji: '🍋' },
    { key: 'refreshers', label: 'Refreshers', emoji: '🍹' },
    { key: 'shots', label: 'Wellness Shots', emoji: '🥃' },
    { key: 'specials', label: 'Specials', emoji: '✨' },
  ];

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
        <div className="max-w-md mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{paymentUrl ? 'Preorder Reserved' : 'Preorder Confirmed!'}</h1>
            <p className="text-gray-600 mt-2">
              {paymentUrl ? 'Complete secure payment to confirm your market pickup.' : 'Your order has been placed successfully.'}
            </p>
          </div>

          <Card className="border-emerald-100">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="text-sm text-gray-500 mb-1">Your Waitlist Number</div>
                <div className="text-5xl font-bold text-emerald-600">{waitlistNumber}</div>
                {waitlistPosition && (
                  <div className="text-sm text-gray-500 mt-2">Pickup position #{waitlistPosition}</div>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Order #</span>
                  <span className="font-medium">{orderNumber}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Market</span>
                  <span className="font-medium">{selectedMarket?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Total</span>
                  <span className="font-medium">${cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 rounded-xl">
                <p className="text-sm text-amber-800">
                  <strong>What's next?</strong><br />
                  {paymentUrl
                    ? 'Use the secure Square checkout link below. Your preorder is not confirmed until payment is completed.'
                    : "Arrive at the market and look for the Taste of Gratitude booth. Give us your name or waitlist number. You'll pay at pickup with cash or card."}
                </p>
              </div>

              <div className="mt-6 grid gap-3">
                {paymentUrl && (
                  <a href={paymentUrl}>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                      Complete Secure Payment
                    </Button>
                  </a>
                )}
                <Link href={`/preorder/status?order=${encodeURIComponent(orderNumber || waitlistNumber)}`}>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" variant={paymentUrl ? 'outline' : 'default'}>
                    Check Pickup Status
                  </Button>
                </Link>
                <Link href="/markets">
                  <Button variant="outline" className="w-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                    Back to Markets
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === "market") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="mb-6">
            <Link href="/markets" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Back to Markets
            </Link>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Select Market</h1>
            <p className="text-gray-600 mt-2">Samples are for discovery at the booth. Preorders reserve what you already know you want.</p>
          </div>

          <div className="space-y-4">
            {marketsLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="w-full p-5 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-gray-100 rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                </div>
              ))
            ) : markets.length === 0 ? (
              <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl text-center">
                <p className="text-gray-600 font-medium">No markets available right now.</p>
                <Link href="/catalog" className="text-emerald-600 hover:underline text-sm mt-2 inline-block">
                  Browse our catalog instead →
                </Link>
              </div>
            ) : (
              markets.map((market) => (
                <button
                  key={market.id}
                  onClick={() => {
                    setSelectedMarket(market);
                    setStep("items");
                    track('preorder_market_selected', {
                      marketId: market.id,
                      source: 'market_step',
                      utmSource,
                      utmCampaign,
                    });
                  }}
                  className="w-full p-5 bg-white rounded-2xl border-2 border-gray-100 hover:border-emerald-500 transition-all text-left shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{market.emoji}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{market.name}</h3>
                      <p className="text-sm text-gray-500">{market.day}s, {market.displayHours}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-6">
            <RetentionForm
              intent="weekly_menu_email"
              source="preorder_market_step"
              title="Not ready to preorder?"
              description="Get the next weekly menu email, pickup reminder, and preorder window before market day. If you are unsure which market is closest, tell us your area."
              cta="Email me the weekly menu"
              collectEmail
              collectPhone={false}
              collectMessage
              messagePlaceholder="Optional: what neighborhood or market is closest to you?"
              metadata={{ sourceCampaign: 'weekly_menu_drop', landingMarketId: marketId || null, utmSource, utmCampaign }}
              compact
            />
          </div>
        </div>
      </div>
    );
  }

  if (step === "items") {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <button 
              onClick={() => setStep("market")}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">{selectedMarket?.name}</h1>
              <p className="text-xs text-gray-500">{selectedMarket?.day}s, {selectedMarket?.displayHours}</p>
            </div>
            
            {cartItemCount > 0 && (
              <button 
                onClick={() => {
                  track('preorder_checkout_viewed', {
                    marketId: selectedMarket?.id || marketId,
                    cartTotal,
                    itemCount: cartItemCount,
                    categoryCounts: cartCategoryCounts,
                  });
                  setStep("checkout");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartItemCount} · ${cartTotal.toFixed(0)}
              </button>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="py-4">
          {selectedMarket && (
            <div className="mx-4 mb-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                {marketId ? 'Market preselected from your link' : 'Selected pickup market'}
              </p>
              <h2 className="mt-1 font-semibold text-gray-900">Reserve your batch for {selectedMarket.name}</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                ${PREORDER_MINIMUM} reservation minimum • pay at pickup • {selectedMarket.day}s, {selectedMarket.displayHours}
              </p>
              {cartItemCount > 0 && (
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs font-medium text-gray-600">
                    <span>${preorderSubtotal.toFixed(2)} reserved</span>
                    <span>{preorderMinimumMet ? 'Minimum met' : `$${preorderRemaining.toFixed(2)} to go`}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${preorderProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
          {loadingProducts ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
              <p className="text-gray-600">Loading fresh products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 px-4">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-gray-600">No products available. Please try again later.</p>
              <div className="mt-6 text-left max-w-md mx-auto">
                <RetentionForm
                  intent="weekly_menu_email"
                  source="preorder_empty_products"
                  title="Want the menu when it drops?"
                  description="Leave your email and we’ll send the next weekly menu and pickup reminder."
                  cta="Notify me"
                  collectEmail
                  collectPhone={false}
                  metadata={{ sourceCampaign: 'weekly_menu_drop', marketId: selectedMarket?.id || null, utmSource, utmCampaign }}
                  compact
                />
              </div>
            </div>
          ) : (
            <>
              <div className="mx-4 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <h2 className="font-semibold text-amber-900">Sample at the booth or reserve your favorites ahead.</h2>
                <p className="text-sm text-amber-800 mt-1">
                  If you want to try first, visit us at the market. If you already know what you want,
                  reserve ahead — the ${PREORDER_MINIMUM} reservation minimum helps us prep your batch fresh.
                </p>
              </div>

              {cartItemCount > 0 && (
                <BundleSuggestions
                  cartTotal={cartTotal}
                  cartCategoryCounts={cartCategoryCounts}
                  marketId={selectedMarket?.id || marketId}
                  context="items"
                />
              )}

              {categoryOrder.map(({ key, label, emoji }) => (
                <CategorySection
                  key={key}
                  title={label}
                  emoji={emoji}
                  products={productsByCategory[key] || []}
                  cart={cart}
                  onUpdateCart={updateCart}
                />
              ))}

              {/* Floating Cart Button */}
              {cartItemCount > 0 && (
                <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto">
                  <Button 
                    onClick={() => {
                  track('preorder_checkout_viewed', {
                    marketId: selectedMarket?.id || marketId,
                    cartTotal,
                    itemCount: cartItemCount,
                    categoryCounts: cartCategoryCounts,
                  });
                  setStep("checkout");
                }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg text-lg h-14 rounded-xl"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {preorderMinimumMet ? 'Checkout' : `Add $${preorderRemaining.toFixed(2)} to reserve`} · {cartItemCount} items
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Checkout step
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button 
            onClick={() => setStep("items")}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="font-semibold text-gray-900">Checkout</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-32">
        {/* Order Summary */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(cart).map(([id, qty]) => {
              const item = products.find(p => p.id === id);
              if (!item) return null;
              return (
                <div key={id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm">
                      {item.emoji}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">Qty: {qty}</p>
                    </div>
                  </div>
                  <span className="font-semibold">${(item.price * qty).toFixed(2)}</span>
                </div>
              );
            })}
            
            <div className="flex justify-between items-center pt-3 border-t-2 border-gray-100">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-emerald-600">${cartTotal.toFixed(2)}</span>
            </div>

            {cartItemCount > 0 && (
              <div className={`${preorderRulesMet ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} border rounded-xl p-3 text-sm`}>
                <p className={`font-medium ${preorderRulesMet ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {preorderRulesMet ? '✅ Preorder minimum met' : '⏳ Preorder minimum not met'}
                </p>
                <p className={`${preorderRulesMet ? 'text-emerald-700' : 'text-amber-700'} mt-1`}>
                  {preorderMinimumMet
                    ? `Preorder subtotal: $${preorderSubtotal.toFixed(2)}.`
                    : `$${PREORDER_MINIMUM.toFixed(2)} batch reservation minimum. Add $${preorderRemaining.toFixed(2)} more.`}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
                  <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${preorderProgress}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Market Info */}
        <Card className="mb-6 border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedMarket?.emoji}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedMarket?.name}</h3>
                <p className="text-sm text-gray-600">{selectedMarket?.day}s, {selectedMarket?.displayHours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fulfillment selection */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              Fulfillment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setFulfillment({ type: 'pickup' });
                  track('delivery_toggle', { type: 'pickup', marketId: selectedMarket?.id });
                }}
                className={`rounded-xl border p-3 text-left text-sm font-medium transition ${fulfillment.type === 'pickup' ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-gray-200 bg-white text-gray-700'}`}
              >
                Market pickup
              </button>
              <button
                type="button"
                onClick={() => {
                  setFulfillment((prev) => ({ ...prev, type: 'delivery' }));
                  track('delivery_toggle', { type: 'delivery', marketId: selectedMarket?.id });
                }}
                className={`rounded-xl border p-3 text-left text-sm font-medium transition ${fulfillment.type === 'delivery' ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-gray-200 bg-white text-gray-700'} ${!deliveryAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!deliveryAvailable}
              >
                Local delivery
                {!deliveryAvailable && (
                  <span className="block text-xs font-normal text-gray-500 mt-1">
                    Available on ${deliveryMinDollars.toFixed(2)}+ orders
                  </span>
                )}
              </button>
            </div>

            {fulfillment.type === 'delivery' && deliveryAvailable && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="delivery-zip" className="text-gray-700">Delivery ZIP code</Label>
                  <Input
                    id="delivery-zip"
                    value={fulfillment.address?.zip || ''}
                    onChange={(e) => {
                      const zip = e.target.value.replace(/\D/g, '').slice(0, 5);
                      const zone = getDeliveryZoneByZip(zip);
                      const quote = zip.length === 5
                        ? calculateDynamicDeliveryFee(zip, Math.round(cartTotal * 100))
                        : null;
                      setFulfillment({
                        type: 'delivery',
                        address: { ...fulfillment.address, zip },
                        deliveryZone: zone,
                        deliveryFee: quote ? quote.fee : undefined,
                      });
                      if (quote && zip.length === 5) {
                        track('delivery_quote', {
                          zip,
                          zone: zone?.name,
                          fee: quote.fee,
                          freeDelivery: quote.freeDelivery,
                        });
                      }
                    }}
                    placeholder="30310"
                    className="mt-2 h-12 rounded-xl"
                    maxLength={5}
                  />
                </div>
                {fulfillment.deliveryFee !== undefined && fulfillment.address?.zip?.length === 5 && (
                  <div className={`rounded-xl border p-3 text-sm ${fulfillment.deliveryFee === 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                    {fulfillment.deliveryFee === 0 ? (
                      <p>✅ Free delivery in {fulfillment.deliveryZone?.name}</p>
                    ) : (
                      <p>Delivery to {fulfillment.deliveryZone?.name}: ${(fulfillment.deliveryFee / 100).toFixed(2)}</p>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500">Local delivery available in metro Atlanta. Enter ZIP for a quote.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4" />
                Full Name *
              </Label>
              <Input
                id="name"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                placeholder="Your name"
                className="mt-2 h-12 rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4" />
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="mt-2 h-12 rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4" />
                Email (optional)
              </Label>
              <Input
                id="email"
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                placeholder="you@example.com"
                className="mt-2 h-12 rounded-xl"
              />
            </div>

            <div className="bg-amber-50 p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Pickup Details</p>
                  <p>{selectedMarket?.name}</p>
                  <p className="text-amber-700/80">{selectedMarket?.fullAddress || selectedMarket?.address}</p>
                  <p className="mt-2 font-medium text-emerald-700">
                    Your waitlist number is generated after you submit.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <div className="max-w-md mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={() => setStep("items")}
            className="flex-1 h-14 rounded-xl"
          >
            Back
          </Button>
          <Button
            onClick={handleSubmitPreorder}
            disabled={isSubmitting || cartItemCount === 0 || !customer.name || !customer.phone || !preorderRulesMet || (fulfillment.type === 'delivery' && (!deliveryAvailable || !fulfillment.address?.zip))}
            className="flex-1 h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Placing Order...
              </>
            ) : (
              `Place Preorder · $${orderTotal.toFixed(2)}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
