'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

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

// Inventory limits per market
const MARKET_INVENTORY = {
  "lemonades-and-juices": 35,
  "sea-moss-gels": 999,
};

// Preorder items with category limits
const PREORDER_ITEMS = [
  { 
    id: "basil-16oz", 
    name: "Basil Sea Moss Gel", 
    size: "16 oz", 
    price: 25, 
    category: "sea-moss-gels",
    emoji: "🌿",
    available: 999
  },
  { 
    id: "pineapple-basil-16oz", 
    name: "Pineapple Basil Sea Moss Gel", 
    size: "16 oz", 
    price: 28, 
    category: "sea-moss-gels",
    emoji: "🍍",
    available: 999
  },
  { 
    id: "lemon-ginger-16oz", 
    name: "Lemon Ginger Sea Moss Gel", 
    size: "16 oz", 
    price: 25, 
    category: "sea-moss-gels",
    emoji: "🍋",
    available: 999
  },
  { 
    id: "golden-milk-16oz", 
    name: "Golden Milk Sea Moss Gel", 
    size: "16 oz", 
    price: 28, 
    category: "sea-moss-gels",
    emoji: "🥛",
    available: 999
  },
  { 
    id: "calmwater-6pk", 
    name: "Calmwaters", 
    size: "6-pack", 
    price: 30, 
    category: "lemonades-and-juices",
    emoji: "🥤",
    available: 35
  },
  { 
    id: "gratitude-greens-6pk", 
    name: "Gratitude Greens Juice", 
    size: "6-pack", 
    price: 35, 
    category: "lemonades-and-juices",
    emoji: "🥬",
    available: 35
  },
  { 
    id: "kissed-by-gods-16oz", 
    name: "Kissed by Gods Lemonade", 
    size: "16 oz", 
    price: 12, 
    category: "lemonades-and-juices",
    emoji: "🍹",
    available: 35
  },
  { 
    id: "pineapple-basil-lemonade-16oz", 
    name: "Pineapple Basil Lemonade", 
    size: "16 oz", 
    price: 12, 
    category: "lemonades-and-juices",
    emoji: "🍍",
    available: 35
  },
];

async function getWaitlistPosition(marketId: string): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Math.floor(Math.random() * 15) + 5);
    }, 500);
  });
}

function getLemonadeJuiceCount(cart: any[]): number {
  return cart
    .filter(item => item.category === "lemonades-and-juices")
    .reduce((sum, item) => sum + item.quantity, 0);
}

