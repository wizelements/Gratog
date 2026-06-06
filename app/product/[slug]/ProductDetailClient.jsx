'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ShoppingCart, Loader2, Star, MapPin, ShieldCheck, Truck, RefreshCw, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { addToCart } from '@/lib/cart-engine';

import Breadcrumbs, { getProductBreadcrumbs } from '@/components/Breadcrumbs';
import ProductReviews from '@/components/ProductReviews';
import Script from 'next/script';
import { PRODUCT_IMAGE_FALLBACK_SRC } from '@/lib/storefront-integrity';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tasteofgratitude.shop';

const DEFAULT_REVIEW_SUMMARY = {
  averageRating: 0,
  reviewCount: 0,
  ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  verifiedCount: 0,
};

function normalizeReviewSummary(summary) {
  const source = summary && typeof summary === 'object' ? summary : {};
  return {
    averageRating: Number.isFinite(Number(source.averageRating))
      ? Number(source.averageRating)
      : DEFAULT_REVIEW_SUMMARY.averageRating,
    reviewCount: Number.isFinite(Number(source.reviewCount))
      ? Number(source.reviewCount)
      : DEFAULT_REVIEW_SUMMARY.reviewCount,
    ratingDistribution: {
      1: Number(source.ratingDistribution?.[1] || 0),
      2: Number(source.ratingDistribution?.[2] || 0),
      3: Number(source.ratingDistribution?.[3] || 0),
      4: Number(source.ratingDistribution?.[4] || 0),
      5: Number(source.ratingDistribution?.[5] || 0),
    },
    verifiedCount: Number.isFinite(Number(source.verifiedCount))
      ? Number(source.verifiedCount)
      : DEFAULT_REVIEW_SUMMARY.verifiedCount,
  };
}

