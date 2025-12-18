'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { getUpsellOption } from '@/lib/bundles';
import { useCartEngine } from '@/hooks/useCartEngine';
import { toast } from 'sonner';

export default function UpsellWidget({ productId, variant = 'default' }) {
  const [upsell, setUpsell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const { addItem, removeItem } = useCartEngine();

  useEffect(() => {
    const loadUpsell = () => {
      try {
        const data = getUpsellOption(productId);
        setUpsell(data);
      } catch (error) {
        console.error('Failed to load upsell:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUpsell();
  }, [productId]);

  const handleUpgrade = async () => {
    if (!upsell) return;
    
    setUpgrading(true);
    try {
      removeItem(productId);
      addItem(upsell.upgradeProduct);
      toast.success(`Upgraded to ${upsell.upgradeProduct.name}!`, {
        description: `You're getting ${upsell.valueMultiplier}x more value!`
      });
    } catch (error) {
      toast.error('Failed to upgrade');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg h-20" />
    );
  }

  if (!upsell) return null;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-amber-100">
          {upsell.upgradeProduct.image ? (
            <Image
              src={upsell.upgradeProduct.image}
              alt={upsell.upgradeProduct.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-amber-600" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Upgrade available
          </p>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {upsell.upgradeProduct.name}
          </p>
        </div>
        
        <Button
          onClick={handleUpgrade}
          disabled={upgrading}
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0"
        >
          {upgrading ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>
              <ArrowUp className="h-3 w-3 mr-1" />
              +${upsell.priceDifference.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Badge className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none">
            <Zap className="h-3 w-3 mr-1" />
            Better Value
          </Badge>
          
          <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white shadow-md">
            {upsell.upgradeProduct.image ? (
              <Image
                src={upsell.upgradeProduct.image}
                alt={upsell.upgradeProduct.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-amber-600" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">
                Upgrade & Save {upsell.savingsPercent}%
              </span>
            </div>
            
            <Link 
              href={`/product/${upsell.upgradeProduct.slug || upsell.upgradeProduct.id}`}
              className="text-lg font-bold text-gray-900 hover:text-amber-600 transition-colors line-clamp-1 block"
            >
              {upsell.upgradeProduct.name}
            </Link>
            
            <p className="text-sm text-gray-600 mt-1">
              {upsell.message}
            </p>
            
            <div className="flex items-center gap-3 mt-3">
              <div>
                <span className="text-xl font-bold text-emerald-600">
                  ${upsell.upgradeProduct.price?.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500 ml-1">
                  ({upsell.valueMultiplier}x value)
                </span>
              </div>
              
              <Button
                onClick={handleUpgrade}
                disabled={upgrading}
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                {upgrading ? (
                  <span className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Upgrading...
                  </span>
                ) : (
                  <>
                    <ArrowUp className="h-4 w-4 mr-1" />
                    Upgrade for +${upsell.priceDifference.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
