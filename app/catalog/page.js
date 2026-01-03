'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import EnhancedProductCard from '@/components/EnhancedProductCard';
import ProductCard from '@/components/ProductCard';
import InfoBoardProductCard from '@/components/InfoBoardProductCard';
import HealthBenefitFilters from '@/components/HealthBenefitFilters';
import FitQuiz from '@/components/FitQuiz';
import { Sparkles, Filter, Grid, List, Loader2, Droplets, Heart, Award, Search, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import AnalyticsSystem from '@/lib/analytics';
import Link from 'next/link';
import { SkeletonProductGrid } from '@/components/SkeletonProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  enrichProductWithHealthBenefits, 
  filterProductsByHealthBenefit,
  getHealthBenefitCounts 
} from '@/lib/health-benefits';

export default function CatalogPage() {
  const searchParams = useSearchParams();
  const infoMode = searchParams.get('mode') === 'info';
  
  const [showQuiz, setShowQuiz] = useState(false);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedHealthBenefit, setSelectedHealthBenefit] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [useEnhanced, setUseEnhanced] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const searchInputRef = useRef(null);
  
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
          // Enrich products with health benefit data
          const enrichedProducts = data.products.map(enrichProductWithHealthBenefits);
          setProducts(enrichedProducts);
          setFilteredProducts(enrichedProducts);
          setCategories(data.categories || []);
          // Store categories for stable reference during future loads
          prevCategoriesRef.current = data.categories || [];
          logger.debug(`✅ Loaded ${enrichedProducts.length} products from ${data.source}`);
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

  // Search functionality
  const performSearch = useCallback((query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    
    const searchTerm = query.toLowerCase().trim();
    const results = products.filter(product => {
      const name = (product.name || '').toLowerCase();
      const description = (product.description || '').toLowerCase();
      const category = (product.intelligentCategory || product.category || '').toLowerCase();
      const ingredients = (product.ingredients || []).map(i => 
        typeof i === 'string' ? i.toLowerCase() : (i.name || '').toLowerCase()
      ).join(' ');
      const benefits = (product.benefits || []).join(' ').toLowerCase();
      
      return (
        name.includes(searchTerm) ||
        description.includes(searchTerm) ||
        category.includes(searchTerm) ||
        ingredients.includes(searchTerm) ||
        benefits.includes(searchTerm)
      );
    });
    
    // Sort results: exact name matches first, then starts with, then contains
    results.sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const aExact = aName === searchTerm;
      const bExact = bName === searchTerm;
      const aStarts = aName.startsWith(searchTerm);
      const bStarts = bName.startsWith(searchTerm);
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Prioritize products with images
      const aHasImage = a.image && !a.image.startsWith('data:');
      const bHasImage = b.image && !b.image.startsWith('data:');
      if (aHasImage && !bHasImage) return -1;
      if (!aHasImage && bHasImage) return 1;
      
      return aName.localeCompare(bName);
    });
    
    setSearchResults(results);
  }, [products]);
  
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
    
    // Reset category filter when searching
    if (query.trim().length >= 2) {
      setSelectedFilter('all');
    }
  };
  
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    searchInputRef.current?.focus();
  };

  const filterProducts = (filter) => {
    setSelectedFilter(filter);
    
    // Clear search when changing category
    setSearchQuery('');
    setSearchResults(null);
    
    // Prevent filtering during loading to avoid empty flashes
    if (loading || products.length === 0) return;
    
    let result = products;
    
    // Apply health benefit filter if set
    if (selectedHealthBenefit !== 'all') {
      result = filterProductsByHealthBenefit(result, selectedHealthBenefit);
    }
    
    // Apply category filter
    if (filter !== 'all') {
      result = result.filter(p => p.intelligentCategory === filter);
    }
    
    setFilteredProducts(result);
  };
  
  // Health benefit filter handler
  const handleHealthBenefitChange = (benefitId) => {
    setSelectedHealthBenefit(benefitId);
    setSearchQuery('');
    setSearchResults(null);
    
    if (loading || products.length === 0) return;
    
    let result = products;
    
    // Apply health benefit filter
    if (benefitId !== 'all') {
      result = filterProductsByHealthBenefit(result, benefitId);
    }
    
    // Apply category filter if set
    if (selectedFilter !== 'all') {
      result = result.filter(p => p.intelligentCategory === selectedFilter);
    }
    
    setFilteredProducts(result);
  };
  
  // Get health benefit counts
  const healthBenefitCounts = useMemo(() => {
    return getHealthBenefitCounts(products);
  }, [products]);

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
          {/* Mode Badge & Info Toggle */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Badge className="bg-emerald-600 text-white px-4 py-2 text-sm">
                <Sparkles className="h-4 w-4 mr-2 inline" />
                {loading ? 'Loading...' : `${products.length} Premium Products`}
              </Badge>
              
              {!infoMode && (
                <Link href="/catalog?mode=info">
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-4 py-2 text-sm cursor-pointer hover:bg-blue-200 transition-colors">
                    <Info className="h-4 w-4 mr-2 inline" />
                    Info Board Mode
                  </Badge>
                </Link>
              )}
              
              {infoMode && (
                <Link href="/catalog">
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-4 py-2 text-sm cursor-pointer hover:bg-emerald-200 transition-colors">
                    <Sparkles className="h-4 w-4 mr-2 inline" />
                    Full Catalog Mode
                  </Badge>
                </Link>
              )}
            </div>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-4">Discover Your Wellness</h1>
            <p className="text-xl text-emerald-700 max-w-3xl mx-auto mb-2">
              Premium Wildcrafted Sea Moss Products
            </p>
            <p className="text-lg text-emerald-600 max-w-2xl mx-auto mb-8">
              Each product is hand-crafted with 92 essential minerals from the ocean, designed to support your unique wellness journey
            </p>
            
            {/* Personalized Quiz CTA - Hidden in info mode */}
            {!infoMode && (
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
            )}
            
            {/* Info Mode Banner */}
            {infoMode && (
              <Card className="max-w-2xl mx-auto bg-blue-50 border-blue-200">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Info className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-semibold text-blue-800">Info Board Mode</h3>
                  </div>
                  <p className="text-blue-600">
                    Explore products by wellness goals. Filter by health benefits to find what supports your journey.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Fit Quiz Modal - Hidden in info mode */}
          {showQuiz && !infoMode && (
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
          {/* Search Bar */}
          <div className="mb-8">
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products, ingredients, or benefits..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-12 pr-12 py-3 text-base rounded-full border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 shadow-sm"
                  aria-label="Search products"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              {searchResults !== null && (
                <div className="mt-2 text-center">
                  <span className="text-sm text-emerald-600">
                    {searchResults.length === 0 
                      ? `No products found for "${searchQuery}"` 
                      : `Found ${searchResults.length} product${searchResults.length === 1 ? '' : 's'} for "${searchQuery}"`
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Health Benefit Filters - Wellness Goal Filtering */}
          <div className="mb-8 bg-white rounded-xl p-6 shadow-sm border border-emerald-100">
            <HealthBenefitFilters
              benefitCounts={healthBenefitCounts}
              selectedBenefit={selectedHealthBenefit}
              onBenefitChange={handleHealthBenefitChange}
              totalProducts={products.length}
            />
          </div>
          
          {/* Category Filters and View Options */}
          <div className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-4">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
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
            {!isInitialLoad && searchResults === null && (
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
            (() => {
              // Determine which products to display
              const displayProducts = searchResults !== null ? searchResults : filteredProducts;
              
              return (
                <>
                  <div className={`grid gap-8 ${
                    viewMode === 'grid' 
                      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                      : 'grid-cols-1 lg:grid-cols-2'
                  }`}>
                    {displayProducts.map((product) => {
                      // In info mode, use InfoBoardProductCard (no selling UI)
                      // Otherwise use EnhancedProductCard or ProductCard
                      if (infoMode) {
                        return (
                          <InfoBoardProductCard
                            key={product.id}
                            product={product}
                          />
                        );
                      }
                      
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

                  {displayProducts.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-lg mb-4">
                        {searchResults !== null 
                          ? `No products found for "${searchQuery}". Try a different search term.`
                          : 'No products found for this category.'
                        }
                      </p>
                      <Button 
                        onClick={() => {
                          clearSearch();
                          filterProducts('all');
                        }} 
                        variant="outline"
                      >
                        Show All Products
                      </Button>
                    </div>
                  )}
                </>
              );
            })()
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
