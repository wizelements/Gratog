'use client';

import React, { useEffect, useState } from 'react';
import { MinusCircle, PlusCircle, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InventoryItem {
  productId: string;
  name: string;
  price: number;
  category?: string;
  initialQuantity: number;
  remaining: number;
  isSoldOut: boolean;
}

interface InventoryManagerProps {
  marketId?: string;
  className?: string;
}

export function InventoryManager({ marketId = 'serenbe-farmers-market', className }: InventoryManagerProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
    // Poll every 10 seconds for live updates
    const interval = setInterval(fetchInventory, 10000);
    return () => clearInterval(interval);
  }, [marketId]);

  const fetchInventory = async () => {
    try {
      const response = await fetch(`/api/inventory?marketId=${marketId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.inventory?.items) {
          setInventory(data.inventory.items);
        }
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSoldOut = async (productId: string, currentStatus: boolean) => {
    setIsUpdating(productId);
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId,
          action: 'update',
          productId,
          isSoldOut: !currentStatus,
        }),
      });

      if (response.ok) {
        setInventory(prev => prev.map(item =>
          item.productId === productId
            ? { ...item, isSoldOut: !currentStatus }
            : item
        ));
        toast.success(`${currentStatus ? 'Restocked' : 'Marked sold out'}`, {
          description: `Item updated successfully`,
        });
      } else {
        toast.error('Failed to update inventory');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsUpdating(null);
    }
  };

  const adjustQuantity = async (productId: string, delta: number) => {
    const item = inventory.find(i => i.productId === productId);
    if (!item) return;

    const newRemaining = Math.max(0, item.remaining + delta);
    
    setIsUpdating(productId);
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId,
          action: 'update',
          productId,
          adjustment: item.initialQuantity - newRemaining,
        }),
      });

      if (response.ok) {
        setInventory(prev => prev.map(i =>
          i.productId === productId
            ? { ...i, remaining: newRemaining, isSoldOut: newRemaining === 0 }
            : i
        ));
      } else {
        toast.error('Failed to update quantity');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsUpdating(null);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading inventory...</p>
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div className={cn("p-6 text-center border rounded-lg", className)}>
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No inventory set up for today</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <span className="font-semibold">Live Inventory</span>
        </div>
        <span className="text-xs text-muted-foreground">Updates every 10s</span>
      </div>

      <div className="space-y-2">
        {inventory.map((item) => (
          <div
            key={item.productId}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-colors",
              item.isSoldOut && "bg-muted opacity-60",
              !item.isSoldOut && "bg-card hover:bg-accent/50"
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-medium truncate",
                  item.isSoldOut && "line-through text-muted-foreground"
                )}>
                  {item.name}
                </span>
                {item.isSoldOut && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                    <AlertCircle className="w-3 h-3" />
                    SOLD OUT
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3 mt-1">
                {!item.isSoldOut && (
                  <>
                    <span className="text-xs text-muted-foreground">
                      {item.remaining} / {item.initialQuantity} left
                    </span>
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          item.remaining <= item.initialQuantity * 0.2 && "bg-destructive",
                          item.remaining > item.initialQuantity * 0.2 && item.remaining <= item.initialQuantity * 0.5 && "bg-amber-500",
                          item.remaining > item.initialQuantity * 0.5 && "bg-emerald-500"
                        )}
                        style={{ width: `${(item.remaining / item.initialQuantity) * 100}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!item.isSoldOut && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => adjustQuantity(item.productId, -1)}
                    disabled={isUpdating === item.productId || item.remaining <= 0}
                    className="h-8 w-8 p-0"
                  >
                    <MinusCircle className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-mono text-sm">{item.remaining}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => adjustQuantity(item.productId, 1)}
                    disabled={isUpdating === item.productId}
                    className="h-8 w-8 p-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </>
              )}
              
              <Button
                variant={item.isSoldOut ? "outline" : "secondary"}
                size="sm"
                onClick={() => toggleSoldOut(item.productId, item.isSoldOut)}
                disabled={isUpdating === item.productId}
                className={cn(
                  "ml-2",
                  item.isSoldOut && "border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                )}
              >
                {item.isSoldOut ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Restock
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Sold Out
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
