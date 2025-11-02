'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getProductBySlug } from '@/lib/products';
import { ArrowLeft, ShoppingCart, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import ProductReviews from '@/components/ProductReviews';
import { IngredientsShowcase } from '@/components/ingredients/IngredientsShowcase';
import { getProductIngredients, hasIngredientsData } from '@/data/ingredients/product-ingredients-map';
import { IngredientsSchema } from '@/components/IngredientsSchema';

export default function ProductDetailPage() {
  const params = useParams();
  const product = getProductBySlug(params.slug);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get ingredients data for this product
  const ingredients = hasIngredientsData(params.slug) ? getProductIngredients(params.slug) : [];
  const hasIngredients = ingredients.length > 0;

  if (!product) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <Button asChild>
          <Link href="/catalog">Back to Catalog</Link>
        </Button>
      </div>
    );
  }

  const handleBuyNow = async () => {
    setIsLoading(true);
    try {
      // Redirect to order page for Square checkout flow
      window.location.href = '/order';
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8">
      {/* Schema.org structured data for SEO */}
      {hasIngredients && (
        <IngredientsSchema
          productName={product.name}
          productDescription={product.description}
          productPrice={product.price}
          productImage={product.image}
          ingredients={ingredients}
          productUrl={`https://gratitude-ecom.preview.emergentagent.com/product/${params.slug}`}
        />
      )}

      <Button asChild variant="ghost" className="mb-6">
        <Link href="/catalog">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Catalog
        </Link>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Product Image */}
        <div className="relative h-[500px] rounded-lg overflow-hidden">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Product Details */}
        <div className="flex flex-col">
          <div className="mb-6 animate-slide-up">
            {product.featured && (
              <Badge className="mb-2 bg-[#D4AF37] hover:bg-[#B8941F] shadow-md">
                ⭐ Featured Product
              </Badge>
            )}
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-gradient-gold">
              {product.name}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-4">
              {product.subtitle}
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-bold text-[#D4AF37]">
                ${product.price.toFixed(2)}
              </span>
              <span className="text-lg text-muted-foreground">/ {product.size}</span>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              In Stock
            </div>
          </div>

          <Card className="p-6 mb-6 border-2 hover:border-[#D4AF37]/30 transition-colors animate-scale-in">
            <p className="text-base sm:text-lg leading-relaxed">{product.description}</p>
          </Card>

          {/* Benefits */}
          <div className="mb-6 animate-slide-up">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#D4AF37] rounded" />
              Key Benefits
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {product.benefits?.map((benefit, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-[#D4AF37]/10 transition-colors"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                    <Check className="h-4 w-4 text-[#D4AF37]" />
                  </div>
                  <span className="text-sm font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ingredients */}
          <div className="mb-6 animate-slide-up">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#D4AF37] rounded" />
              Ingredients
            </h3>
            <Card className="p-4 bg-muted/30">
              <p className="text-muted-foreground leading-relaxed">
                {product.ingredients?.join(' • ')}
              </p>
            </Card>
          </div>

          {/* Buy Button */}
          <div className="space-y-3 animate-scale-in">
          <Button
            size="lg"
            onClick={handleBuyNow}
            disabled={isLoading}
            className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-white text-lg py-6 btn-shine shadow-lg hover:shadow-xl transition-all"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {isLoading ? 'Processing...' : 'Add to Cart & Checkout'}
          </Button>
          
          {product.squareProductUrl && (
            <Button
              size="lg"
              onClick={() => window.open(product.squareProductUrl, '_blank')}
              variant="outline"
              className="w-full border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-lg py-6"
            >
              <span className="mr-2">🛒</span>
              Buy Directly on Square
            </Button>
          )}
          
          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-500" />
              <span>Secure Checkout</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-500" />
              <span>Fast Shipping</span>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Tabbed Content Section */}
      <div className="mt-16">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px] mx-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {hasIngredients && (
              <TabsTrigger value="ingredients">Ingredients Deep Dive</TabsTrigger>
            )}
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-8">
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-gradient-gold">About This Product</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {product.description}
                </p>
                
                {/* Simple ingredients list */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">What's Inside</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.ingredients?.map((ingredient, index) => (
                      <Badge key={index} variant="outline" className="text-sm px-3 py-1">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Benefits */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">Key Benefits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {product.benefits?.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Check className="h-5 w-5 text-[#D4AF37] flex-shrink-0" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {hasIngredients && (
            <TabsContent value="ingredients" className="mt-8">
              <IngredientsShowcase 
                ingredients={ingredients}
                productName={product.name}
                accentColor="from-[#D4AF37] to-amber-600"
              />
            </TabsContent>
          )}

          <TabsContent value="reviews" className="mt-8">
            <ProductReviews productId={product.id} productName={product.name} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
