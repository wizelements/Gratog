'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ShoppingCart, Check, Loader2, Star, Heart, Share2, Truck, Shield, Package, Sparkles, Droplets, Award, Users, Quote, ChevronRight, Leaf, Sun, Zap } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { addToCart } from '@/lib/cart-engine';
import RecommendationsWidget from '@/components/RecommendationsWidget';
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

export default function ProductDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [activeStory, setActiveStory] = useState(0);
  const [activeTab, setActiveTab] = useState('details');
  const [reviewSummary, setReviewSummary] = useState(DEFAULT_REVIEW_SUMMARY);
  const storyRef = useRef(null);
  
  // Scroll effect for parallax
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    document.querySelectorAll('.fade-in-section').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [product]);
  
  // Fetch product from API
  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch('/api/products', { cache: 'no-store' });
        const data = await response.json();
        
        if (data.success && data.products) {
          const foundProduct = data.products.find(p => p.slug === params.slug);
          
          // Filter out variations with invalid prices
          if (foundProduct?.variations?.length > 0) {
            foundProduct.variations = foundProduct.variations.filter(v => v.price && v.price > 0);
          }
          
          setProduct(foundProduct || null);
          
          // Set default variation to first valid one
          if (foundProduct?.variations?.length > 0) {
            setSelectedVariation(foundProduct.variations[0]);
          }
        }
      } catch (error) {
        console.error('[GratOG] Failed to fetch product:', error);
        toast.error('Failed to load product');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProduct();
  }, [params.slug]);

  useEffect(() => {
    const resolvedProductId = product?.id || product?.slug;
    if (!resolvedProductId) {
      setReviewSummary(DEFAULT_REVIEW_SUMMARY);
      return;
    }

    let isCancelled = false;

    async function fetchReviewSummary() {
      try {
        const response = await fetch(
          `/api/reviews?productId=${encodeURIComponent(resolvedProductId)}&limit=1`,
          { cache: 'no-store' }
        );
        const data = await response.json().catch(() => ({}));

        if (!isCancelled) {
          setReviewSummary(response.ok ? normalizeReviewSummary(data.summary) : DEFAULT_REVIEW_SUMMARY);
        }
      } catch (error) {
        if (!isCancelled) {
          setReviewSummary(DEFAULT_REVIEW_SUMMARY);
        }

        console.error('[GratOG] Failed to fetch review summary:', error);
      }
    }

    fetchReviewSummary();

    return () => {
      isCancelled = true;
    };
  }, [product?.id, product?.slug]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (['details', 'ingredients', 'reviews'].includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist.</p>
        <Button asChild>
          <Link href="/catalog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Catalog
          </Link>
        </Button>
      </div>
    );
  }

  const handleAddToCart = () => {
    setIsAdding(true);
    
    // Pass selectedVariation as third parameter to ensure correct variant is added
    addToCart(product, quantity, selectedVariation);
    
    toast.success(`Added ${quantity}x ${product.name} to cart!`, {
      description: selectedVariation ? `Size: ${selectedVariation.name}` : undefined,
      action: {
        label: 'View Cart',
        onClick: () => window.dispatchEvent(new CustomEvent('openCart'))
      }
    });
    
    setTimeout(() => setIsAdding(false), 1000);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: product.name,
        text: product.benefitStory || product.description,
        url: window.location.href
      });
    } catch (error) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          toast.success('Link copied to clipboard!');
        })
        .catch((err) => {
          console.warn('Clipboard write failed:', err);
          toast.error('Unable to copy link. Please copy manually from the address bar.');
        });
    }
  };

  const currentPrice = selectedVariation?.price || product.price || 0;
  const images = product.images?.length > 0 ? product.images : [product.image || PRODUCT_IMAGE_FALLBACK_SRC];
  const shouldAutoOpenReviewForm = searchParams.get('review') === '1';
  const reviewCount = Number(reviewSummary.reviewCount || 0);
  const canonicalAverageRating = Number(reviewSummary.averageRating || 0);
  const hasPublicReviews = reviewCount > 0;
  const ratingDisplayText = hasPublicReviews
    ? `${canonicalAverageRating.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'})`
    : 'No public reviews yet';

  // Enhanced structured data for SEO with rich snippets
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product?.name,
    description: product?.description || product?.benefitStory,
    image: images.map(img => img.startsWith('http') ? img : `${BASE_URL}${img}`),
    url: `${BASE_URL}/product/${product?.slug}`,
    sku: product?.id || product?.slug,
    mpn: product?.id || product?.slug,
    brand: {
      '@type': 'Brand',
      name: 'Taste of Gratitude'
    },
    category: product?.intelligentCategory || product?.category || 'Wellness Products',
    offers: product?.variations?.length > 1 ? {
      '@type': 'AggregateOffer',
      lowPrice: Math.min(...product.variations.filter(v => v.price > 0).map(v => v.price)).toFixed(2),
      highPrice: Math.max(...product.variations.filter(v => v.price > 0).map(v => v.price)).toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      offerCount: product.variations.filter(v => v.price > 0).length,
      offers: product.variations.filter(v => v.price > 0).map(variation => ({
        '@type': 'Offer',
        name: variation.name,
        price: variation.price.toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${BASE_URL}/product/${product?.slug}`,
        seller: {
          '@type': 'Organization',
          name: 'Taste of Gratitude'
        },
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }))
    } : {
      '@type': 'Offer',
      price: currentPrice.toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/product/${product?.slug}`,
      seller: {
        '@type': 'Organization',
        name: 'Taste of Gratitude'
      },
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  };

  if (hasPublicReviews) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: canonicalAverageRating.toFixed(1),
      reviewCount: String(reviewCount),
      bestRating: '5',
      worstRating: '1'
    };
  }

  // Storytelling data based on product type
  const getProductStory = () => {
    const categoryStories = {
      'gel': {
        origin: 'Harvested from the pristine Atlantic waters, each batch of our sea moss gel begins its journey in nutrient-rich ocean beds where it naturally absorbs 92 essential minerals from the sea.',
        craft: 'Our artisans hand-select each sea moss strand, ensuring only the highest quality makes it to your jar. Through a meticulous cleaning and blending process, we preserve the natural integrity and potency.',
        impact: 'Every spoonful delivers the ocean\'s wisdom to your wellness routine, supporting your immune system, thyroid health, and natural vitality.'
      },
      'lemonade': {
        origin: 'Combining wildcrafted sea moss with freshly squeezed lemons creates a refreshing elixir that bridges ancient ocean wisdom with modern taste.',
        craft: 'We infuse our premium sea moss gel with real lemon juice and natural sweeteners, creating a delicious way to experience the benefits of the sea.',
        impact: 'A perfect daily ritual that hydrates, energizes, and nourishes - transforming wellness into a moment of pure enjoyment.'
      },
      'shot': {
        origin: 'Concentrated power from the ocean, each wellness shot packs the nutritional equivalent of a full serving into one convenient, potent dose.',
        craft: 'We blend the finest sea moss with complementary superfoods, creating a synergistic formula designed for maximum absorption and effectiveness.',
        impact: 'Your daily boost in one shot - supporting immunity, energy, and overall wellness in seconds.'
      }
    };

    return categoryStories[product?.category] || categoryStories['gel'];
  };

  const story = getProductStory();

  return (
    <div className="min-h-screen">
      {/* Structured Data for Product SEO - SAFE to use dangerouslySetInnerHTML because:
          1. JSON.stringify() escapes all special characters
          2. Content is in script tag with type="application/ld+json" (not executed)
          3. Data comes from controlled productSchema object, not user input */}
      {product && (
        <Script
          id="product-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
      )}
      {/* Breadcrumb with JSON-LD schema */}
      <Breadcrumbs items={getProductBreadcrumbs(product)} />

      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div>
            {/* Main Image */}
            <div className="relative aspect-square mb-4 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 group">
              <Image
                src={images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                priority
              />
              
              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.intelligentCategory && (
                  <Badge className="bg-emerald-600">
                    {product.categoryData?.icon} {product.intelligentCategory}
                  </Badge>
                )}
                {product.featured && (
                  <Badge className="bg-yellow-500">
                    <Star className="h-3 w-3 mr-1 fill-white" />
                    Featured
                  </Badge>
                )}
              </div>
              
              {/* Actions */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full bg-white/90 backdrop-blur-sm"
                  onClick={() => setIsFavorite(!isFavorite)}
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full bg-white/90 backdrop-blur-sm"
                  onClick={handleShare}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx 
                        ? 'border-emerald-600 scale-105' 
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} view ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            
            {/* Ingredient Icons */}
            {product.ingredientIcons && product.ingredientIcons.length > 0 && (
              <Card className="mt-4 p-4">
                <h3 className="font-semibold mb-3">Key Ingredients</h3>
                <div className="flex flex-wrap gap-3">
                  {product.ingredients?.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-full">
                      <span className="text-2xl">{ing.icon}</span>
                      <span className="text-sm font-medium capitalize">{ing.name}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
            
            {/* Rating */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <span className="text-muted-foreground">{ratingDisplayText}</span>
            </div>
            
            {/* Price */}
            <div className="mb-6">
              <div className="text-4xl font-bold text-emerald-600 mb-2">
                ${currentPrice.toFixed(2)}
              </div>
              {product.priceCents && (
                <p className="text-muted-foreground">or ${(currentPrice / 4).toFixed(2)}/week with Affirm</p>
              )}
            </div>
            
            {/* Benefit Story */}
            {product.benefitStory && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 mb-6">
                <p className="text-gray-700 leading-relaxed">{product.benefitStory}</p>
              </div>
            )}
            
            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {product.tags.slice(0, 6).map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="border-emerald-600 text-emerald-700">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Variant Selection */}
            {product.variations && product.variations.length > 1 && (
              <div className="mb-6">
                <label className="block font-semibold mb-3">Select Size</label>
                <div className="grid grid-cols-3 gap-3">
                  {product.variations.map((variation) => {
                    const price = variation.price || 0;
                    if (price <= 0) return null; // Don't show variants with no price
                    
                    return (
                      <button
                        key={variation.id}
                        onClick={() => setSelectedVariation(variation)}
                        className={`p-3 border-2 rounded-lg transition-all ${
                          selectedVariation?.id === variation.id
                            ? 'border-emerald-600 bg-emerald-50'
                            : 'border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="font-semibold">{variation.name}</div>
                        <div className="text-sm text-emerald-600">${price.toFixed(2)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Quantity */}
            <div className="mb-6">
              <label className="block font-semibold mb-3">Quantity</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border-2 border-gray-200 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 hover:bg-gray-100 transition-colors"
                  >
                    -
                  </button>
                  <span className="px-6 py-2 font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 hover:bg-gray-100 transition-colors"
                  >
                    +
                  </button>
                </div>
                <span className="text-muted-foreground">Subtotal: ${(currentPrice * quantity).toFixed(2)}</span>
              </div>
            </div>
            
            {/* Add to Cart Button */}
            <div className="flex gap-3 mb-8">
              <Button
                onClick={handleAddToCart}
                disabled={isAdding}
                className="flex-1 h-14 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </>
                )}
              </Button>
              <Button variant="outline" className="h-14 px-6">
                <Heart className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Features */}
            <div className="grid grid-cols-3 gap-4 py-6 border-y">
              <div className="text-center">
                <Truck className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
                <p className="text-xs font-medium">Free Shipping</p>
                <p className="text-xs text-muted-foreground">On orders $60+</p>
              </div>
              <div className="text-center">
                <Shield className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
                <p className="text-xs font-medium">100% Natural</p>
                <p className="text-xs text-muted-foreground">Organic ingredients</p>
              </div>
              <div className="text-center">
                <Package className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
                <p className="text-xs font-medium">Fresh Daily</p>
                <p className="text-xs text-muted-foreground">Made to order</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-16">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="mt-6">
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">Product Details</h3>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {product.description || 'Premium wildcrafted sea moss product, rich in essential minerals for optimal wellness.'}
                </p>
                
                {product.categoryData && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Category: {product.intelligentCategory}</h4>
                    <p className="text-sm text-muted-foreground">{product.categoryData.description}</p>
                  </div>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="ingredients" className="mt-6">
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">Ingredient Benefits</h3>
                <div className="space-y-4">
                  {product.ingredients?.map((ing, idx) => (
                    <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-4xl">{ing.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold capitalize mb-2">{ing.name}</h4>
                        <div className="flex flex-wrap gap-2">
                          {ing.benefits?.map((benefit, bidx) => (
                            <Badge key={bidx} variant="secondary">
                              <Check className="h-3 w-3 mr-1" />
                              {benefit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-6" id="product-reviews">
              <ProductReviews
                productId={product.id || product.slug}
                productName={product.name}
                autoOpenForm={shouldAutoOpenReviewForm}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* IMMERSIVE STORYTELLING SECTIONS */}

        {/* Product Journey Story */}
        <div className="mt-20 fade-in-section opacity-0 transition-all duration-1000">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-emerald-600 text-white px-4 py-2">
              <Sparkles className="mr-2 h-4 w-4" />
              The Journey of Your {product.name}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              From Ocean to Wellness
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Every jar tells a story of nature, craftsmanship, and care
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="bg-gradient-to-br from-blue-500 to-teal-500 h-2" />
              <CardContent className="p-8">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Droplets className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">
                  1. Ocean's Gift
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {story.origin}
                </p>
                <div className="mt-6 flex items-center text-sm text-emerald-600 font-semibold">
                  <Sun className="h-4 w-4 mr-2" />
                  Wildcrafted from Nature
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 h-2" />
              <CardContent className="p-8">
                <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Award className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">
                  2. Artisan Craft
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {story.craft}
                </p>
                <div className="mt-6 flex items-center text-sm text-emerald-600 font-semibold">
                  <Heart className="h-4 w-4 mr-2" />
                  Hand-crafted with Love
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 h-2" />
              <CardContent className="p-8">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">
                  3. Your Wellness
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {story.impact}
                </p>
                <div className="mt-6 flex items-center text-sm text-emerald-600 font-semibold">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Transform Your Health
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How to Use - Visual Story */}
        <div className="mt-20 fade-in-section opacity-0 transition-all duration-1000">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <Badge className="mb-4 bg-white/20 text-white border-white/30 px-4 py-2">
                <Leaf className="mr-2 h-4 w-4" />
                Daily Wellness Ritual
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Make It Part of Your Story
              </h2>
              <p className="text-xl text-emerald-100 mb-8 max-w-2xl">
                Transform your daily routine into a wellness journey
              </p>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                  <div className="text-4xl mb-3">🌅</div>
                  <h4 className="font-bold mb-2">Morning Boost</h4>
                  <p className="text-emerald-100 text-sm">Add to smoothies or juice for an energizing start</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                  <div className="text-4xl mb-3">☕</div>
                  <h4 className="font-bold mb-2">Coffee Companion</h4>
                  <p className="text-emerald-100 text-sm">Stir into your coffee or tea for added nutrition</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                  <div className="text-4xl mb-3">🥗</div>
                  <h4 className="font-bold mb-2">Recipe Enhancer</h4>
                  <p className="text-emerald-100 text-sm">Blend into soups, sauces, or dressings</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                  <div className="text-4xl mb-3">✨</div>
                  <h4 className="font-bold mb-2">Skincare Secret</h4>
                  <p className="text-emerald-100 text-sm">Apply directly to skin as a hydrating mask</p>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <Button 
                  onClick={handleAddToCart}
                  size="lg"
                  className="bg-white text-emerald-600 hover:bg-emerald-50"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Start Your Journey
                </Button>
                <Button 
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white/10"
                >
                  <Link href="/about">
                    Learn More
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Stories - Testimonials */}
        <div className="mt-20 fade-in-section opacity-0 transition-all duration-1000">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-emerald-600 text-white px-4 py-2">
              <Users className="mr-2 h-4 w-4" />
              Real Stories, Real Results
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Join Thousands of Happy Customers
            </h2>
            <div className="flex items-center justify-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 text-yellow-500 fill-yellow-500" />
              ))}
              {hasPublicReviews ? (
                  <>
                    <span className="text-xl font-bold text-gray-900 ml-2">{canonicalAverageRating.toFixed(1)}</span>
                    <span className="text-gray-600">/ 5.0</span>
                  </>
                ) : (
                  <span className="text-gray-600 ml-2">New Product</span>
                )}
              </div>
            </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Jessica Martinez",
                role: "Wellness Coach",
                location: "Los Angeles, CA",
                story: "I've been using sea moss for 3 months and the difference is incredible! My energy levels are through the roof, my skin is glowing, and I feel healthier than ever. This is now a non-negotiable part of my morning routine.",
                image: "👩‍💼",
                result: "+300% Energy"
              },
              {
                name: "David Chen",
                role: "Fitness Enthusiast",
                location: "Austin, TX",
                story: "As an athlete, recovery is everything. Since adding this to my post-workout smoothies, I've noticed faster recovery times and better endurance. The 92 minerals really make a difference!",
                image: "🏃‍♂️",
                result: "50% Faster Recovery"
              },
              {
                name: "Amanda Williams",
                role: "Busy Mom of 3",
                location: "Seattle, WA",
                story: "Between work and kids, I needed something to support my immune system. This sea moss gel has been a game-changer! My whole family takes it now, and we've all noticed we're getting sick less often.",
                image: "👩‍👧‍👦",
                result: "Stronger Immunity"
              }
            ].map((testimonial, idx) => (
              <Card key={idx} className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
                <CardContent className="p-8 relative">
                  <Quote className="h-10 w-10 text-emerald-600 mb-4 opacity-20" />
                  <p className="text-gray-700 leading-relaxed mb-6 italic">
                    "{testimonial.story}"
                  </p>
                  
                  <div className="border-t pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{testimonial.image}</div>
                        <div>
                          <p className="font-bold text-gray-900">{testimonial.name}</p>
                          <p className="text-sm text-gray-600">{testimonial.role}</p>
                          <p className="text-xs text-gray-500">{testimonial.location}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 bg-emerald-50 rounded-lg px-4 py-2 inline-block">
                      <p className="text-sm font-bold text-emerald-700">
                        ✓ {testimonial.result}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1 mt-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">Join 15,000+ customers who've transformed their wellness</p>
            <Button 
              onClick={handleAddToCart}
              size="lg"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-14 px-8 text-lg"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Begin Your Transformation
            </Button>
          </div>
        </div>

        {/* Scientific Backing */}
        <div className="mt-20 fade-in-section opacity-0 transition-all duration-1000">
          <div className="bg-gradient-to-b from-white to-emerald-50 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-emerald-600 text-white px-4 py-2">
                <Shield className="mr-2 h-4 w-4" />
                Backed by Science
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Why It Works
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Scientific research validates what ancient cultures knew
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-100 p-3 rounded-lg">
                    <Droplets className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2 text-gray-900">92 Essential Minerals</h4>
                    <p className="text-gray-700 text-sm leading-relaxed mb-3">
                      Sea moss contains 92 of the 102 minerals that make up the human body, including calcium, magnesium, potassium, and iodine - essential for optimal cellular function.
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Peer-reviewed research
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2 text-gray-900">Immune Support</h4>
                    <p className="text-gray-700 text-sm leading-relaxed mb-3">
                      Rich in antioxidants and vitamins, sea moss has been shown to support immune function and help protect cells from oxidative stress.
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Clinical studies
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Zap className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2 text-gray-900">Thyroid Health</h4>
                    <p className="text-gray-700 text-sm leading-relaxed mb-3">
                      Natural iodine content supports healthy thyroid function, which regulates metabolism, energy levels, and hormonal balance.
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Nutritional science
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="bg-pink-100 p-3 rounded-lg">
                    <Heart className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2 text-gray-900">Gut Health</h4>
                    <p className="text-gray-700 text-sm leading-relaxed mb-3">
                      Prebiotic properties promote the growth of beneficial gut bacteria, supporting digestion and overall wellness.
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Microbiome research
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                * These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.
              </p>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {product.ingredients && product.ingredients[0] && (
          <div className="mt-20">
            <h2 className="text-3xl font-bold mb-6 text-center">Complete Your Wellness Journey</h2>
            <p className="text-gray-600 text-center mb-8">Customers who love {product.name} also enjoy these</p>
            <RecommendationsWidget 
              type="ingredient" 
              ingredient={product.ingredients[0].name}
              className=""
            />
          </div>
        )}
      </div>
    </div>
  );
}
