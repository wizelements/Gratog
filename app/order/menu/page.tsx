'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Minus, 
  Plus, 
  ShoppingCart, 
  ChevronLeft, 
  X,
  ArrowRight,
  Clock,
  AlertCircle,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  variation?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  variations?: Array<{ id: string; name: string; price: number }>;
  isSoldOut?: boolean;
}

interface InventoryItem {
  productId: string;
  name: string;
  remaining: number;
  isSoldOut: boolean;
}

export default function MobileMenuPage() {
  const searchParams = useSearchParams();
  const marketId = searchParams.get('market') || 'serenbe-farmers-market';
  const tableId = searchParams.get('table');

  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh inventory every 10s
    return () => clearInterval(interval);
  }, [marketId]);

  const fetchData = async () => {
    try {
      // Fetch products
      const productsRes = await fetch('/api/market/today');
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }

      // Fetch inventory
      const inventoryRes = await fetch(`/api/inventory?marketId=${marketId}`);
      if (inventoryRes.ok) {
        const data = await inventoryRes.json();
        if (data.inventory?.items) {
          setInventory(data.inventory.items);
        }
      }
    } catch (error) {
      console.error('Failed to fetch menu data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProductInventory = (productId: string) => {
    return inventory.find(i => i.productId === productId);
  };

  const addToCart = (product: Product, quantity = 1) => {
    const inv = getProductInventory(product.id);
    if (inv?.isSoldOut) {
      toast.error(`${product.name} is sold out`);
      return;
    }

    const cartItem = cart.find(item => item.productId === product.id);
    const currentQty = cartItem?.quantity || 0;
    
    if (inv && currentQty + quantity > inv.remaining) {
      toast.error(`Only ${inv.remaining} remaining`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        imageUrl: product.imageUrl,
      }];
    });

    toast.success(`Added ${product.name} to cart`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Group products by category
  const categories = Array.from(new Set(products.map(p => p.category || 'General')));
  const filteredProducts = selectedCategory
    ? products.filter(p => (p.category || 'General') === selectedCategory)
    : products;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={`/order/start?market=${marketId}${tableId ? `&table=${tableId}` : ''}`}>
            <Button variant="ghost" size="sm" className="-ml-2">
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Menu</h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="whitespace-nowrap"
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="whitespace-nowrap"
            >
              {cat}
            </Button>
          ))}
        </div>
      </header>

      {/* Product List */}
      <div className="p-4 space-y-4">
        {filteredProducts.map(product => {
          const inv = getProductInventory(product.id);
          const inCart = cart.find(item => item.productId === product.id);
          const isSoldOut = inv?.isSoldOut || product.isSoldOut;
          const remaining = inv?.remaining ?? 999;

          return (
            <div 
              key={product.id}
              className={cn(
                "flex gap-4 p-3 bg-card rounded-lg border",
                isSoldOut && "opacity-50"
              )}
            >
              {/* Product Image */}
              <div className="w-20 h-20 bg-muted rounded-md flex-shrink-0 overflow-hidden">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    🍃
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className={cn(
                      "font-semibold",
                      isSoldOut && "line-through text-muted-foreground"
                    )}>
                      {product.name}
                    </h3>
                    <p className="text-emerald-600 font-bold">${product.price}</p>
                    
                    {!isSoldOut && remaining <= 5 && remaining > 0 && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        Only {remaining} left
                      </Badge>
                    )}
                    {isSoldOut && (
                      <Badge variant="destructive" className="text-xs mt-1">
                        Sold Out
                      </Badge>
                    )}
                  </div>

                  {/* Quick Add Controls */}
                  <div className="flex items-center gap-1">
                    {!inCart ? (
                      <Button
                        size="sm"
                        onClick={() => addToCart(product)}
                        disabled={isSoldOut}
                        className="h-9 w-9 p-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(product.id, -1)}
                          className="h-7 w-7 p-0"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-6 text-center font-medium">{inCart.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addToCart(product)}
                          disabled={isSoldOut || inCart.quantity >= remaining}
                          className="h-7 w-7 p-0"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Sheet open={showCheckout} onOpenChange={setShowCheckout}>
            <SheetTrigger asChild>
              <Button size="lg" className="w-full h-14 text-lg">
                <ShoppingCart className="w-5 h-5 mr-2" />
                View Cart ({cartCount})
                <span className="ml-auto font-bold">${cartTotal.toFixed(2)}</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </SheetTrigger>
            
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Your Cart ({cartCount})</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4 overflow-y-auto max-h-[50vh]">
                {cart.map(item => (
                  <div key={item.productId} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ${item.price.toFixed(2)} × {item.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.productId)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t space-y-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                
                <Link href={`/order/checkout?market=${marketId}${tableId ? `&table=${tableId}` : ''}`}>
                  <Button size="lg" className="w-full h-14 text-lg">
                    Continue to Checkout
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}