export default function ProductDetailClient({ product, slug }) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('flavor');
  const [reviewSummary, setReviewSummary] = useState(DEFAULT_REVIEW_SUMMARY);

  // Set default variation on mount
  useEffect(() => {
    if (product?.variations?.length > 0) {
      const validVariations = product.variations.filter(v => v.price && v.price > 0);
      if (validVariations.length > 0) {
        setSelectedVariation(validVariations[0]);
      }
    }
  }, [product]);

  // Fetch reviews
  useEffect(() => {
    if (!product?.id && !product?.slug) return;
    
    const resolvedProductId = product.id || product.slug;
    let isCancelled = false;

    async function fetchReviewSummary() {
      try {
        const response = await fetch(`/api/reviews?productId=${encodeURIComponent(resolvedProductId)}&page=1&limit=3`, {
          cache: 'no-store'
        });
        
        if (!response.ok) throw new Error('Failed to fetch reviews');
        
        const data = await response.json();
        if (isCancelled) return;
        
        if (data.success) {
          setReviewSummary(normalizeReviewSummary(data.summary));
        }
      } catch (err) {
        console.error('[ProductReviews] Error fetching reviews:', err);
      }
    }

    fetchReviewSummary();
    return () => { isCancelled = true; };
  }, [product?.id, product?.slug]);

  // Cart functionality
  const handleAddToCart = async () => {
    if (!selectedVariation) {
      toast.error('Please select a size option');
      return;
    }
    
    if (product.stock <= 0 && !product.isPreorder) {
      toast.error('This product is currently out of stock');
      return;
    }

    try {
      setIsAdding(true);
      await addToCart(product, selectedVariation, quantity);
      toast.success(`Added ${quantity} ${selectedVariation.name || ''} ${product.name} to cart`);
    } catch (error) {
      console.error('[GratOG] Error adding to cart:', error);
      toast.error(error.message || 'Failed to add to cart. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">The product you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/catalog">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Products
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = (price) => {
    if (!price || price <= 0) return 'Price not available';
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const displayPrice = selectedVariation?.price || product.price;
  const stockStatus = product.stock > 0 ? 'in_stock' : product.isPreorder ? 'preorder' : 'out_of_stock';
  const flavorNotes =
    product.flavorNotes ||
    product.tastingNotes ||
    product.flavorProfile ||
    product.shortDescription ||
    product.description ||
    'Small-batch sea moss gel with a smooth chilled texture and naturally simple ingredients.';
  const storageGuidance =
    product.storageInstructions ||
    product.careInstructions ||
    'Keep refrigerated. Use a clean spoon each time and follow the freshness window on the label.';
  const pickupGuidance = product.isPreorder
    ? 'Preorder items are made for your selected pickup date. Choose your market and pickup day during checkout.'
    : 'Choose market pickup or eligible local delivery during checkout. Pickup details are confirmed before payment.';
  const ingredients = Array.isArray(product.ingredients)
    ? product.ingredients
        .map((ingredient) => (typeof ingredient === 'string' ? { name: ingredient } : ingredient))
        .filter((ingredient) => ingredient?.name)
    : [];
  
  // Prepare images
  const images = product.images?.length > 0 
    ? product.images 
    : product.image 
      ? [product.image] 
      : [PRODUCT_IMAGE_FALLBACK_SRC];

  const breadcrumbItems = getProductBreadcrumbs(product);

  return (
    <div className="min-h-screen bg-[#fbfaf7]">
      <Script id="product-schema" type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.description?.substring(0, 500),
          image: images[0],
          sku: selectedVariation?.sku || product.sku || product.id,
          brand: {
            '@type': 'Brand',
            name: 'Taste of Gratitude'
          },
          offers: {
            '@type': 'Offer',
            url: `${BASE_URL}/product/${slug}`,
            price: displayPrice,
            priceCurrency: 'USD',
            availability: stockStatus === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemOffered: {
              '@type': 'Product',
              name: product.name
            }
          },
          aggregateRating: reviewSummary.reviewCount > 0 ? {
            '@type': 'AggregateRating',
            ratingValue: reviewSummary.averageRating.toFixed(1),
            reviewCount: reviewSummary.reviewCount
          } : undefined
        })}
      </Script>

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border border-stone-100">
              <Image
                src={images[selectedImage]}
                alt={product.imageAlt || product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              {stockStatus === 'preorder' && (
                <div className="absolute top-4 left-4 rounded bg-white/95 px-3 py-1 text-sm font-medium text-emerald-800 shadow-sm">
                  Preorder
                </div>
              )}
            </div>
            
            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                      selectedImage === idx ? 'border-emerald-500' : 'border-transparent'
                    }`}
                    aria-label={`Show ${product.name} image ${idx + 1}`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} - view ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
                {product.category}
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
              
              {/* Rating */}
              {reviewSummary.reviewCount > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(reviewSummary.averageRating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {reviewSummary.averageRating.toFixed(1)} ({reviewSummary.reviewCount} reviews)
                  </span>
                </div>
              )}

              <p className="text-3xl font-bold text-emerald-600">{formatPrice(displayPrice)}</p>
            </div>

            {/* Description */}
            <p className="text-base text-gray-700 leading-relaxed">{product.description}</p>

            {/* Variations */}
            {product.variations?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size / Option
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variations
                    .filter(v => v.price && v.price > 0)
                    .map((variation) => (
                    <button
                      key={variation.id}
                      onClick={() => setSelectedVariation(variation)}
                      className={`min-h-12 px-4 py-3 rounded-lg border-2 transition-all text-left ${
                        selectedVariation?.id === variation.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="text-sm font-medium">{variation.name || 'Default'}</div>
                      <div className="text-xs text-gray-500">{formatPrice(variation.price)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-11 h-11 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-11 h-11 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div>
              <Button
                onClick={handleAddToCart}
                disabled={isAdding || (!selectedVariation && product.variations?.length > 0)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg"
              >
                {isAdding ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <ShoppingCart className="w-5 h-5 mr-2" />
                )}
                Add to Cart
              </Button>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-900">
                  <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>Secure Square checkout</span>
                </div>
                <Link href="/policies#shipping" className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-900 hover:bg-emerald-100">
                  <Truck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>Pickup, delivery, or shipping details</span>
                </Link>
                <Link href="/policies#refunds" className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-900 hover:bg-emerald-100">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>Satisfaction guarantee</span>
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">What to expect</h3>
              <div className="space-y-3 text-base text-gray-700 leading-relaxed">
                <p>{flavorNotes}</p>
                <p className="text-gray-600">
                  Made in small batches with transparent ingredients and simple pickup guidance below.
                </p>
              </div>
            </div>

            {/* Pickup, Delivery & Shipping Info */}
            <div className="flex items-start gap-3 text-sm text-gray-600">
              <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Pickup, Delivery & Shipping</p>
                <p>{pickupGuidance}</p>
                <p className="mt-1">
                  Eligible shelf-stable items can ship nationwide; perishable batches are packed carefully and shown with fees before payment.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-16">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="flavor">Flavor</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
              <TabsTrigger value="care">Storage & Fulfillment</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviewSummary.reviewCount})</TabsTrigger>
            </TabsList>

            <TabsContent value="flavor" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="prose max-w-none">
                    <h3 className="text-lg font-semibold mb-4">Flavor & texture</h3>
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">{flavorNotes}</p>
                    <p className="mt-4 text-gray-600 leading-relaxed">
                      Each batch is meant to be enjoyed chilled, folded into a daily ritual, or mixed into your favorite drink or bowl.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ingredients" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Key Ingredients</h3>
                  {ingredients.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {ingredients.map((ingredient, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-2xl">{ingredient.icon || '🌿'}</span>
                          <div>
                            <p className="font-medium capitalize">{ingredient.name}</p>
                            {(ingredient.description || ingredient.notes || ingredient.source) && (
                              <p className="text-sm text-gray-600">
                                {ingredient.description || ingredient.notes || ingredient.source}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">Premium wildcrafted sea moss with natural ingredients.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="care" className="mt-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Storage</h3>
                    <p className="text-gray-700 leading-relaxed">{storageGuidance}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Pickup, delivery, and shipping</h3>
                    <p className="text-gray-700 leading-relaxed">{pickupGuidance}</p>
                    <div className="mt-4 grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
                      <Link href="/policies#shipping" className="rounded-lg border border-gray-200 p-3 hover:border-emerald-300">
                        <Truck className="mb-2 h-5 w-5 text-emerald-700" aria-hidden="true" />
                        Shipping costs and eligible items are confirmed before payment.
                      </Link>
                      <Link href="/policies#refunds" className="rounded-lg border border-gray-200 p-3 hover:border-emerald-300">
                        <RefreshCw className="mb-2 h-5 w-5 text-emerald-700" aria-hidden="true" />
                        Refund and replacement requests are reviewed quickly for quality issues.
                      </Link>
                      <div className="rounded-lg border border-gray-200 p-3">
                        <ShieldCheck className="mb-2 h-5 w-5 text-emerald-700" aria-hidden="true" />
                        Secure checkout and support from a real small-batch team.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <ProductReviews 
                productId={product.id || product.slug}
                productName={product.name}
              />
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </div>
  );
}
