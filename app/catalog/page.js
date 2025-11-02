'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProductCard from '@/components/ProductCard';
import FitQuiz from '@/components/FitQuiz';
import { Sparkles, Filter, Grid, List, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AnalyticsSystem from '@/lib/analytics';

export default function CatalogPage() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);

  // Fetch products from Square catalog API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/products');
        const data = await response.json();
        
        if (data.success && data.products) {
          setProducts(data.products);
          setFilteredProducts(data.products);
          console.log(`✅ Loaded ${data.products.length} products from ${data.source}`);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        toast.error('Failed to load products. Please refresh the page.');
      } finally {
        setLoading(false);
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
    
    if (filter === 'all') {
      setFilteredProducts(products);
    } else if (filter === 'gels') {
      setFilteredProducts(products.filter(p => p.category === 'gel'));
    } else if (filter === 'lemonades') {
      setFilteredProducts(products.filter(p => p.category === 'lemonade'));
    } else if (filter === 'shots') {
      setFilteredProducts(products.filter(p => p.category === 'shot'));
    } else if (filter === 'bundles') {
      setFilteredProducts(products.filter(p => p.name.toLowerCase().includes('bundle') || p.name.toLowerCase().includes('trio')));
    }
  };

  const productCategories = [
    { id: 'all', label: 'All Products', count: products.length },
    { id: 'gels', label: 'Sea Moss Gels', count: products.filter(p => p.category === 'gel').length },
    { id: 'lemonades', label: 'Lemonades', count: products.filter(p => p.category === 'lemonade').length },
    { id: 'shots', label: 'Wellness Shots', count: products.filter(p => p.category === 'shot').length },
  ];

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
            <h1 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-4">Our Products</h1>
            <p className="text-lg text-emerald-600 max-w-2xl mx-auto mb-8">
              Explore our full collection of premium sea moss products, each uniquely crafted to support your wellness journey
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
                  className={`${
                    selectedFilter === category.id 
                      ? "bg-emerald-600 hover:bg-emerald-700" 
                      : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  {category.label} ({category.count})
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
          <div className="mb-6">
            <p className="text-muted-foreground">
              Showing {filteredProducts.length} of {PRODUCTS.length} products
              {selectedFilter === 'recommended' && (
                <span className="text-emerald-600 font-medium"> - Recommended for you</span>
              )}
            </p>
          </div>

          {/* Products Grid */}
          <div className={`grid gap-8 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1 lg:grid-cols-2'
          }`}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onCheckout={handleCheckout}
                viewMode={viewMode}
                isRecommended={selectedFilter === 'recommended'}
              />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">No products found for this category.</p>
              <Button onClick={() => filterProducts('all')} variant="outline">
                Show All Products
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