function SuccessScreen({ preorderComplete }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card className="border-2 border-emerald-500">
          <CardHeader className="bg-emerald-500 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl">Preorder Confirmed!</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Your waitlist number
              </p>
              <div className="text-5xl font-bold text-emerald-600">
                {preorderComplete.waitlistNumber}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 text-sm text-emerald-700">
                <Ticket className="w-4 h-4" />
                <span>You are #{preorderComplete.waitlistNumber} in line</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-medium">{preorderComplete.pickupLocation}</p>
                  <p className="text-sm text-muted-foreground">
                    {preorderComplete.pickupDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-medium">{preorderComplete.pickupHours}</p>
                  <p className="text-sm text-muted-foreground">
                    Est. ready: {preorderComplete.estimatedTime}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="bg-emerald-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-800">
                  <p className="font-medium">What to expect:</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>We will text you updates on your position</li>
                    <li>Come to the booth when your number is called</li>
                    <li>Show your waitlist number at pickup</li>
                    <li>Pay with cash or card when you arrive</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button asChild className="w-full">
              <Link href="/preorder/status">Check Order Status</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PreorderPage() {
  const searchParams = useSearchParams();
  const initialMarket = searchParams.get("market");

  const [step, setStep] = useState(initialMarket ? "items" : "market");
  const [selectedMarket, setSelectedMarket] = useState(MARKETS.find((m) => m.id === initialMarket) || null);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preorderComplete, setPreorderComplete] = useState(null);
  const [waitlistPosition, setWaitlistPosition] = useState(null);
  const [remainingInventory, setRemainingInventory] = useState({});

  useEffect(() => {
    const inventory = {};
    PREORDER_ITEMS.forEach(item => {
      inventory[item.id] = item.available;
    });
    setRemainingInventory(inventory);
  }, []);

  const addToCart = (item, quantity = 1) => {
    if (item.category === "lemonades-and-juices") {
      const currentLemonadeCount = getLemonadeJuiceCount(cart);
      const newTotal = currentLemonadeCount + quantity;
      
      if (newTotal > 35) {
        toast.error(`Only 35 lemonades/juices available per market. You have ${currentLemonadeCount} in cart.`);
        return;
      }
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, quantity }];
    });
    toast.success(`Added ${quantity}x ${item.name} to preorder`);
  };

  const updateQuantity = (itemId, delta) => {
    const item = PREORDER_ITEMS.find(i => i.id === itemId);
    
    if (item?.category === "lemonades-and-juices" && delta > 0) {
      const currentCount = getLemonadeJuiceCount(cart);
      if (currentCount >= 35) {
        toast.error("35 unit limit reached for lemonades/juices");
        return;
      }
    }

    setCart((prev) =>
      prev
        .map((item) => item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const lemonadeJuiceCount = getLemonadeJuiceCount(cart);

  const handleMarketSelect = async (market) => {
    setSelectedMarket(market);
    const position = await getWaitlistPosition(market.id);
    setWaitlistPosition(position);
    setStep("items");
  };

  const handleSubmitPreorder = async () => {
    if (!customer.name || !customer.phone) {
      toast.error("Please enter your name and phone number");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/preorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId: selectedMarket.id, items: cart, customer }),
      });

      const data = await response.json();

      if (data.success) {
        setPreorderComplete(data.preorder);
        setStep("success");
        toast.success("Preorder submitted successfully!");
      } else {
        toast.error(data.error || "Failed to submit preorder");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "success" && preorderComplete) {
    return <SuccessScreen preorderComplete={preorderComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="bg-emerald-600 text-white px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/markets" className="text-emerald-100 hover:text-white">
              &larr; Back to Markets
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Preorder &amp; Skip the Line</h1>
          <p className="text-emerald-100 text-sm">
            Order ahead, get a waitlist number, pickup at the market
          </p>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-2 text-sm">
          {[
            { key: "market", label: "Market" },
            { key: "items", label: "Items" },
            { key: "details", label: "Details" },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                  step === s.key
                    ? "bg-emerald-600 text-white"
                    : step === "success"
                    ? "bg-emerald-200 text-emerald-700"
                    : "bg-gray-200 text-gray-600"
                )}
              >
                {i + 1}
              </div>
              <span className={cn(step === s.key ? "text-emerald-600 font-medium" : "text-gray-500")}>
                {s.label}
              </span>
              {i < 2 && <ChevronRight className="w-4 h-4 text-gray-300" />}
            </div>
          ))}
        </div>

        {step === "market" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Select Market</h2>
            <div className="space-y-3">
              {MARKETS.map((market) => (
                <button
                  key={market.id}
                  onClick={() => handleMarketSelect(market)}
                  className="w-full text-left p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{market.emoji}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{market.name}</h3>
                      <p className="text-sm text-gray-500">{market.address}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {market.day}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {market.hours}
                        </span>
                      </div>
                      <Badge variant="secondary" className="mt-2 bg-emerald-100 text-emerald-700">
                        {market.description}
                      </Badge>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "items" && selectedMarket && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Select Items</h2>
              <button
                onClick={() => setStep("market")}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                Change Market
              </button>
            </div>

            <div className="bg-emerald-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-900">{selectedMarket.name}</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Lemonades/Juices Limit:</strong> {lemonadeJuiceCount}/35 units per market
              </p>
            </div>

            <div className="space-y-3">
              {PREORDER_ITEMS.map((item) => {
                const inCart = cart.find((i) => i.id === item.id);
                const cartQty = inCart?.quantity || 0;
                const isLimited = item.category === "lemonades-and-juices";
                const atLimit = isLimited && lemonadeJuiceCount >= 35;

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-100 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{item.emoji}</span>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.size}</p>
                        <p className="text-lg font-bold text-emerald-600">${item.price}</p>
                        {isLimited && (
                          <Badge variant="outline" className="mt-1 text-amber-600 border-amber-200">
                            35 unit limit
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {cartQty > 0 ? (
                          <>
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-medium">{cartQty}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              disabled={atLimit}
                              className="w-8 h-8 flex items-center justify-center bg-emerald-100 rounded-lg hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            disabled={atLimit}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {cartCount > 0 && (
              <div className="bg-gray-900 text-white p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount} items
                  </span>
                  <span className="text-xl font-bold">${cartTotal}</span>
                </div>
                <Button
                  onClick={() => setStep("details")}
                  className="w-full bg-white text-gray-900 hover:bg-gray-100"
                >
                  Continue to Details
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Your Details</h2>

            <div className="bg-gray-50 p-4 rounded-xl space-y-3">
              <h3 className="font-medium text-gray-900">Order Summary</h3>
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="font-medium">${item.price * item.quantity}</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between font-bold">
                <span>Total</span>
                <span>${cartTotal}</span>
              </div>
            </div>

            <div className="space-y-4">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
