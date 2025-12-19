'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EnhancedProductCard from '@/components/EnhancedProductCard';
import ProductCard from '@/components/ProductCard';
import FitQuiz from '@/components/FitQuiz';
import { Sparkles, Filter, Grid, List, Loader2, Droplets, Heart, Award } from 'lucide-react';
import { toast } from 'sonner';
import AnalyticsSystem from '@/lib/analytics';
import Link from 'next/link';
import { SkeletonProductGrid } from '@/components/SkeletonProductCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function CatalogPage() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [useEnhanced, setUseEnhanced] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Keep stable reference to previous categories during loading
  const prevCategoriesRef = useRef([]);

  // Fetch products from Unified Intelligent API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/products'); // Uses unified by default
        const data = await response.json();
        
        if (data.success && data.products) {
          setProducts(data.products);
          setFilteredProducts(data.products);
          setCategories(data.categories || []);
          // Store categories for stable reference during future loads
          prevCategoriesRef.current = data.categories || [];
          logger.debug(`✅ Loaded ${data.products.length} products from ${data.source}`);
          logger.debug(`📊 Categories:`, data.categories?.map(c => `${c.name} (${c.count})`));
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        toast.error('Failed to load products. Please refresh the page.');
      } finally {
        setLoading(false);
        setIsInitialLoad(false);
      }
    };
    
    fetchProducts();
    AnalyticsSystem.initPostHog();
  }, []);

  const handleCheckout = async (items) => {
    try {
      // Redirect to order page for Square checkout flow
      window.location.href = '/order';
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    }
  };

  const handleAddToCart = (product) => {
    toast.success(`${product.name} added to cart!`);
    AnalyticsSystem.trackPDPView(product.id);
    setTimeout(() => {
      window.location.href = '/order';
    }, 1000);
  };

  const handleQuizRecommendations = (recommendations) => {
    // Highlight recommended products
    setFilteredProducts(recommendations.length > 0 ? recommendations : products);
    setSelectedFilter('recommended');
    setShowQuiz(false);
    toast.success(`Found ${recommendations.length} perfect matches for you!`);
  };

  const filterProducts = (filter) => {
    setSelectedFilter(filter);
    
    // Prevent filtering during loading to avoid empty flashes
    if (loading || products.length === 0) return;
    
    if (filter === 'all') {
      setFilteredProducts(products);
    } else {
      // Filter by intelligent category
      setFilteredProducts(products.filter(p => p.intelligentCategory === filter));
    }
  };

  // Use intelligent categories from API or fallback to static
  // Use stable reference during loading to prevent count flicker
  const productCategories = useMemo(() => {
    // During initial load, return skeleton placeholder
    if (isInitialLoad) {
      return [
        { id: 'all', label: 'All Products', count: null, icon: '✨', isLoading: true },
        { id: 'skeleton-1', label: 'Category', count: null, isLoading: true },
        { id: 'skeleton-2', label: 'Category', count: null, isLoading: true },
      ];
    }
    
    // Use previous categories during refresh to prevent flicker
    const stableCategories = loading && prevCategoriesRef.current.length > 0 
      ? prevCategoriesRef.current 
      : categories;
    
    const stableProducts = loading && products.length === 0 
      ? [] 
      : products;
    
    if (stableCategories.length > 0) {
      return [
        { id: 'all', label: 'All Products', count: stableProducts.length, icon: '✨' },
        ...stableCategories.map(cat => ({
          id: cat.name,
          label: cat.name,
          count: cat.count,
          icon: cat.icon
        }))
      ];
    }
    
    return [
      { id: 'all', label: 'All Products', count: stableProducts.length },
      { id: 'gels', label: 'Sea Moss Gels', count: stableProducts.filter(p => p.category === 'gel').length },
      { id: 'lemonades', label: 'Lemonades', count: stableProducts.filter(p => p.category === 'lemonade').length },
      { id: 'shots', label: 'Wellness Shots', count: stableProducts.filter(p => p.category === 'shot').length },
    ];
  }, [categories, products, loading, isInitialLoad]);

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-emerald-50 to-teal-50 py-16">
        <div className="container">
          {/* Square Integration Badge */}
          <div className="text-center mb-8">
            <Badge className="bg-emerald-600 text-white px-4 py-2 text-sm mb-4">
              <Sparkles className="h-4 w-4 mr-2 inline" />
              {loading ? 'Loading...' : `${products.length} Premium Products`} Available with Square Checkout
            </Badge>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-4">Discover Your Wellness</h1>
            <p className="text-xl text-emerald-700 max-w-3xl mx-auto mb-2">
              Premium Wildcrafted Sea Moss Products
            </p>
            <p className="text-lg text-emerald-600 max-w-2xl mx-auto mb-8">
              Each product is hand-crafted with 92 essential minerals from the ocean, designed to support your unique wellness journey
            </p>
            
            {/* Personalized Quiz CTA */}
            <Card className="max-w-2xl mx-auto bg-white/80 backdrop-blur-sm border-emerald-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                  <h3 className="text-xl font-semibold text-emerald-800">Not sure where to start?</h3>
                </div>
                <p className="text-emerald-600 mb-4">
                  Take our 60-second wellness quiz for personalized product recommendations
                </p>
                <Button 
                  onClick={() => setShowQuiz(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Take the Quiz
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Fit Quiz Modal */}
          {showQuiz && (
            <div className="mb-12">
              <FitQuiz 
                onRecommendations={handleQuizRecommendations}
                onAddToCart={handleAddToCart}
              />
              <div className="text-center mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowQuiz(false)}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  Browse All Products Instead
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Product Catalog */}
      <section className="py-16">
        <div className="container">
          {/* Filters and View Options */}
          <div className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-4">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {productCategories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedFilter === category.id ? "default" : "outline"}
                  onClick={() => filterProducts(category.id)}
                  disabled={category.isLoading}
                  className={`transition-all duration-200 ${
                    selectedFilter === category.id 
                      ? "bg-emerald-600 hover:bg-emerald-700" 
                      : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  } ${category.isLoading ? "opacity-70" : ""}`}
                >
                  {category.icon && <span className="mr-2">{category.icon}</span>}
                  {category.label}{' '}
                  {category.isLoading ? (
                    <Skeleton className="inline-block h-4 w-6 ml-1 rounded bg-emerald-200/50" />
                  ) : (
                    <span className="transition-opacity duration-200">({category.count})</span>
                  )}
                </Button>
              ))}
              {selectedFilter === 'recommended' && (
                <Badge className="bg-yellow-100 text-yellow-700 px-3 py-1">
                  ✨ Personalized for You
                </Badge>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Results Header */}
          <div className="mb-6 h-6">
            {!isInitialLoad && (
              <p className="text-muted-foreground text-sm">
                {selectedFilter === 'recommended' ? (
                  <span className="text-emerald-600 font-medium">✨ Personalized recommendations for you</span>
                ) : selectedFilter === 'all' ? (
                  <span>{products.length} products</span>
                ) : (
                  <span>{filteredProducts.length} products in {selectedFilter}</span>
                )}
              </p>
            )}
          </div>

          {/* Loading State */}
          {loading && <SkeletonProductGrid count={6} />}

          {/* Products Grid */}
          {!loading && (
            <>
              <div className={`grid gap-8 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1 lg:grid-cols-2'
              }`}>
                {filteredProducts.map((product) => {
                  // Use EnhancedProductCard if product has ingredient data
                  const CardComponent = product.ingredients && useEnhanced 
                    ? EnhancedProductCard 
                    : ProductCard;
                  
                  return (
                    <CardComponent
                      key={product.id}
                      product={product}
                      onCheckout={handleCheckout}
                      viewMode={viewMode}
                      isRecommended={selectedFilter === 'recommended'}
                    />
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg mb-4">No products found for this category.</p>
                  <Button onClick={() => filterProducts('all')} variant="outline">
                    Show All Products
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Trust Indicators - Compact inline section */}
      {!loading && !showQuiz && (
        <section className="py-12 bg-emerald-50/50 border-y border-emerald-100">
          <div className="container">
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-center">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center">
                  <Droplets className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">100% Wildcrafted</p>
                  <p className="text-sm text-gray-600">92 Essential Minerals</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Hand-Crafted</p>
                  <p className="text-sm text-gray-600">Small Batch Quality</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center">
                  <Heart className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">15,000+ Customers</p>
                  <p className="text-sm text-gray-600">4.9★ Average Rating</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      {!loading && !showQuiz && (
        <section className="py-20 bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
          <div className="container text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Wellness?
            </h2>
            <p className="text-xl mb-8 text-emerald-100 max-w-2xl mx-auto">
              Join thousands experiencing the power of wildcrafted sea moss
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={() => setShowQuiz(true)}
                size="lg"
                className="h-14 px-8 text-lg bg-white text-emerald-600 hover:bg-emerald-50 shadow-2xl hover:scale-105 transition-all"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Take the Quiz
              </Button>
              <Link href="/contact">
                <Button 
                  variant="outline"
                  size="lg"
                  className="h-14 px-8 text-lg border-white text-white hover:bg-white/10"
                >
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
