'use client';

import { useState, useEffect } from 'react';
import { Heart, Trash2, ShoppingCart, Share2, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useWishlistStore } from '@/stores/wishlist';
import { addToCart } from '@/lib/cart-engine';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function WishlistPage() {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { items, removeFromWishlist, clearWishlist } = useWishlistStore();
  const [hydratedItems, setHydratedItems] = useState([]);

  useEffect(() => {
    setMounted(true);
    // Re-read from localStorage on mount to ensure we have the latest data
    try {
      const saved = localStorage.getItem('wishlist_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHydratedItems(parsed);
        }
      }
    } catch (e) {
      console.error('Error hydrating wishlist:', e);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Use hydrated items if store is empty but localStorage has data
    const activeItems = items.length > 0 ? items : hydratedItems;

    const fetchProducts = async () => {
      if (activeItems.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/catalog');
        if (!response.ok) throw new Error('Failed to fetch products');
        
        const data = await response.json();
        const allProducts = data.products || [];
        
        const wishlistProducts = allProducts.filter(p => 
          activeItems.includes(p.id) || activeItems.includes(p.slug)
        );
        
        setProducts(wishlistProducts);
      } catch (error) {
        console.error('Error fetching wishlist products:', error);
        toast.error('Failed to load wishlist products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [mounted, items, hydratedItems]);

  const handleMoveToCart = (product) => {
    const variant = product.variations?.[0];
    addToCart({
      id: product.id,
      name: product.name,
      price: variant?.price || product.price || 0,
      image: product.displayImage || product.image || product.images?.[0],
      slug: product.slug,
      variationId: variant?.id,
      variationName: variant?.name
    });
    removeFromWishlist(product.id);
    toast.success(`${product.name} moved to cart`);
  };

  const handleRemove = (productId, productName) => {
    removeFromWishlist(productId);
    toast.success(`${productName} removed from wishlist`);
  };

  const handleClearAll = () => {
    if (products.length === 0) return;
    clearWishlist();
    toast.success('Wishlist cleared');
  };

  const handleShare = async () => {
    const wishlistUrl = `${window.location.origin}/wishlist?items=${items.join(',')}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Wishlist - Taste of Gratitude',
          text: 'Check out my wishlist from Taste of Gratitude!',
          url: wishlistUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyToClipboard(wishlistUrl);
        }
      }
    } else {
      copyToClipboard(wishlistUrl);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Wishlist link copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-10 w-48 bg-gray-200 rounded mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-80 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-full">
              <Heart className="h-6 w-6 text-red-500 fill-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
              <p className="text-gray-600">
                {products.length} {products.length === 1 ? 'item' : 'items'} saved
              </p>
            </div>
          </div>
          
          {products.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleShare}
                className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                onClick={handleClearAll}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-80 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card className="max-w-lg mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-gray-100 rounded-full mb-6">
                <Heart className="h-12 w-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Your wishlist is empty
              </h2>
              <p className="text-gray-600 mb-6 max-w-sm">
                Start adding products you love by clicking the heart icon on any product card.
              </p>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/catalog">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Browse Products
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {products.map((product) => {
                const wishlistImage = product.displayImage || product.image || product.images?.[0];
                const wishlistImageAlt = product.imageAlt || product.name;

                return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
                      <Link href={`/product/${product.slug || product.id}`}>
                        {wishlistImage ? (
                          <Image
                            src={wishlistImage}
                            alt={wishlistImageAlt}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="h-12 w-12 text-emerald-600" />
                          </div>
                        )}
                      </Link>
                      <button
                        onClick={() => handleRemove(product.id, product.name)}
                        className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow-md hover:bg-red-50 transition-colors"
                        aria-label="Remove from wishlist"
                      >
                        <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                      </button>
                    </div>
                    
                    <CardContent className="p-4">
                      <Link href={`/product/${product.slug || product.id}`}>
                        <h3 className="font-semibold text-lg text-gray-900 hover:text-emerald-600 transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                      </Link>
                      
                      {product.benefitStory && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {product.benefitStory}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xl font-bold text-emerald-600">
                          ${(product.variations?.[0]?.price || product.price || 0).toFixed(2)}
                        </span>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemove(product.id, product.name)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleMoveToCart(product)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Add to Cart
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
