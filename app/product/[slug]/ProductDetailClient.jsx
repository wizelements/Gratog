'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ShoppingCart, Check, Loader2, Star, Heart, Share2, Truck, Shield, Package, Sparkles, Droplets, Award, Users, Quote, ChevronRight, Leaf, Sun, Zap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { addToCart } from '@/lib/cart-engine';
import RecommendationsWidget from '@/components/RecommendationsWidget';
import Breadcrumbs, { getProductBreadcrumbs } from '@/components/Breadcrumbs';
import ProductReviews from '@/components/ProductReviews';
import Script from 'next/script';
import { PRODUCT_IMAGE_FALLBACK_SRC } from '@/lib/storefront-integrity';
import SoldOutBadge, { PreorderNotice } from '@/components/psychology/SoldOutBadge';
import ScarcityBadge from '@/components/psychology/ScarcityBadge';

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
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [activeStory, setActiveStory] = useState(0);
  const [activeTab, setActiveTab] = useState('details');
  const [reviewSummary, setReviewSummary] = useState(DEFAULT_REVIEW_SUMMARY);
  const [topReviews, setTopReviews] = useState([]);
  const storyRef = useRef(null);

  // Set default variation on mount
  useEffect(() => {
    if (product?.variations?.length > 0) {
      const validVariations = product.variations.filter(v => v.price && v.price > 0);
      if (validVariations.length > 0) {
        setSelectedVariation(validVariations[0]);
      }
    }
  }, [product]);

  // Scroll effect for parallax
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          setTopReviews(data.reviews?.slice(0, 3) || []);
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

  const handleShare = async () => {
    const url = `${BASE_URL}/product/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: product.description?.substring(0, 100) || 'Check out this product!',
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('[GratOG] Share error:', err);
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
  
  // Prepare images
  const images = product.images?.length > 0 
    ? product.images 
    : product.image 
      ? [product.image] 
      : [PRODUCT_IMAGE_FALLBACK_SRC];

  const breadcrumbItems = getProductBreadcrumbs(product);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
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
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-lg">
              <Image
                src={images[selectedImage]}
                alt={product.imageAlt || product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              {stockStatus === 'preorder' && (
                <div className="absolute top-4 left-4">
                  <PreorderNotice />
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
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                  {product.category}
                </Badge>
                {product.primaryHealthBenefit && (
                  <Badge variant="outline" className="text-emerald-600">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {product.primaryHealthBenefit.label}
                  </Badge>
                )}
              </div>
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
            <p className="text-gray-600 leading-relaxed">{product.description}</p>

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
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
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
                  className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                >
                  -
                </button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                disabled={isAdding || (!selectedVariation && product.variations?.length > 0)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-12 text-lg"
              >
                {isAdding ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <ShoppingCart className="w-5 h-5 mr-2" />
                )}
                Add to Cart
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsFavorite(!isFavorite)}
                className="w-12 h-12"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button
                variant="outline"
                onClick={handleShare}
                className="w-12 h-12"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* Benefits */}
            {product.healthBenefits?.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-emerald-600" />
                  Health Benefits
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.healthBenefits.slice(0, 6).map((benefit, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {benefit}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Shipping Info */}
            <div className="flex items-start gap-3 text-sm text-gray-600">
              <Truck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Free Shipping</p>
                <p>On orders over $35. Local pickup available at Serenbe Farmers Market.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-16">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
              <TabsTrigger value="benefits">Benefits</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviewSummary.reviewCount})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="prose max-w-none">
                    <h3 className="text-lg font-semibold mb-4">Product Details</h3>
                    <p className="text-gray-600 whitespace-pre-line">{product.description}</p>
                    
                    {product.benefitStory && (
                      <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
                        <h4 className="font-medium text-emerald-900 mb-2">The Gratitude Story</h4>
                        <p className="text-emerald-800">{product.benefitStory}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ingredients" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Key Ingredients</h3>
                  {product.ingredients?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {product.ingredients.map((ingredient, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-2xl">{ingredient.icon || '🌿'}</span>
                          <div>
                            <p className="font-medium capitalize">{ingredient.name}</p>
                            {ingredient.benefits && (
                              <p className="text-sm text-gray-600">{ingredient.benefits.join(' • ')}</p>
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

            <TabsContent value="benefits" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Wellness Benefits</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {product.healthBenefits?.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span className="capitalize">{benefit.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
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

        {/* Recommendations */}
        <div className="mt-16">
          <RecommendationsWidget 
            productId={product.id}
            category={product.category}
            limit={4}
          />
        </div>
      </div>
    </div>
  );
}
