const DEBUG = process.env.DEBUG === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EnhancedProductCard from '@/components/EnhancedProductCard';
import ProductCard from '@/components/ProductCard';
import FitQuiz from '@/components/FitQuiz';
import { Sparkles, Filter, Grid, List, Loader2, Droplets, Heart, Award, Leaf } from 'lucide-react';
import { toast } from 'sonner';
import AnalyticsSystem from '@/lib/analytics';
import Link from 'next/link';
import { SkeletonProductGrid } from '@/components/SkeletonProductCard';

export default function CatalogPage() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [useEnhanced, setUseEnhanced] = useState(true);

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
          debug(`✅ Loaded ${data.products.length} products from ${data.source}`);
          debug(`📊 Categories:`, data.categories?.map(c => `${c.name} (${c.count})`));
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
    } else {
      // Filter by intelligent category
      setFilteredProducts(products.filter(p => p.intelligentCategory === filter));
    }
  };

  // Use intelligent categories from API or fallback to static
  const productCategories = categories.length > 0 
    ? [
        { id: 'all', label: 'All Products', count: products.length, icon: '✨' },
        ...categories.map(cat => ({
          id: cat.name,
          label: cat.name,
          count: cat.count,
          icon: cat.icon
        }))
      ]
    : [
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
                  className={`${
                    selectedFilter === category.id 
                      ? "bg-emerald-600 hover:bg-emerald-700" 
                      : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  {category.icon && <span className="mr-2">{category.icon}</span>}
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
              Showing {filteredProducts.length} of {products.length} products
              {selectedFilter === 'recommended' && (
                <span className="text-emerald-600 font-medium"> - Recommended for you</span>
              )}
            </p>
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

      {/* Storytelling Section - Why Choose Us */}
      {!loading && !showQuiz && (
        <section className="py-20 bg-gradient-to-b from-white to-emerald-50">
          <div className="container">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-emerald-600 text-white px-4 py-2">
                <Heart className="mr-2 h-4 w-4" />
                The Taste of Gratitude Difference
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Why Our Customers Choose Us
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                More than just products - a commitment to your wellness
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <CardContent className="p-8 text-center">
                  <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Droplets className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">100% Wildcrafted</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Never pool-grown or farmed. Our sea moss is harvested from pristine Atlantic waters, ensuring maximum mineral content and authentic ocean nutrition.
                  </p>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                    92 Essential Minerals
                  </Badge>
                </CardContent>
              </Card>

              <Card className="hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <CardContent className="p-8 text-center">
                  <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Award className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">Hand-Crafted Quality</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Every jar is made in small batches with meticulous care. We hand-select each strand, ensuring only the finest sea moss makes it to your table.
                  </p>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                    Artisan Process
                  </Badge>
                </CardContent>
              </Card>

              <Card className="hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <CardContent className="p-8 text-center">
                  <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">Community First</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Join 15,000+ customers who've transformed their wellness. Our community-focused approach means you're never alone on your journey.
                  </p>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                    4.9★ Rating
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Ingredient Spotlight */}
      {!loading && !showQuiz && (
        <section className="py-20 bg-white">
          <div className="container max-w-5xl">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-emerald-600 text-white px-4 py-2">
                <Leaf className="mr-2 h-4 w-4" />
                Power Ingredients
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Nature's Finest Ingredients
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Each ingredient is carefully selected for maximum wellness benefits
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8">
                <div className="text-5xl mb-4">🌊</div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Sea Moss</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  The ocean's superfood containing 92 of 102 essential minerals. Supports immune function, thyroid health, digestion, and provides natural energy. Rich in iodine, potassium, calcium, and vitamins.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Immune Support</Badge>
                  <Badge variant="secondary">Thyroid Health</Badge>
                  <Badge variant="secondary">Energy Boost</Badge>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8">
                <div className="text-5xl mb-4">🫐</div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Elderberry</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Powerful antioxidant-rich berry known for immune-boosting properties. Packed with vitamins A, B, and C. Traditional remedy used for centuries to support respiratory health and overall wellness.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Antioxidants</Badge>
                  <Badge variant="secondary">Vitamin C</Badge>
                  <Badge variant="secondary">Immune Defense</Badge>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8">
                <div className="text-5xl mb-4">🍋</div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Fresh Lemon</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Bursting with vitamin C and alkalizing properties. Supports digestive health, aids detoxification, and adds refreshing flavor. Natural antibacterial and anti-inflammatory benefits.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Vitamin C</Badge>
                  <Badge variant="secondary">Detox Support</Badge>
                  <Badge variant="secondary">Digestive Aid</Badge>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-8">
                <div className="text-5xl mb-4">🌶️</div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Cayenne</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Metabolism-boosting spice rich in capsaicin. Supports circulation, aids digestion, and provides natural energy. Anti-inflammatory properties promote overall wellness and vitality.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Metabolism</Badge>
                  <Badge variant="secondary">Circulation</Badge>
                  <Badge variant="secondary">Energy</Badge>
                </div>
              </div>
            </div>

            <div className="text-center mt-12">
              <p className="text-gray-600 mb-4">Want to learn more about our ingredients?</p>
              <Link href="/about">
                <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                  <Leaf className="mr-2 h-4 w-4" />
                  About Our Process
                </Button>
              </Link>
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
