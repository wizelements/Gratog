'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ShoppingCart, Plus, Sparkles, Tag } from 'lucide-react';
import { getFrequentlyBoughtTogether } from '@/lib/bundles';
import { useCartEngine } from '@/hooks/useCartEngine';
import { toast } from 'sonner';

export default function FrequentlyBoughtTogether({ productId }) {
  const [bundleData, setBundleData] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { addItem } = useCartEngine();

  useEffect(() => {
    const loadData = () => {
      try {
        const data = getFrequentlyBoughtTogether(productId);
        if (data) {
          setBundleData(data);
          const initial = {};
          data.allProducts.forEach(p => {
            initial[p.id] = true;
          });
          setSelectedProducts(initial);
        }
      } catch (error) {
        console.error('Failed to load frequently bought together:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [productId]);

  const toggleProduct = (productId) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const getSelectedProducts = () => {
    if (!bundleData) return [];
    return bundleData.allProducts.filter(p => selectedProducts[p.id]);
  };

  const getSelectedTotal = () => {
    const selected = getSelectedProducts();
    return selected.reduce((sum, p) => sum + (p.price || 0), 0);
  };

  const getDiscountedTotal = () => {
    const selected = getSelectedProducts();
    if (selected.length >= 2) {
      const total = getSelectedTotal();
      return total * (1 - bundleData.discountPercent / 100);
    }
    return getSelectedTotal();
  };

  const handleAddSelected = async () => {
    setAdding(true);
    try {
      const selected = getSelectedProducts();
      for (const product of selected) {
        addItem(product);
      }
      toast.success(`${selected.length} items added to cart!`, {
        description: selected.length >= 2 
          ? `You saved ${bundleData.discountPercent}% with this combo!`
          : undefined
      });
    } catch (error) {
      toast.error('Failed to add items to cart');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="flex gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-1">
                <div className="h-24 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bundleData || bundleData.relatedProducts.length === 0) return null;

  const selectedCount = getSelectedProducts().length;
  const showDiscount = selectedCount >= 2;

  return (
    <Card className="border-2 border-dashed border-emerald-200 bg-gradient-to-br from-white to-emerald-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            Frequently Bought Together
          </CardTitle>
          {showDiscount && (
            <Badge className="bg-emerald-600 text-white">
              <Tag className="h-3 w-3 mr-1" />
              Save {bundleData.discountPercent}%
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
          {bundleData.allProducts.map((product, idx) => (
            <div key={product.id} className="flex items-center gap-2 md:gap-4">
              <div 
                className={`relative p-2 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedProducts[product.id] 
                    ? 'border-emerald-500 bg-white shadow-md' 
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
                onClick={() => toggleProduct(product.id)}
              >
                <div className="absolute -top-2 -left-2 z-10">
                  <Checkbox
                    checked={selectedProducts[product.id]}
                    onCheckedChange={() => toggleProduct(product.id)}
                    className="bg-white data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                </div>
                
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-emerald-50">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-emerald-600" />
                    </div>
                  )}
                </div>
                
                <div className="mt-2 text-center">
                  <Link 
                    href={`/product/${product.slug || product.id}`}
                    className="text-xs md:text-sm font-medium text-gray-900 hover:text-emerald-600 line-clamp-2 block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {product.name}
                  </Link>
                  <p className="text-sm font-bold text-emerald-600 mt-1">
                    ${product.price?.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {idx < bundleData.allProducts.length - 1 && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100">
                  <Plus className="h-4 w-4 text-emerald-600" />
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="border-t pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                {showDiscount && (
                  <span className="text-gray-400 line-through text-sm">
                    ${getSelectedTotal().toFixed(2)}
                  </span>
                )}
                <span className="text-2xl font-bold text-emerald-600">
                  ${getDiscountedTotal().toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                {showDiscount && (
                  <span className="text-emerald-600 font-medium ml-1">
                    (Save ${(getSelectedTotal() - getDiscountedTotal()).toFixed(2)})
                  </span>
                )}
              </p>
            </div>
            
            <Button
              onClick={handleAddSelected}
              disabled={adding || selectedCount === 0}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white min-w-[180px]"
            >
              {adding ? (
                <span className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Adding...
                </span>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add Selected to Cart
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
