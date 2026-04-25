'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Store, 
  Package, 
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Market configurations
const MARKETS = [
  { id: 'serenbe-farmers-market', name: 'Serenbe Farmers Market', day: 'Saturday', hours: '9AM-1PM' },
  { id: 'dunwoody-farmers-market', name: 'Dunwoody Farmers Market (DHA)', day: 'Saturday', hours: '8AM-12PM' },
  { id: 'sandy-springs-market', name: 'Sandy Springs Market', day: 'Saturday', hours: '8AM-12PM' },
];

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export default function MarketSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [specialNotes, setSpecialNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/market/today');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
        // Default quantity of 20 if not set
        if (!quantities[productId]) {
          setQuantities(q => ({ ...q, [productId]: 20 }));
        }
      }
      return next;
    });
  };

  const updateQuantity = (productId: string, qty: number) => {
    setQuantities(prev => ({ ...prev, [productId]: Math.max(0, qty) }));
  };

  const handleSubmit = async () => {
    if (!selectedMarket) {
      toast.error('Please select a market');
      return;
    }
    if (selectedProducts.size === 0) {
      toast.error('Please select at least one product');
      return;
    }

    setIsSubmitting(true);

    const market = MARKETS.find(m => m.id === selectedMarket);
    const items = Array.from(selectedProducts).map(productId => {
      const product = products.find(p => p.id === productId);
      return {
        productId,
        name: product?.name || 'Unknown',
        price: product?.price || 0,
        category: product?.category || 'General',
        quantity: quantities[productId] || 20,
      };
    });

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: selectedMarket,
          marketName: market?.name,
          action: 'setup',
          items,
        }),
      });

      if (response.ok) {
        toast.success('Market opened successfully!', {
          description: `${market?.name} is now live with ${items.length} products`,
        });
        router.push('/admin/market-day');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to open market');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Select Market
  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Which market are you opening today?</h2>
      <div className="grid gap-3">
        {MARKETS.map(market => (
          <button
            key={market.id}
            onClick={() => setSelectedMarket(market.id)}
            className={cn(
              "p-4 rounded-lg border-2 text-left transition-all",
              selectedMarket === market.id
                ? "border-emerald-500 bg-emerald-50"
                : "border-muted hover:border-emerald-200"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{market.name}</div>
                <div className="text-sm text-muted-foreground">
                  {market.day}s • {market.hours}
                </div>
              </div>
              {selectedMarket === market.id && (
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // Step 2: Select Products & Quantities
  const renderStep2 = () => {
    const categories = Array.from(new Set(products.map(p => p.category || 'General')));
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Select Products for Today</h2>
          <div className="text-sm text-muted-foreground">
            {selectedProducts.size} selected
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map(category => (
              <div key={category}>
                <h3 className="font-medium text-muted-foreground mb-3">{category}</h3>
                <div className="space-y-2">
                  {products
                    .filter(p => (p.category || 'General') === category)
                    .map(product => {
                      const isSelected = selectedProducts.has(product.id);
                      return (
                        <div
                          key={product.id}
                          className={cn(
                            "p-3 rounded-lg border transition-colors",
                            isSelected ? "bg-emerald-50 border-emerald-200" : "bg-card border-muted"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleProduct(product.id)}
                            />
                            <div className="flex-1">
                              <Label className="font-medium cursor-pointer">
                                {product.name}
                              </Label>
                              <div className="text-sm text-muted-foreground">
                                ${product.price.toFixed(2)}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <Label className="text-sm">Qty:</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={quantities[product.id] || 20}
                                  onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 0)}
                                  className="w-20"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t">
          <Label htmlFor="notes">Special Notes for Today (optional)</Label>
          <Input
            id="notes"
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            placeholder="e.g., Limited boba today, New flavor launch..."
          />
        </div>
      </div>
    );
  };

  // Step 3: Review
  const renderStep3 = () => {
    const market = MARKETS.find(m => m.id === selectedMarket);
    const selectedItems = Array.from(selectedProducts).map(id => 
      products.find(p => p.id === id)
    ).filter(Boolean);

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Review & Open Market</h2>

        <Card className="p-4 space-y-4">
          <div>
            <Label className="text-muted-foreground">Market</Label>
            <div className="font-semibold text-lg">{market?.name}</div>
            <div className="text-sm text-muted-foreground">{market?.hours}</div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-muted-foreground">Products ({selectedItems.length})</Label>
            <div className="mt-2 space-y-1">
              {selectedItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">Qty: {quantities[item.id] || 20}</span>
                </div>
              ))}
            </div>
          </div>

          {specialNotes && (
            <div className="border-t pt-4">
              <Label className="text-muted-foreground">Notes</Label>
              <div className="text-sm">{specialNotes}</div>
            </div>
          )}
        </Card>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            Opening this market will make it live on the website and allow customers to place orders.
            Make sure you're ready to start receiving orders!
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Store className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-bold text-xl">Market Setup</h1>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              Step {step} of 3
              <div className="flex gap-1 ml-2">
                {[1, 2, 3].map(s => (
                  <div
                    key={s}
                    className={cn(
                      "w-2 h-2 rounded-full",
                      s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-8">
        <Card className="p-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          <div className="flex gap-3 mt-8 pt-6 border-t">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            
            <div className="flex-1" />
            
            {step < 3 ? (
              <Button
                onClick={() => {
                  if (step === 1 && !selectedMarket) {
                    toast.error('Please select a market');
                    return;
                  }
                  if (step === 2 && selectedProducts.size === 0) {
                    toast.error('Please select at least one product');
                    return;
                  }
                  setStep(step + 1);
                }}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSubmitting ? (
                  <>Opening Market...</>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-1" />
                    Open Market
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
