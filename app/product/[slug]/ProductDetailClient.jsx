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
import { track } from '@/utils/analytics';
import RetentionForm from '@/components/RetentionForm';
import { getActiveProducts, getProductBySlugOrId } from '@/data/products';

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
  const checkoutReady = product?.checkoutReady !== false;
  const isMarketOnly = Boolean(
    product?.marketPickupOnly ||
    product?.preorderOnly ||
    product?.isPreorder ||
    product?.fulfillmentType === 'market_pickup' ||
    product?.fulfillmentType === 'market_pickup_only'
  );
  const showMarketLeadCapture = Boolean(product) && (!checkoutReady || isMarketOnly);
  const canAddToCart = Boolean(product) && checkoutReady && !isMarketOnly;
  const preorderSource = encodeURIComponent(product?.slug || product?.id || slug || 'product_detail');
  const preorderHref = `/preorder?utm_source=product_${preorderSource}&utm_campaign=passive_preorder_funnel`;
  const productCategoryLabel = product?.categoryLabel || product?.displayCategory || product?.category || product?.intelligentCategory || 'Weekly market item';

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

  useEffect(() => {
    if (!product?.id && !product?.slug) return;

    track('product_view', {
      productId: product.id || product.slug,
      productName: product.name,
      category: product.category || product.intelligentCategory,
    });
  }, [product?.id, product?.slug, product?.name, product?.category, product?.intelligentCategory]);

  useEffect(() => {
    if (!showMarketLeadCapture || (!product?.id && !product?.slug)) return;

    track('product_lead_capture_shown', {
      productId: product.id || product.slug,
      productName: product.name,
      category: product.category || product.intelligentCategory,
      checkoutReady,
      isMarketOnly,
    });
  }, [showMarketLeadCapture, product?.id, product?.slug, product?.name, product?.category, product?.intelligentCategory, checkoutReady, isMarketOnly]);

  // Cart functionality
  const handleAddToCart = async () => {
    if (!canAddToCart) {
      toast.message('This item is handled through market pickup.', {
        description: product?.checkoutUnavailableReason || 'Join weekly texts or reserve through the market preorder flow.',
      });
      return;
    }

    const variationToAdd = selectedVariation || product.variations?.[0] || {
      id: product.variationId || product.squareVariationId || product.id,
      name: product.size || 'Default',
      price: product.price,
      priceCents: product.priceCents,
      sku: product.sku,
    };
    
    if (product.stock <= 0 && !product.isPreorder) {
      toast.error('This product is currently out of stock');
      return;
    }

    try {
      setIsAdding(true);
      const result = addToCart(product, variationToAdd, quantity);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to add to cart. Please try again.');
      }
      track('product_add_to_cart', {
        productId: product.id || product.slug,
        productName: product.name,
        category: product.category || product.intelligentCategory,
        quantity,
        variation: variationToAdd.name,
      });
      toast.success(`Added ${quantity} ${variationToAdd.name || ''} ${product.name} to cart`);
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
  const schemaAvailability = stockStatus === 'preorder'
    ? 'https://schema.org/PreOrder'
    : stockStatus === 'in_stock'
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';
  const flavorNotes =
    product.flavorNotes ||
    product.tastingNotes ||
    product.flavorProfile ||
    product.shortDescription ||
    product.description ||
    'Small-batch sea moss gel with a smooth chilled texture and naturally simple ingredients.';
  const fullDescription =
    product.fullDescription ||
    product.productStory ||
    product.story ||
    product.description;
  const storageGuidance =
    product.storageInstructions ||
    product.careInstructions ||
    'Keep refrigerated. Use a clean spoon each time and follow the freshness window on the label.';
  const pickupGuidance = product.isPreorder
    ? 'Preorder items are made for your selected pickup date. Choose your market and pickup day during checkout.'
    : 'Choose market pickup or eligible local delivery during checkout. Pickup details are confirmed before payment.';
  const routineUse =
    product.recommendedUse ||
    product.howToUse ||
    product.usageInstructions ||
    'Add 1–2 tablespoons to smoothies, tea, juices, bowls, or recipes. Start simple and build it into the routine you already enjoy.';
  const productStory =
    product.productStory ||
    product.story ||
    `This product is part of Taste of Gratitude's weekly small-batch rhythm: simple ingredients, careful prep, and a calmer way to bring market-made wellness into your routine.`;
  const intendedUse =
    product.intendedUse ||
    (Array.isArray(product.wellnessSupport) && product.wellnessSupport.length > 0 ? product.wellnessSupport.join(', ') : '') ||
    'Best for customers who want an approachable, ingredient-forward product that feels easy to use throughout the week.';
  const customerQuote = product.customerQuote || product.testimonial || '“You can tell it is made with care — it feels fresh, real, and easy to come back to.”';
  const wellnessSupport = Array.isArray(product.wellnessSupport) ? product.wellnessSupport : [];
  const allergens = Array.isArray(product.allergens) ? product.allergens.filter(Boolean) : [];
  const pickupInfo = product.pickupAvailability || pickupGuidance;
  const shippingInfo = product.shippingAvailability || 'Eligible items and shipping fees are confirmed before payment.';
  const pairingProducts = (Array.isArray(product.pairings) ? product.pairings : [])
    .map((id) => getProductBySlugOrId(id))
    .filter(Boolean)
    .slice(0, 3);
  const relatedProducts = pairingProducts.length > 0
    ? pairingProducts
    : getActiveProducts().filter((item) => item.slug !== product.slug).slice(0, 3);
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
    <div className="min-h-screen bg-[#fbfaf7] pb-24 lg:pb-0">
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
            availability: schemaAvailability,
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
                {productCategoryLabel}
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
            <div className="space-y-3 text-base text-gray-700 leading-relaxed">
              <p>{product.description}</p>
              {fullDescription && fullDescription !== product.description && <p>{fullDescription}</p>}
            </div>

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
            {canAddToCart && (
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
            )}

            {/* Actions */}
            <div>
              {canAddToCart ? (
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
              ) : (
                <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div>
                    <p className="font-semibold text-amber-950">Made for weekly market pickup.</p>
                    <p className="mt-2 text-sm leading-6 text-amber-900">
                      {product.checkoutUnavailableReason || 'This item works best through the weekly menu and market preorder rhythm. Get the menu text first, then reserve when your pickup window opens.'}
                    </p>
                  </div>
                  <RetentionForm
                    intent="weekly_menu_texts"
                    source={`product_${product.slug || product.id}`}
                    title="Text me when this week’s menu drops"
                    description="Get the market menu, pickup reminder, and reservation link before the next batch closes."
                    cta="Text me the menu"
                    collectEmail={false}
                    collectPhone
                    metadata={{
                      productId: product.id || product.slug,
                      productName: product.name,
                      category: product.category || product.intelligentCategory,
                      sourceCampaign: 'passive_preorder_funnel',
                    }}
                    compact
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button asChild className="h-11 rounded-full bg-emerald-700 text-white hover:bg-emerald-800">
                      <Link
                        href={preorderHref}
                        onClick={() => track('product_preorder_click', { productId: product.id || product.slug, productName: product.name, source: 'product_market_fallback' })}
                      >
                        Reserve for pickup
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-11 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                      <Link href="/markets">View markets</Link>
                    </Button>
                  </div>
                </div>
              )}
              {canAddToCart ? (
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
              ) : (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <Link href="/markets" className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-900 hover:bg-emerald-100">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden="true" />
                    <span>Ask at the next market pickup</span>
                  </Link>
                  <Link href="/quiz" className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-900 hover:bg-emerald-100">
                    <RefreshCw className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden="true" />
                    <span>Find an available backup</span>
                  </Link>
                </div>
              )}
              {canAddToCart && (
                <div className="mt-4">
                <RetentionForm
                  intent="weekly_menu_texts"
                  source={`product_${product.slug || product.id}`}
                  title="Want the next menu drop?"
                  description="Join weekly texts for limited-batch reminders and pickup updates."
                  cta="Join weekly texts"
                  collectEmail={false}
                  collectPhone
                  metadata={{
                    productId: product.id || product.slug,
                    productName: product.name,
                    category: product.category || product.intelligentCategory,
                    sourceCampaign: 'passive_preorder_funnel',
                  }}
                  compact
                />
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">What to expect</h3>
              <div className="space-y-3 text-base text-gray-700 leading-relaxed">
                <p>{flavorNotes}</p>
                {wellnessSupport.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {wellnessSupport.map((support) => (
                      <span key={support} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                        {support}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pickup, Delivery & Shipping Info */}
            <div className="flex items-start gap-3 text-sm text-gray-600">
              <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Pickup, Delivery & Shipping</p>
                <p>{pickupInfo}</p>
                <p className="mt-1">
                  {shippingInfo}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid gap-3 sm:grid-cols-3 mt-6">
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="font-semibold text-gray-900">How to use</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {routineUse}
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="font-semibold text-gray-900">What it supports</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {intendedUse}
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="font-semibold text-gray-900">Keep fresh</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {product.storageInstructions || product.careInstructions || 'Keep refrigerated. Use a clean spoon each time.'}
            </p>
          </div>
        </div>

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <Card className="rounded-2xl border-stone-200 bg-white shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Product story</p>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950">Made to feel clear, useful, and real.</h2>
              <p className="mt-4 text-base leading-8 text-stone-700">{productStory}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="font-semibold text-stone-950">Why it exists</p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">To make weekly wellness feel simple, flavorful, and rooted in a real market experience.</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="font-semibold text-stone-950">Routine fit</p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">Use it chilled, mix it into what you already drink, or keep it ready for a quick daily spoonful.</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="font-semibold text-stone-950">Freshness promise</p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">Prepared in small batches with storage guidance and fulfillment expectations shown before payment.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-emerald-100 bg-emerald-50 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">Market note</p>
              <blockquote className="mt-4 text-xl font-medium leading-8 text-emerald-950">{customerQuote}</blockquote>
              <p className="mt-4 text-sm text-emerald-800">Real customer language varies by market and review availability; this section keeps social proof visible even while verified reviews load.</p>
            </CardContent>
          </Card>
        </section>

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
                  <div className="mt-6 rounded-xl bg-stone-50 p-4 text-sm text-stone-700">
                    <p className="font-semibold text-stone-950">Allergens & sensitivities</p>
                    <p className="mt-1">{allergens.length > 0 ? allergens.join(', ') : 'No major allergens listed for this product.'}</p>
                  </div>
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
                    <h3 className="text-lg font-semibold mb-2">How to use</h3>
                    <p className="text-gray-700 leading-relaxed">{routineUse}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Pickup, delivery, and shipping</h3>
                    <p className="text-gray-700 leading-relaxed">{pickupInfo}</p>
                    <p className="mt-2 text-gray-700 leading-relaxed">{shippingInfo}</p>
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

        <section className="mt-12 rounded-2xl bg-emerald-50 p-6">
          <div className="mb-5 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Pairs well with</p>
            <h2 className="mt-2 text-2xl font-semibold text-gray-900">Build a weekly routine around this product.</h2>
            <p className="mt-2 text-gray-600">These pairings come from the curated weekly market product source.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {relatedProducts.map((related) => (
              <Link key={related.id} href={`/product/${related.slug}`} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <p className="text-sm font-semibold text-stone-950">{related.name}</p>
                <p className="mt-1 text-xs leading-5 text-stone-600">{related.shortDescription}</p>
                <p className="mt-3 text-sm font-bold text-emerald-800">${related.price.toFixed(2)}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <a href={`/catalog?category=${encodeURIComponent(product.category || 'all')}`}
               className="inline-block rounded-full bg-emerald-700 px-6 py-3 text-white font-semibold hover:bg-emerald-800">
              View Similar Products
            </a>
          </div>
        </section>

      </div>

      {/* Mobile Sticky Add-to-Cart Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-900/10 bg-white/95 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-2xl backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
            <p className="text-sm font-bold text-emerald-700">${displayPrice?.toFixed?.(2) || '0.00'}</p>
          </div>
          {canAddToCart ? (
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className="h-12 rounded-full bg-emerald-700 px-6 text-white font-semibold hover:bg-emerald-800 disabled:opacity-50"
            >
              {isAdding ? 'Adding...' : 'Add to Cart'}
            </button>
          ) : (
            <Link
              href={preorderHref}
              onClick={() => track('product_preorder_click', { productId: product.id || product.slug, productName: product.name, source: 'product_mobile_sticky' })}
              className="h-12 rounded-full bg-emerald-700 px-6 py-3 text-center font-semibold text-white hover:bg-emerald-800"
            >
              Reserve
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
