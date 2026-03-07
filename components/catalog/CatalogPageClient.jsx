'use client';

import { useState, useEffect, useRef, useMemo, Suspense, startTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import EnhancedProductCard from '@/components/EnhancedProductCard';
import ProductCard from '@/components/ProductCard';
import InfoBoardProductCard from '@/components/InfoBoardProductCard';
import HealthBenefitFilters from '@/components/HealthBenefitFilters';
import FitQuiz from '@/components/FitQuiz';
import { Sparkles, Grid, List, Droplets, Heart, Award, Search, X, Info, SlidersHorizontal } from 'lucide-react';
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

export default function CatalogPage({ initialProducts = [], initialCategories = [] }) {
  return (
    <Suspense fallback={<CatalogLoadingFallback />}>
      <CatalogContent initialProducts={initialProducts} initialCategories={initialCategories} />
    </Suspense>
  );
}

function CatalogLoadingFallback() {
  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-emerald-50 to-teal-50 py-16">
        <div className="container text-center">
          <Skeleton className="h-8 w-48 mx-auto mb-4" />
          <Skeleton className="h-12 w-96 mx-auto mb-4" />
          <Skeleton className="h-6 w-80 mx-auto" />
        </div>
      </section>
      <section className="py-16">
        <div className="container">
          <SkeletonProductGrid count={6} />
        </div>
      </section>
    </div>
  );
}

