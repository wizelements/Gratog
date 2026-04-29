"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
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
  Loader2
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
    description: "Pre-order and skip the line!",
    emoji: "🏡",
  },
  {
    id: "dunwoody",
    name: "Dunwoody Farmers Market",
    address: "Dunwoody Farmhouse, Dunwoody, GA 30338",
    day: "Saturday",
    hours: "9:00 AM - 12:00 PM",
    description: "Pre-order and skip the line!",
    emoji: "🏪",
  },
];

// Sample preorder items - in production, fetch from API
const PREORDER_ITEMS = [
  { id: "basil-16oz", name: "Basil Sea Moss Gel", size: "16 oz", price: 25, category: "sea-moss", emoji: "🌿" },
  { id: "calmwater-6pk", name: "Calmwaters", size: "6-pack", price: 30, category: "drinks", emoji: "🥤" },
  { id: "pineapple-basil-16oz", name: "Pineapple Basil Sea Moss Gel", size: "16 oz", price: 28, category: "sea-moss", emoji: "🍍" },
  { id: "lemon-ginger-16oz", name: "Lemon Ginger Sea Moss Gel", size: "16 oz", price: 25, category: "sea-moss", emoji: "🍋" },
  { id: "gratitude-greens-6pk", name: "Gratitude Greens Juice", size: "6-pack", price: 35, category: "drinks", emoji: "🥬" },
  { id: "golden-milk-16oz", name: "Golden Milk Sea Moss Gel", size: "16 oz", price: 28, category: "sea-moss", emoji: "🥛" },
];

export default function PreorderPage() {
  const searchParams = useSearchParams();
  const initialMarket = searchParams.get("market");

  const [step, setStep] = useState(initialMarket ? "items" : "market");
  const [selectedMarket, setSelectedMarket] = useState(
    MARKETS.find((m) => m.id === initialMarket) || null
  );
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preorderComplete, setPreorderComplete] = useState(null);

  const addToCart = (item, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
    toast.success(`Added ${quantity}x ${item.name} to preorder`);
  };

  const updateQuantity = (itemId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleMarketSelect = (market) => {
    setSelectedMarket(market);
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
        body: JSON.stringify({
          marketId: selectedMarket.id,
          items: cart,
          customer,
        }),
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

  // Success screen
  if (step === "success" && preorderComplete) {
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
                <p className="text-sm text-emerald-800">
                  Show your waitlist number <strong>#{preorderComplete.waitlistNumber}</strong> at the
                  pickup booth. We&apos;ll text you when your order is ready!
                </p>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <header className="bg-emerald-600 text-white px-4 py-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold">Preorder & Skip the Line</h1>
          <p className="text-emerald-100 text-sm">
            Order ahead, get a waitlist number, pickup at the market
          </p>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Step indicator */}
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
              <span
                className={cn(
                  step === s.key ? "text-emerald-700 font-medium" : "text-gray-500"
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Market Selection */}
        {step === "market" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Select a Market:</h2>
            {MARKETS.map((market) => (
              <button
                key={market.id}
                onClick={() => handleMarketSelect(market)}
                className="w-full text-left p-4 bg-white rounded-lg border-2 border-transparent hover:border-emerald-500 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{market.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{market.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {market.day}s {market.hours}
                    </div>
                    <div className="text-sm text-emerald-600 mt-1">
                      {market.description}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Item Selection */}
        {step === "items" && selectedMarket && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Select Items:</h2>
              <Badge variant="outline">{selectedMarket.name}</Badge>
            </div>

            <div className="space-y-3">
              {PREORDER_ITEMS.map((item) => {
                const inCart = cart.find((i) => i.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-white rounded-lg border"
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.size} · ${item.price}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!inCart ? (
                        <Button size="sm" onClick={() => addToCart(item)}>
                          Add
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            −
                          </Button>
                          <span className="w-6 text-center font-medium">
                            {inCart.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => addToCart(item, 1)}
                          >
                            +
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep("market")}>
                Back
              </Button>
              <Button
                onClick={() => cartCount > 0 && setStep("details")}
                disabled={cartCount === 0}
                className="flex-1"
              >
                Continue ({cartCount} items · ${cartTotal.toFixed(2)})
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Customer Details */}
        {step === "details" && (
          <div className="space-y-6">
            <h2 className="font-semibold text-lg">Your Details:</h2>

            {/* Order Summary */}
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-emerald-800 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">{selectedMarket?.name}</span>
                </div>
                <div className="text-sm text-emerald-700">
                  {cartCount} items · ${cartTotal.toFixed(2)} minimum
                </div>
              </CardContent>
            </Card>

            {/* Customer Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">
                  <User className="w-4 h-4 inline mr-1" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer((c) => ({ ...c, name: e.target.value }))
                  }
                  placeholder="Your name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer((c) => ({ ...c, phone: e.target.value }))
                  }
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We&apos;ll text you when your order is ready
                </p>
              </div>

              <div>
                <Label htmlFor="email">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email (optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={customer.email}
                  onChange={(e) =>
                    setCustomer((c) => ({ ...c, email: e.target.value }))
                  }
                  placeholder="you@example.com"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Preorder Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Preorder Policy:</p>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>$15 minimum order</li>
                    <li>Pay at pickup (cash or card)</li>
                    <li>We&apos;ll text when ready</li>
                    <li>Show your waitlist number at pickup</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep("items")}>
                Back
              </Button>
              <Button
                onClick={handleSubmitPreorder}
                disabled={isSubmitting || !customer.name || !customer.phone}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>Submit Preorder</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
