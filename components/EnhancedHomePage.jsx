'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import FloatingCart from '@/components/FloatingCart';
import QuickAddButton from '@/components/QuickAddButton';
import { QuickViewButton } from '@/components/ProductQuickView';
import { ArrowRight, Sparkles, Star, TrendingUp, Zap, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function EnhancedHomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch featured products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        
        if (data.success && data.products) {
          // Get first 6 products as featured
          setFeaturedProducts(data.products.slice(0, 6));
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Floating Cart Component */}
      <FloatingCart />

      {/* Hero Section - Full Width Image with Overlay */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?w=1920&h=600&fit=crop"
            alt="Wellness Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 via-emerald-800/80 to-teal-900/90" />
        </div>

        {/* Content */}
        <div className="relative z-10 container text-center text-white">
          <Badge className="mb-6 bg-white/20 backdrop-blur-sm text-white border-white/30 px-6 py-2 text-lg">
            <Sparkles className="mr-2 h-5 w-5" />
            29 Premium Products Available
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Wildcrafted Sea Moss
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">
              Wellness Journey
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 text-emerald-100 max-w-3xl mx-auto">
            Hand-crafted, nutrient-rich sea moss products. From our ocean to your table with 92 essential minerals.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => window.location.href = '/catalog'}
              size="lg"
              className="h-14 px-8 text-lg bg-white text-emerald-600 hover:bg-emerald-50 shadow-2xl hover:scale-105 transition-all"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Shop All Products
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button
              onClick={() => document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' })}
              size="lg"
              variant="outline"
              className="h-14 px-8 text-lg border-white text-white hover:bg-white/10 backdrop-blur-sm"
            >
              View Featured
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-300" />
              <span>100% Natural</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
              <span>Premium Quality</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-300" />
              <span>Fast Shipping</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section id="featured" className="py-20 bg-gradient-to-b from-white to-emerald-50">
        <div className="container">
          {/* Section Header */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-emerald-600 text-white px-4 py-2">
              <TrendingUp className="mr-2 h-4 w-4" />
              Most Popular
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Featured Products
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover our customer favorites - hand-selected for maximum wellness benefits
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600" />
            </div>
          )}

          {/* Products Grid */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {featuredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="group overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                >
                  <CardContent className="p-0">
                    {/* Product Image */}
                    <div className="relative h-64 bg-gradient-to-br from-emerald-100 to-teal-100 overflow-hidden">
                      {product.image || product.images?.[0] ? (
                        <img
                          src={product.image || product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="h-16 w-16 text-emerald-600" />
                        </div>
                      )}
                      
                      {/* Quick View Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                        <QuickViewButton product={product} className="bg-white" />
                        <QuickAddButton product={product} variant="icon" className="bg-emerald-600" />
                      </div>

                      {/* Badge */}
                      <Badge className="absolute top-4 left-4 bg-emerald-600 text-white">
                        <Star className="h-3 w-3 mr-1 fill-white" />
                        Best Seller
                      </Badge>
                    </div>

                    {/* Product Info */}
                    <div className="p-6">
                      {/* Category */}
                      <p className="text-sm text-emerald-600 font-medium mb-2">
                        {product.category === 'gel' ? 'Sea Moss Gel' : 
                         product.category === 'lemonade' ? 'Lemonade' :
                         product.category === 'shot' ? 'Wellness Shot' :
                         'Premium Product'}
                      </p>

                      {/* Name */}
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                        {product.name}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {product.description || 'Premium wildcrafted sea moss product, rich in essential minerals for optimal wellness.'}
                      </p>

                      {/* Rating */}
                      <div className="flex items-center gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 text-yellow-500 fill-yellow-500"
                          />
                        ))}
                        <span className="text-sm text-gray-600 ml-1">(124)</span>
                      </div>

                      {/* Price & Button */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-3xl font-bold text-emerald-600">
                            ${product.price.toFixed(2)}
                          </span>
                        </div>
                        
                        <QuickAddButton product={product} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* View All Button */}
          <div className="text-center">
            <Button
              onClick={() => window.location.href = '/catalog'}
              size="lg"
              className="h-14 px-8 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              View All {!loading && featuredProducts.length > 0 ? '29' : ''} Products
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: '100% Natural & Wildcrafted',
                description: 'Sourced from pristine waters, our sea moss is never farmed or pool-grown'
              },
              {
                icon: Zap,
                title: '92 Essential Minerals',
                description: 'Nature\'s multivitamin packed with everything your body needs to thrive'
              },
              {
                icon: Star,
                title: 'Premium Quality Guaranteed',
                description: 'Every jar is hand-crafted with care and tested for purity and potency'
              }
            ].map((benefit, index) => (
              <Card key={index} className="text-center p-8 hover:shadow-xl transition-shadow">
                <CardContent className="p-0">
                  <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <benefit.icon className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
        <div className="container text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Start Your Wellness Journey?
          </h2>
          <p className="text-xl mb-8 text-emerald-100 max-w-2xl mx-auto">
            Join thousands of satisfied customers experiencing the power of wildcrafted sea moss
          </p>
          <Button
            onClick={() => window.location.href = '/catalog'}
            size="lg"
            className="h-14 px-8 text-lg bg-white text-emerald-600 hover:bg-emerald-50 shadow-2xl hover:scale-105 transition-all"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Shop Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  );
}