function CatalogContent({ initialProducts = [], initialCategories = [] } = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const infoMode = searchParams?.get('mode') === 'info';
  
  // Core state - minimal and clean
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  
  // Filter inputs (single source of truth)
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedHealthBenefit, setSelectedHealthBenefit] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendedIds, setRecommendedIds] = useState(null);
  
  // UI state
  const [showQuiz, setShowQuiz] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  const searchInputRef = useRef(null);

  // Fetch products once on mount with timeout
  useEffect(() => {
    if (initialProducts.length > 0) {
      AnalyticsSystem.initPostHog();
      return;
    }

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8sec timeout
        
        const response = await fetch('/api/products', {
          signal: controller.signal,
          cache: 'no-store'
        });
        clearTimeout(timeout);
        const data = await response.json();
        
        if (data.success && data.products) {
          const enrichedProducts = data.products.map(enrichProductWithHealthBenefits);
          startTransition(() => {
            setProducts(enrichedProducts);
            setCategories(data.categories || []);
          });
          logger.debug(`✅ Loaded ${enrichedProducts.length} products from ${data.source}`);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        // Don't show error toast on timeout - show empty state instead
        if (error.name !== 'AbortError') {
          toast.error('Failed to load products. Please refresh the page.');
        }
        startTransition(() => {
          setProducts([]);
          setCategories([]);
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
    AnalyticsSystem.initPostHog();
  }, [initialProducts]);

  // Derived: Health benefit counts (memoized)
  const healthBenefitCounts = useMemo(() => {
    return getHealthBenefitCounts(products);
  }, [products]);

  // Derived: Display products (single source of filtering truth)
  const displayProducts = useMemo(() => {
    if (!products.length) return [];

    let result = products;

    // Quiz recommendations take priority
    if (recommendedIds) {
      result = result.filter(p => recommendedIds.has(p.id));
    } else {
      // Health benefit filter
      if (selectedHealthBenefit !== 'all') {
        result = filterProductsByHealthBenefit(result, selectedHealthBenefit);
      }

      // Category filter
      if (selectedCategory !== 'all') {
        result = result.filter(p => p.intelligentCategory === selectedCategory);
      }
    }

    // Search filter (works on top of other filters)
    const term = searchQuery.toLowerCase().trim();
    if (term.length >= 2) {
      result = result.filter(product => {
        const name = (product.name || '').toLowerCase();
        const description = (product.description || '').toLowerCase();
        const category = (product.intelligentCategory || product.category || '').toLowerCase();
        const ingredients = (product.ingredients || [])
          .map(i => typeof i === 'string' ? i.toLowerCase() : (i.name || '').toLowerCase())
          .join(' ');
        const benefits = (product.benefits || []).join(' ').toLowerCase();

        return (
          name.includes(term) ||
          description.includes(term) ||
          category.includes(term) ||
          ingredients.includes(term) ||
          benefits.includes(term)
        );
      });

      // Sort search results by relevance
      result.sort((a, b) => {
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();

        if (aName === term) return -1;
        if (bName === term) return 1;
        if (aName.startsWith(term) && !bName.startsWith(term)) return -1;
        if (!aName.startsWith(term) && bName.startsWith(term)) return 1;

        const aHasImage = a.image && !a.image.startsWith('data:');
        const bHasImage = b.image && !b.image.startsWith('data:');
        if (aHasImage && !bHasImage) return -1;
        if (!aHasImage && bHasImage) return 1;

        return aName.localeCompare(bName);
      });
    }

    return result;
  }, [products, selectedCategory, selectedHealthBenefit, searchQuery, recommendedIds]);

  // Derived: Category list for UI
  const productCategories = useMemo(() => {
    if (loading) {
      return [
        { id: 'all', label: 'All Products', count: null, icon: '✨', isLoading: true },
        { id: 'skeleton-1', label: 'Category', count: null, isLoading: true },
        { id: 'skeleton-2', label: 'Category', count: null, isLoading: true },
      ];
    }
    
    if (categories.length > 0) {
      return [
        { id: 'all', label: 'All Products', count: products.length, icon: '✨' },
        ...categories.map(cat => ({
          id: cat.name,
          label: cat.name,
          count: cat.count,
          icon: cat.icon
        }))
      ];
    }
    
    return [
      { id: 'all', label: 'All Products', count: products.length },
      { id: 'gels', label: 'Sea Moss Gels', count: products.filter(p => p.category === 'gel').length },
      { id: 'lemonades', label: 'Lemonades', count: products.filter(p => p.category === 'lemonade').length },
      { id: 'shots', label: 'Wellness Shots', count: products.filter(p => p.category === 'shot').length },
    ];
  }, [categories, products, loading]);

  // Derived: Check if any filters are active
  const hasActiveFilters = selectedCategory !== 'all' || selectedHealthBenefit !== 'all' || searchQuery || recommendedIds;
  const activeFilterCount = Number(selectedCategory !== 'all') + Number(selectedHealthBenefit !== 'all') + Number(!!searchQuery) + Number(!!recommendedIds);
  const isSearchMode = searchQuery.trim().length >= 2;
  const displayCount = displayProducts.length;

  // Handlers - clean and simple
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setRecommendedIds(null);
  };

  const handleHealthBenefitChange = (benefitId) => {
    setSelectedHealthBenefit(benefitId);
    setRecommendedIds(null);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedHealthBenefit('all');
    setSearchQuery('');
    setRecommendedIds(null);
  };

  const handleQuizRecommendations = (recommendations) => {
    if (recommendations.length > 0) {
      setRecommendedIds(new Set(recommendations.map(p => p.id)));
      toast.success(`Found ${recommendations.length} perfect matches for you!`);
    }
    setShowQuiz(false);
  };

  const handleCheckout = () => {
    router.push('/order');
  };

  const handleAddToCart = (product) => {
    toast.success(`${product.name} added to cart!`);
    AnalyticsSystem.trackPDPView(product.id);
    setTimeout(() => router.push('/order'), 1000);
  };

  // Get label for active health benefit
  const activeHealthBenefitLabel = healthBenefitCounts.find(b => b.id === selectedHealthBenefit)?.label || selectedHealthBenefit;

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-emerald-50 to-teal-50 py-16">
        <div className="container">
          {/* Mode Badge */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Badge className="bg-emerald-600 text-white px-4 py-2 text-sm">
                <Sparkles className="h-4 w-4 mr-2 inline" aria-hidden="true" />
                Premium Wellness Collection
              </Badge>
              
              {!infoMode ? (
                <Link href="/catalog?mode=info">
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-4 py-2 text-sm cursor-pointer hover:bg-blue-200 transition-colors">
                    <Info className="h-4 w-4 mr-2 inline" aria-hidden="true" />
                    Info Board Mode
                  </Badge>
                </Link>
              ) : (
                <Link href="/catalog">
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-4 py-2 text-sm cursor-pointer hover:bg-emerald-200 transition-colors">
                    <Sparkles className="h-4 w-4 mr-2 inline" aria-hidden="true" />
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
              Each product is hand-crafted with 92 essential minerals from the ocean
            </p>
            
            {/* Quiz CTA */}
            {!infoMode && !showQuiz && (
              <Card className="max-w-2xl mx-auto bg-white/80 backdrop-blur-sm border-emerald-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Sparkles className="w-6 h-6 text-emerald-600" aria-hidden="true" />
                    <h3 className="text-xl font-semibold text-emerald-800">Not sure where to start?</h3>
                  </div>
                  <p className="text-emerald-600 mb-4">
                    Take our 60-second wellness quiz for personalized recommendations
                  </p>
                  <Button 
                    onClick={() => setShowQuiz(true)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
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
                    <Info className="w-6 h-6 text-blue-600" aria-hidden="true" />
                    <h3 className="text-xl font-semibold text-blue-800">Info Board Mode</h3>
                  </div>
                  <p className="text-blue-600">
                    Explore products by wellness goals. Filter by health benefits to find what supports your journey.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quiz Modal */}
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
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
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
            </div>
          </div>
          
          {/* Active Filters - Airbnb-style chips */}
          {hasActiveFilters && (
            <div className="bg-emerald-50 p-4 rounded-lg mb-6 border border-emerald-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-sm text-gray-600 font-medium">Active:</span>
                  
                  {recommendedIds && (
                    <Badge className="bg-yellow-200 text-yellow-800 flex items-center gap-1">
                      ✨ Quiz Recommendations
                      <button
                        onClick={() => setRecommendedIds(null)}
                        className="ml-1 hover:text-yellow-600"
                        aria-label="Clear quiz recommendations"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {selectedCategory !== 'all' && !recommendedIds && (
                    <Badge className="bg-emerald-200 text-emerald-800 flex items-center gap-1">
                      {selectedCategory}
                      <button
                        onClick={() => handleCategoryChange('all')}
                        className="ml-1 hover:text-emerald-600"
                        aria-label="Remove category filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {selectedHealthBenefit !== 'all' && !recommendedIds && (
                    <Badge className="bg-blue-200 text-blue-800 flex items-center gap-1">
                      {activeHealthBenefitLabel}
                      <button
                        onClick={() => handleHealthBenefitChange('all')}
                        className="ml-1 hover:text-blue-600"
                        aria-label="Remove wellness filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {searchQuery && (
                    <Badge className="bg-purple-200 text-purple-800 flex items-center gap-1">
                      "{searchQuery}"
                      <button
                        onClick={clearSearch}
                        className="ml-1 hover:text-purple-600"
                        aria-label="Clear search"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Clear all
                </Button>
              </div>
            </div>
          )}

          {/* Health Benefit Filters */}
          <div className="mb-8 bg-white rounded-xl p-6 shadow-sm border border-emerald-100">
            <HealthBenefitFilters
              benefitCounts={healthBenefitCounts}
              selectedBenefit={selectedHealthBenefit}
              onBenefitChange={handleHealthBenefitChange}
            />
          </div>
          
          {/* Category Filters + View Toggle */}
          <div className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-4">
            <div 
              className="flex flex-wrap gap-2 justify-center lg:justify-start"
              role="radiogroup"
              aria-label="Filter by category"
            >
              {productCategories.map((category) => (
                <Button
                  key={category.id}
                  role="radio"
                  aria-checked={selectedCategory === category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  onClick={() => handleCategoryChange(category.id)}
                  disabled={category.isLoading}
                  className={`transition-all duration-200 ${
                    selectedCategory === category.id 
                      ? "bg-emerald-600 hover:bg-emerald-700" 
                      : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  } ${category.isLoading ? "opacity-70" : ""}`}
                >
                  {category.icon && <span className="mr-2" aria-hidden="true">{category.icon}</span>}
                  {category.label}
                </Button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2" role="group" aria-label="View mode">
              <Button
                variant={viewMode === 'grid' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                aria-label="Grid view"
              >
                <Grid className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant={viewMode === 'list' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                aria-label="List view"
              >
                <List className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Results Counter */}
          {!loading && (hasActiveFilters || displayCount !== products.length) && (
            <div className="mb-6 p-4 bg-emerald-50 rounded-lg flex items-center justify-between" aria-live="polite">
              <div className="text-sm text-emerald-700">
                {recommendedIds ? (
                  <span>✨ Showing <strong>{displayCount}</strong> personalized recommendations</span>
                ) : isSearchMode ? (
                  <span>Showing <strong>{displayCount}</strong> results for &ldquo;{searchQuery}&rdquo;</span>
                ) : hasActiveFilters ? (
                  <span>Showing <strong>{displayCount}</strong> of {products.length} products</span>
                ) : displayCount === 0 ? (
                  <span>No products match your filters</span>
                ) : null}
              </div>
              {displayCount > 0 && displayCount <= 3 && hasActiveFilters && (
                <span className="text-xs text-amber-600 font-medium">
                  ⚠️ Only a few options — try adjusting filters
                </span>
              )}
            </div>
          )}

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
                {displayProducts.map((product) => {
                  if (infoMode) {
                    return (
                      <InfoBoardProductCard
                        key={product.id}
                        product={product}
                      />
                    );
                  }
                  
                  const CardComponent = product.ingredients ? EnhancedProductCard : ProductCard;
                  
                  return (
                    <CardComponent
                      key={product.id}
                      product={product}
                      onCheckout={handleCheckout}
                      viewMode={viewMode}
                      isRecommended={!!recommendedIds}
                    />
                  );
                })}
              </div>

              {displayCount === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg mb-4">
                    {isSearchMode 
                      ? `No products found for "${searchQuery}". Try a different search term.`
                      : 'No products match your filters.'
                    }
                  </p>
                  <Button onClick={clearAllFilters} variant="outline">
                    Show All Products
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Trust Indicators */}
      {!loading && !showQuiz && (
        <section className="py-12 bg-emerald-50/50 border-y border-emerald-100">
          <div className="container">
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-center">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center">
                  <Droplets className="h-6 w-6 text-blue-600" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">100% Wildcrafted</p>
                  <p className="text-sm text-gray-600">92 Essential Minerals</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Hand-Crafted</p>
                  <p className="text-sm text-gray-600">Small Batch Quality</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center">
                  <Heart className="h-6 w-6 text-purple-600" aria-hidden="true" />
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
                <Sparkles className="mr-2 h-5 w-5" aria-hidden="true" />
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

      {/* Mobile Filter FAB */}
      {!loading && (
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen(true)}
          className="md:hidden fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] right-4 z-50 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-white shadow-lg transition-colors hover:bg-emerald-800"
          data-widget="catalog-filters"
          aria-label="Open filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-emerald-700">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}

      {/* Mobile Bottom Sheet */}
      <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
        <SheetContent
          side="bottom"
          hideClose
          className="md:hidden h-auto max-h-[85dvh] overflow-y-auto rounded-t-2xl p-5"
          data-widget="catalog-filters-panel"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Filters</h3>
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(false)}
              className="p-2 text-gray-600 hover:text-gray-800"
              aria-label="Close filters"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-900">Wellness Goal</p>
              <HealthBenefitFilters
                benefitCounts={healthBenefitCounts}
                selectedBenefit={selectedHealthBenefit}
                onBenefitChange={(id) => {
                  handleHealthBenefitChange(id);
                }}
              />
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-gray-900">Category</p>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  handleCategoryChange(e.target.value);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              >
                {productCategories.map((category) => (
                  <option key={`mobile-${category.id}`} value={category.id}>
                    {category.icon ? `${category.icon} ` : ''}{category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  clearAllFilters();
                  setIsMobileFilterOpen(false);
                }}
                variant="outline"
                className="flex-1 border-emerald-300 text-emerald-700"
              >
                Clear All
              </Button>
              <Button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                Show {displayCount} Results
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
