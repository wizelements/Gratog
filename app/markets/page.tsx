'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  MapPin, 
  Calendar, 

  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Day-of-week labels
const DAY_LABELS: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

// Convert "HH:MM-HH:MM" to display format like "9:00 AM - 1:00 PM"
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
interface PublicMarket {
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
}

// Product type
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

// Categories with emojis
const CATEGORIES = [
  { id: 'sea-moss', name: 'Sea Moss Gel', emoji: '🌿' },

  { id: 'lemonades', name: 'Fresh Lemonades', emoji: '🍋' },
  { id: 'juices', name: 'Cold Pressed Juices', emoji: '🧃' },
  { id: 'refreshers', name: 'Wellness Refreshers', emoji: '🍹' },
  { id: 'shots', name: 'Wellness Shots', emoji: '🥃' },
];

// Horizontal scroll category section - REUSED from preorder
function CategorySection({ 
  title, 
  emoji, 
  products, 
  onSelectProduct,
}: { 
  title: string; 
  emoji: string;
  products: ProductItem[];
  onSelectProduct: (product: ProductItem) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (products.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4 px-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          {title}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors border border-gray-200"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors border border-gray-200"
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
        {products.map((item) => (
          <div 
            key={item.id}
            onClick={() => onSelectProduct(item)}
            className="flex-shrink-0 w-[260px] snap-start bg-white rounded-2xl border border-gray-100 overflow-hidden transition-shadow hover:shadow-md cursor-pointer group"
          >
            {/* Product Image */}
            <div className="relative h-36 bg-gray-100 flex items-center justify-center overflow-hidden">
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl">{item.emoji}</span>
              )}
            </div>

            {/* Product Info */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                {item.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2 h-10">
                {item.description || 'Premium wellness product'}
              </p>
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-lg font-bold text-emerald-600">${item.price.toFixed(2)}</span>
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  Preorder <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Market card component
function MarketCard({ market, onSelect }: { market: PublicMarket; onSelect: (id: string) => void }) {
  const [countdown, setCountdown] = useState('');
  const dayName = DAY_LABELS[market.dayOfWeek] || 'Saturday';
  const displayHours = formatHoursRange(market.hours);
  const emoji = market.featured ? '🏡' : '🏪';
  const fullAddress = market.addressLine || `${market.address}, ${market.city}, ${market.state} ${market.zip}`;
  
  useEffect(() => {
    const updateCountdown = () => {
      const today = new Date();
      const todayDay = today.getDay();
      let daysUntil = market.dayOfWeek - todayDay;
      if (daysUntil <= 0) daysUntil += 7;
      
      if (daysUntil === 7) setCountdown('Today!');
      else if (daysUntil === 1) setCountdown('Tomorrow');
      else setCountdown(`${daysUntil} days`);
    };
    
    updateCountdown();
  }, [market.dayOfWeek]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-shadow hover:shadow-md">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{market.name}</h3>
              <span className="text-xs font-medium text-emerald-700">
                {countdown}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Calendar className="w-4 h-4" />
              <span>{dayName}s {displayHours}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{fullAddress}</span>
            </div>
            
            <p className="mt-3 text-sm text-gray-600">{market.description}</p>
          </div>
        </div>
      </div>
      
      <div className="px-5 pb-5">
        <Button
          onClick={() => onSelect(market.id)}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          Preorder for Pickup
        </Button>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<PublicMarket[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [marketsError, setMarketsError] = useState('');

  // Fetch products from Square
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/storefront/catalog', {
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Failed to fetch products');
        
        const data = await response.json();
        
        // Transform Square products
        const transformedProducts = (data.products || [])
          .filter((p: any) => p.available !== false && (p.inStock !== false || p.isPreorder === true || p.purchaseStatus === 'preorder'))
          .map((p: any) => {
            const name = (p.name || '').toLowerCase();
            let category = p.category || 'specials';
            let emoji = p.emoji || '🛍️';
            if (name.includes('lemonade')) {
              category = 'lemonades';
              emoji = '🍋';
            } else if (name.includes('juice')) {
              category = 'juices';
              emoji = '🧃';
            } else if (name.includes('moss') || name.includes('gel')) {
              category = 'sea-moss';
              emoji = '🌿';
            } else if (name.includes('refresher')) {
              category = 'refreshers';
              emoji = '🍹';
            } else if (name.includes('shot')) {
              category = 'shots';
              emoji = '🥃';
            }
            
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
        // Fallback products
        setProducts([
          { id: '1', name: 'Golden Glow Sea Moss Gel', category: 'sea-moss', emoji: '🌿', price: 25.00, isPopular: true, description: 'Our signature wildcrafted sea moss gel' },

          { id: '3', name: 'Fresh Sea Moss Lemonade', category: 'lemonades', emoji: '🍋', price: 5.99, description: 'Refreshing blend with wildcrafted sea moss' },
          { id: '4', name: 'Immunity Shot', category: 'shots', emoji: '🥃', price: 4.99, isNew: true, description: 'Ginger, turmeric, and sea moss power' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

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

  const handleSelectMarket = (marketId: string) => {
    router.push(`/preorder?market=${marketId}`);
  };

  const handleSelectProduct = (product: ProductItem) => {
    // Route to preorder with product hint and category
    toast.success(`${product.name} — choose your market!`);
    router.push(`/preorder?category=${product.category}`);
  };

  // Group products by category
  const getProductsByCategory = (categoryId: string) => {
    return products.filter(p => p.category === categoryId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="bg-emerald-700 text-white px-4 py-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-100">
            Come Find Us This Weekend
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Find Us at Local Markets
          </h1>
          <p className="text-xl text-emerald-100 max-w-2xl mx-auto">
            Come taste at the market, then preorder when you want your wellness routine guaranteed.
            Market pickup is best for weekly orders, gifts, and made-fresh batches.
          </p>
          
          {/* Quick Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/preorder">
              <Button
                size="lg"
                className="h-14 px-8 bg-white text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl shadow-md"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Start Preorder
              </Button>
            </Link>
            <Link href="/catalog" className="inline-flex items-center justify-center text-emerald-100 underline-offset-4 hover:underline">
              Browse full catalog
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Info Banner */}
        <div className="mb-10 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Samples at the booth. Preorders for intentional wellness.</h3>
              <div className="grid sm:grid-cols-2 gap-4 mt-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🥄</span>
                  <div className="text-sm text-amber-800">
                    <span className="font-medium">Try samples first</span>
                    <p className="text-amber-700/80">New to Taste of Gratitude? Visit the booth and sample what is available that day.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🛒</span>
                  <div className="text-sm text-amber-800">
                    <span className="font-medium">Preorder to reserve</span>
                    <p className="text-amber-700/80">Best for customers stocking up for the week. Preorders have a $60 minimum.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Categories - Horizontal Scroll */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6 px-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-600" />
              Browse by Category
            </h2>
            <Link href="/catalog" className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="px-4">
              <div className="flex gap-4 overflow-x-auto">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex-shrink-0 w-[260px] h-[280px] bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <>
              {CATEGORIES.map(cat => {
                const catProducts = getProductsByCategory(cat.id);
                if (catProducts.length === 0) return null;
                return (
                  <CategorySection
                    key={cat.id}
                    title={cat.name}
                    emoji={cat.emoji}
                    products={catProducts}
                    onSelectProduct={handleSelectProduct}
                  />
                );
              })}
            </>
          )}
        </section>

        {/* Markets Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 px-4 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-600" />
            Choose Your Market
          </h2>
          
          {marketsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="p-5 space-y-3">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-100 rounded animate-pulse w-3/4" />
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : marketsError ? (
            <div className="px-4">
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-amber-800 font-medium">{marketsError}</p>
                <p className="text-sm text-amber-700 mt-1">Check back soon or browse our catalog.</p>
              </div>
            </div>
          ) : markets.length === 0 ? (
            <div className="px-4">
              <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl text-center">
                <Store className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">No markets listed yet.</p>
                <p className="text-sm text-gray-500 mt-1">We're setting up — check back soon!</p>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
              {markets.map((market) => (
                <MarketCard 
                  key={market.id} 
                  market={market} 
                  onSelect={handleSelectMarket}
                />
              ))}
            </div>
          )}
        </section>

        {/* Bottom CTA */}
        <section className="mt-16 text-center">
          <div className="bg-emerald-700 rounded-3xl p-8 md:p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">Want Home Delivery?</h2>
            <p className="text-emerald-100 mb-6 max-w-xl mx-auto">
              Add your items to cart and enter your address at checkout. We'll quote delivery by mileage before you pay.
            </p>
            <Link href="/catalog">
              <Button
                size="lg"
                className="h-14 px-10 bg-white text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl shadow-md"
              >
                <Store className="w-5 h-5 mr-2" />
                Browse Full Catalog
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </div>

    </div>
  );
}
