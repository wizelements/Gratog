'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ShoppingCart, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
  Ticket,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Market configurations
const MARKETS = [
  {
    id: "serenbe",
    name: "Serenbe Farmers Market",
    address: "10640 Serenbe Trail, Chattahoochee Hills, GA 30268",
    day: "Saturday",
    hours: "9:00 AM - 1:00 PM",
    description: "Preorder and skip the line!",
    emoji: "🏡",
  },
  {
    id: "dunwoody",
    name: "Dunwoody Farmers Market",
    address: "Dunwoody Farmhouse, Dunwoody, GA 30338",
    day: "Saturday",
    hours: "9:00 AM - 12:00 PM",
    description: "Preorder and skip the line!",
    emoji: "🏪",
  },
  {
    id: "sandy-springs",
    name: "Sandy Springs Farmers Market",
    address: "Sandy Springs City Center, Sandy Springs, GA 30328",
    day: "Sunday",
    hours: "10:00 AM - 1:00 PM",
    description: "New location!",
    emoji: "🌳",
  },
];

// Product type from Square
interface PreorderItem {
  id: string;
  name: string;
  size: string;
  price: number;
  category: string;
  emoji: string;
  available: number;
  image?: string;
  description?: string;
}

export default function PreorderPage() {
  const searchParams = useSearchParams();
  const marketId = searchParams.get("market");
  
  const [step, setStep] = useState<"market" | "items" | "checkout">("market");
  const [selectedMarket, setSelectedMarket] = useState<typeof MARKETS[0] | null>(null);
  const [products, setProducts] = useState<PreorderItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

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
          .filter((p: any) => p.available !== false && p.inStock !== false)
          .map((p: any) => {
            // Determine category and emoji
            let category = 'other';
            let emoji = '🛍️';
            
            const cat = (p.category || '').toLowerCase();
            const name = (p.name || '').toLowerCase();
            
            if (cat.includes('lemonade') || name.includes('lemonade')) {
              category = 'lemonades-and-juices';
              emoji = '🍋';
            } else if (cat.includes('juice') || name.includes('juice')) {
              category = 'lemonades-and-juices';
              emoji = '🧃';
            } else if (cat.includes('moss') || name.includes('sea moss')) {
              category = 'sea-moss-gels';
              emoji = '🌿';
            } else if (cat.includes('refresher')) {
              category = 'refreshers';
              emoji = '🍹';
            } else if (cat.includes('boba') || name.includes('boba')) {
              category = 'boba';
              emoji = '🧋';
            } else if (name.includes('gel')) {
              category = 'sea-moss-gels';
              emoji = '🫙';
            }
            
            // Extract size from name or description
            let size = 'Regular';
            const sizeMatch = p.name?.match(/(\d+\s*(?:oz|ml|g|lb))/i);
            if (sizeMatch) {
              size = sizeMatch[1];
            }
            
            return {
              id: p.id,
              name: p.name,
              size: size,
              price: p.price || (p.priceCents || 0) / 100,
              category,
              emoji,
              available: p.stockQuantity || 99,
              image: p.image || p.images?.[0],
              description: p.description
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

  // Initialize market from URL
  useEffect(() => {
    if (marketId) {
      const market = MARKETS.find(m => m.id === marketId);
      if (market) {
        setSelectedMarket(market);
        setStep("items");
      }
    }
  }, [marketId]);

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = products.find(p => p.id === id);
    return sum + (item?.price || 0) * qty;
  }, 0);

  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const updateCart = (id: string, delta: number) => {
    setCart(prev => {
      const current = prev[id] || 0;
      const newQty = Math.max(0, current + delta);
      if (newQty === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: newQty };
    });
  };

  const handleSubmitPreorder = async () => {
    if (!selectedMarket) return;
    
    setIsSubmitting(true);
    
    try {
      const orderItems = Object.entries(cart).map(([id, qty]) => {
        const product = products.find(p => p.id === id);
        return {
          id,
          name: product?.name || id,
          quantity: qty,
          price: product?.price || 0
        };
      });

      const response = await fetch('/api/preorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: selectedMarket.id,
          customer,
          items: orderItems,
          total: cartTotal
        })
      });

      const data = await response.json();

      if (data.success) {
        setOrderNumber(data.orderNumber);
        setWaitlistPosition(data.waitlistPosition);
        setOrderComplete(true);
        toast.success(`Preorder placed! Your number is #${data.waitlistPosition}`);
      } else {
        toast.error(data.error || 'Failed to place preorder');
      }
    } catch (error) {
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

  const categoryOrder = ['sea-moss', 'lemonades', 'juices', 'refreshers', 'boba', 'shots', 'specials', 'other'];
  const categoryLabels: Record<string, string> = {
    'sea-moss': 'Sea Moss Gels',
    'lemonades': 'Lemonades',
    'juices': 'Fresh Juices',
    'refreshers': 'Refreshers',
    'boba': 'Boba Teas',
    'shots': 'Wellness Shots',
    'specials': 'Specials',
    'other': 'Other'
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Preorder Confirmed!</h1>
            <p className="text-gray-600 mt-2">Your order has been placed successfully.</p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="text-sm text-gray-500 mb-1">Your Waitlist Number</div>
                <div className="text-5xl font-bold text-emerald-600">#{waitlistPosition}</div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Order #</span>
                  <span className="font-medium">{orderNumber}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Market</span>
                  <span className="font-medium">{selectedMarket?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Total</span>
                  <span className="font-medium">${cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>What's next?</strong><br />
                  Arrive at the market and look for the Taste of Gratitude booth. 
                  Give us your name or waitlist number. You'll pay at pickup with cash or card.
                </p>
              </div>

              <Link href="/markets">
                <Button className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700">
                  Back to Markets
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === "market") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="mb-6">
            <Link href="/markets" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to Markets
            </Link>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Select Market</h1>
            <p className="text-gray-600 mt-2">Choose where you'll pick up your order</p>
          </div>

          <div className="space-y-4">
            {MARKETS.map((market) => (
              <button
                key={market.id}
                onClick={() => {
                  setSelectedMarket(market);
                  setStep("items");
                }}
                className="w-full p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-emerald-500 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{market.emoji}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{market.name}</h3>
                    <p className="text-sm text-gray-500">{market.day}s, {market.hours}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === "items") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => setStep("market")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <div className="flex-1">
              <h1 className="font-semibold text-gray-900">{selectedMarket?.name}</h1>
              <p className="text-xs text-gray-500">{selectedMarket?.day}s, {selectedMarket?.hours}</p>
            </div>
            {cartItemCount > 0 && (
              <button 
                onClick={() => setStep("checkout")}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartItemCount}
              </button>
            )}
          </div>

          {loadingProducts ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
              <p className="text-gray-600">Loading products from Square...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-gray-600">No products available. Please try again later.</p>
            </div>
          ) : (
            <>
              {/* Products */}
              <div className="space-y-6">
                {categoryOrder.map((category) => {
                  const items = productsByCategory[category];
                  if (!items?.length) return null;
                  
                  return (
                    <div key={category}>
                      <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        {items[0]?.emoji} {categoryLabels[category] || category}
                      </h2>
                      <div className="space-y-3">
                        {items.map((item) => {
                          const qty = cart[item.id] || 0;
                          return (
                            <div 
                              key={item.id}
                              className="p-4 bg-white rounded-xl border border-gray-200"
                            >
                              <div className="flex items-start gap-3">
                                {item.image && (
                                  <img 
                                    src={item.image} 
                                    alt={item.name}
                                    className="w-16 h-16 object-cover rounded-lg"
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                                      <p className="text-sm text-gray-500">{item.size}</p>
                                      {item.description && (
                                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                    <span className="font-semibold text-emerald-600">
                                      ${item.price.toFixed(2)}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between mt-3">
                                    <span className="text-xs text-gray-500">
                                      {item.available > 50 ? 'In Stock' : `${item.available} available`}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {qty > 0 && (
                                        <>
                                          <button
                                            onClick={() => updateCart(item.id, -1)}
                                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700"
                                          >
                                            -
                                          </button>
                                          <span className="w-8 text-center font-medium">{qty}</span>
                                        </>
                                      )}
                                      <button
                                        onClick={() => updateCart(item.id, 1)}
                                        disabled={qty >= item.available}
                                        className="w-8 h-8 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center text-emerald-700 disabled:opacity-50"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cart Summary */}
              {cartItemCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
                  <div className="max-w-md mx-auto">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-600">{cartItemCount} items</span>
                      <span className="text-xl font-bold text-gray-900">${cartTotal.toFixed(2)}</span>
                    </div>
                    <Button 
                      onClick={() => setStep("checkout")}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      Continue to Checkout
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
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
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-md mx-auto px-4 py-4">
        <button 
          onClick={() => setStep("items")}
          className="text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          ← Back to Items
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        {/* Order Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(cart).map(([id, qty]) => {
                const item = products.find(p => p.id === id);
                if (!item) return null;
                return (
                  <div key={id} className="flex justify-between text-sm">
                    <span>{qty}× {item.name}</span>
                    <span className="font-medium">${(item.price * qty).toFixed(2)}</span>
                  </div>
                );
              })}
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-emerald-600">${cartTotal.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Info */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedMarket?.emoji}</span>
              <div>
                <h3 className="font-medium">{selectedMarket?.name}</h3>
                <p className="text-sm text-gray-500">{selectedMarket?.day}s, {selectedMarket?.hours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name *
              </Label>
              <Input
                id="name"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                placeholder="Your name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email (optional)
              </Label>
              <Input
                id="email"
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                placeholder="you@example.com"
                className="mt-1"
              />
            </div>

            <div className="bg-emerald-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-800">
                  <p className="font-medium">Pickup Details:</p>
                  <p className="mt-1">
                    {selectedMarket?.name}<br />
                    {selectedMarket?.address}<br />
                    {selectedMarket?.day}, {selectedMarket?.hours}
                  </p>
                  <p className="mt-2 text-emerald-600">
                    Estimated waitlist position: #{waitlistPosition || "..."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("items")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmitPreorder}
                disabled={isSubmitting || !customer.name || !customer.phone}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Place Preorder"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
