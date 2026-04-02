'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Sparkles, ShoppingCart, Check, ArrowRight } from 'lucide-react';
import { getFeaturedBundles, getAllBundlesWithProducts } from '@/lib/bundles';
import { useCartEngine } from '@/hooks/useCartEngine';
import { toast } from 'sonner';

export default function ProductBundles({ showAll = false, limit = 3 }) {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingBundle, setAddingBundle] = useState(null);
  const { addItem } = useCartEngine();

  useEffect(() => {
    const loadBundles = () => {
      try {
        const data = showAll ? getAllBundlesWithProducts() : getFeaturedBundles();
        setBundles(limit ? data.slice(0, limit) : data);
      } catch (error) {
        console.error('Failed to load bundles:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBundles();
  }, [showAll, limit]);

  const handleAddBundle = async (bundle) => {
    setAddingBundle(bundle.id);
    try {
      for (const product of bundle.productDetails) {
        addItem({
          ...product,
          bundleId: bundle.id,
          bundleDiscount: bundle.discountPercent
        });
      }
      toast.success(`${bundle.name} added to cart!`, {
        description: `You saved $${bundle.savings.toFixed(2)}!`
      });
    } catch (error) {
      toast.error('Failed to add bundle to cart');
    } finally {
      setAddingBundle(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-32 bg-gray-200" />
            <CardContent className="space-y-3 p-6">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-10 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (bundles.length === 0) return null;

  return (
    <section className="py-12">
      <div className="text-center mb-10">
        <Badge className="mb-4 bg-emerald-600 text-white px-4 py-2">
          <Package className="mr-2 h-4 w-4" />
          Bundle & Save
        </Badge>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Value Bundles
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Get more for less with our curated product bundles
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bundles.map((bundle) => (
          <Card 
            key={bundle.id}
            className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-emerald-300 relative"
          >
            {bundle.badge && (
              <Badge className="absolute top-4 right-4 z-10 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-none">
                <Sparkles className="h-3 w-3 mr-1" />
                {bundle.badge}
              </Badge>
            )}
            
            <CardHeader className="pb-2">
              <div className="flex -space-x-4 mb-4 justify-center">
                {bundle.productDetails.slice(0, 4).map((product, idx) => (
                  <div 
                    key={product.id}
                    className="relative w-16 h-16 rounded-full border-3 border-white bg-emerald-50 overflow-hidden shadow-md"
                    style={{ zIndex: bundle.productDetails.length - idx }}
                  >
                    {product.displayImage || product.image ? (
                      <Image
                        src={product.displayImage || product.image}
                        alt={product.imageAlt || product.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-emerald-600" />
                      </div>
                    )}
                  </div>
                ))}
                {bundle.productDetails.length > 4 && (
                  <div className="w-16 h-16 rounded-full border-3 border-white bg-emerald-100 flex items-center justify-center shadow-md">
                    <span className="text-sm font-bold text-emerald-700">
                      +{bundle.productDetails.length - 4}
                    </span>
                  </div>
                )}
              </div>
              
              <CardTitle className="text-xl text-center">{bundle.name}</CardTitle>
              <CardDescription className="text-center text-sm">
                {bundle.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {bundle.productDetails.map((product) => (
                  <div key={product.id} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{product.name}</span>
                    <span className="text-gray-400 ml-auto">${product.price?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Regular Price:</span>
                  <span className="text-gray-500 line-through">${bundle.originalTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-700">Bundle Price:</span>
                  <span className="text-2xl font-bold text-emerald-600">${bundle.bundlePrice.toFixed(2)}</span>
                </div>
                <div className="mt-2 text-center">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                    Save ${bundle.savings.toFixed(2)} ({bundle.discountPercent}% off)
                  </Badge>
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button
                onClick={() => handleAddBundle(bundle)}
                disabled={addingBundle === bundle.id}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              >
                {addingBundle === bundle.id ? (
                  <span className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Adding...
                  </span>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add Bundle to Cart
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {!showAll && bundles.length > 0 && (
        <div className="text-center mt-8">
          <Link href="/catalog?view=bundles">
            <Button variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
              View All Bundles
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </section>
  );
}
