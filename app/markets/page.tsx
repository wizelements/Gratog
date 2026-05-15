'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Plus,
  Minus,
  Star,
  Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Market configurations
const MARKETS = [
  {
    id: 'serenbe',
    name: 'Serenbe Farmers Market',
    address: '10640 Serenbe Trail, Chattahoochee Hills, GA 30268',
    day: 'Saturday',
    hours: '9:00 AM - 1:00 PM',
    emoji: '🏡',
    description: 'Our flagship market with the full menu including exclusive Boba Tea!',
    featured: ['Boba Tea', 'Sea Moss Gel', 'Wellness Shots'],
  },
  {
    id: 'dunwoody',
    name: 'Dunwoody Farmers Market',
    address: 'Dunwoody Farmhouse, Dunwoody, GA 30338',
    day: 'Saturday',
    hours: '9:00 AM - 12:00 PM',
    emoji: '🏪',
    description: 'All your favorites in a charming historic setting.',
    featured: ['Sea Moss Gel', 'Fresh Lemonade', 'Wellness Shots'],
  },
  {
    id: 'sandy-springs',
    name: 'Sandy Springs Farmers Market',
    address: 'Sandy Springs City Center, Sandy Springs, GA 30328',
    day: 'Sunday',
    hours: '10:00 AM - 1:00 PM',
    emoji: '🌳',
    description: 'Sunday wellness in the heart of Sandy Springs.',
    featured: ['Sea Moss Gel', 'Fresh Juices', 'Wellness Shots'],
  },
];

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
  isBoba?: boolean;
}

// Categories with emojis
const CATEGORIES = [
  { id: 'sea-moss', name: 'Sea Moss Gel', emoji: '🌿' },
  { id: 'boba', name: 'Boba Tea', emoji: '🧋' },
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
            className="flex-shrink-0 w-[260px] snap-start bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
          >
            {/* Product Image */}
            <div className="relative h-36 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center overflow-hidden">
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <span className="text-5xl">{item.emoji}</span>
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
              {item.isBoba && (
                <div className="absolute bottom-2 left-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  🧋 Serenbe Exclusive
                </div>
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
function MarketCard({ market, onSelect }: { market: typeof MARKETS[0]; onSelect: (id: string) => void }) {
  const [countdown, setCountdown] = useState('');
  
  useEffect(() => {
    const updateCountdown = () => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const targetDay = days.indexOf(market.day);
      const today = new Date();
      const todayDay = today.getDay();
      let daysUntil = targetDay - todayDay;
      if (daysUntil <= 0) daysUntil += 7;
      
      if (daysUntil === 0) setCountdown('Today!');
      else if (daysUntil === 1) setCountdown('Tomorrow');
      else setCountdown(`${daysUntil} days`);
    };
    
    updateCountdown();
  }, [market.day]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{market.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{market.name}</h3>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                {countdown}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Calendar className="w-4 h-4" />
              <span>{market.day}s {market.hours}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{market.address}</span>
            </div>
            
            <p className="mt-3 text-sm text-gray-600">{market.description}</p>
            
            {/* Featured items */}
            <div className="mt-3 flex flex-wrap gap-2">
              {market.featured.map((item) => (
                <span key={item} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                  <Sparkles className="w-3 h-3" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-5 pb-5">
        <Button
          onClick={() => onSelect(market.id)}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          Preorder from {market.name.split(' ')[0]}
        </Button>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

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
          .filter((p: any) => p.available !== false && p.inStock !== false)
          .map((p: any) => {
            const name = (p.name || '').toLowerCase();
            let category = p.category || 'specials';
            let emoji = p.emoji || '🛍️';
            let isBoba = false;
            
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
            } else if (name.includes('boba') || name.includes('bubble')) {
              category = 'boba';
              emoji = '🧋';
              isBoba = true;
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
              isBoba,
            };
          });
        
        setProducts(transformedProducts);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        // Fallback products
        setProducts([
          { id: '1', name: 'Golden Glow Sea Moss Gel', category: 'sea-moss', emoji: '🌿', price: 25.00, isPopular: true, description: '92 essential minerals in every scoop' },
          { id: '2', name: 'Original Boba Tea', category: 'boba', emoji: '🧋', price: 6.99, isBoba: true, description: 'Serenbe exclusive! Brown sugar boba' },
          { id: '3', name: 'Fresh Sea Moss Lemonade', category: 'lemonades', emoji: '🍋', price: 5.99, description: 'Refreshing blend with wildcrafted sea moss' },
          { id: '4', name: 'Immunity Shot', category: 'shots', emoji: '🥃', price: 4.99, isNew: true, description: 'Ginger, turmeric, and sea moss power' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Header */}
      <header className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white px-4 py-12">
        <div className="max-w-6xl mx-auto text-center">
          <Badge className="mb-4 bg-white/20 backdrop-blur-sm text-white border-white/30 px-4 py-1">
            <Sparkles className="w-4 h-4 mr-1" />
            Skip the Line — Preorder Now
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Find Us at Local Markets
          </h1>
          <p className="text-xl text-emerald-100 max-w-2xl mx-auto">
            Browse our wellness collection and preorder for pickup at any of our 
            three Atlanta-area farmers markets.
          </p>
          
          {/* Quick Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/catalog">
              <Button
                size="lg"
                className="h-14 px-8 bg-white text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl"
              >
                <Store className="w-5 h-5 mr-2" />
                Browse Full Catalog
              </Button>
            </Link>
            <Link href="/preorder">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 border-2 border-white text-white hover:bg-white/10 font-bold rounded-xl"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Start Preorder
              </Button>
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
              <h3 className="font-semibold text-amber-900 mb-1">How Preordering Works</h3>
              <div className="grid sm:grid-cols-3 gap-4 mt-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🛒</span>
                  <div className="text-sm text-amber-800">
                    <span className="font-medium">1. Browse & Select</span>
                    <p className="text-amber-700/80">Choose your market and products</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🎫</span>
                  <div className="text-sm text-amber-800">
                    <span className="font-medium">2. Get Waitlist #</span>
                    <p className="text-amber-700/80">Receive your place in line</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">💳</span>
                  <div className="text-sm text-amber-800">
                    <span className="font-medium">3. Pay at Pickup</span>
                    <p className="text-amber-700/80">Cash or card when you arrive</p>
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
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
            {MARKETS.map((market) => (
              <MarketCard 
                key={market.id} 
                market={market} 
                onSelect={handleSelectMarket}
              />
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mt-16 text-center">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-8 md:p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">Can't Make It to the Market?</h2>
            <p className="text-emerald-100 mb-6 max-w-xl mx-auto">
              Browse our full catalog and see everything we offer — from sea moss gel 
              to wellness shots and exclusive boba tea.
            </p>
            <Link href="/catalog">
              <Button
                size="lg"
                className="h-14 px-10 bg-white text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl"
              >
                <Store className="w-5 h-5 mr-2" />
                Browse Full Catalog
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </div>

      {/* Mobile Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg md:hidden z-50">
        <div className="flex gap-3">
          <Link href="/catalog" className="flex-1">
            <Button
              variant="outline"
              className="w-full h-14 border-emerald-600 text-emerald-700 font-semibold"
            >
              <Store className="w-5 h-5 mr-2" />
              Catalog
            </Button>
          </Link>
          <Link href="/preorder" className="flex-1">
            <Button
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              Preorder
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile padding for sticky footer */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
