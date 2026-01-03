'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import InfoBoardProductCard from '@/components/InfoBoardProductCard';
import HealthBenefitFilters from '@/components/HealthBenefitFilters';
import { 
  enrichProductWithHealthBenefits, 
  filterProductsByHealthBenefit,
  getHealthBenefitCounts,
  HEALTH_BENEFIT_FILTERS
} from '@/lib/health-benefits';
import { Search, X, Sparkles, Leaf, QrCode } from 'lucide-react';

/**
 * Info Board Page
 * 
 * Kiosk-ready wellness discovery board
 * NO SELLING - Pure product information with health benefit filters
 * 
 * Features:
 * - Health benefit filtering (Immunity, Digestion, Energy, etc.)
 * - Category organization
 * - Ingredient-forward display
 * - Large, readable typography
 * - QR code for "shop later"
 */
export default function InfoBoardPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHealthBenefit, setSelectedHealthBenefit] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch and enrich products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/products');
        const data = await response.json();
        
        if (data.success && data.products) {
          // Enrich with health benefit data
          const enrichedProducts = data.products.map(enrichProductWithHealthBenefits);
          setProducts(enrichedProducts);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const categorySet = new Set();
    products.forEach(p => {
      if (p.intelligentCategory) {
        categorySet.add(p.intelligentCategory);
      }
    });
    return Array.from(categorySet);
  }, [products]);

  // Get health benefit counts
  const healthBenefitCounts = useMemo(() => {
    return getHealthBenefitCounts(products);
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = products;
    
    // Filter by health benefit
    if (selectedHealthBenefit !== 'all') {
      result = filterProductsByHealthBenefit(result, selectedHealthBenefit);
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.intelligentCategory === selectedCategory);
    }
    
    // Filter by search
    if (searchQuery.trim().length >= 2) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => {
        const searchText = [
          p.name,
          p.description,
          p.benefitStory,
          ...(p.ingredients || []).map(i => typeof i === 'object' ? i.name : i)
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchText.includes(query);
      });
    }
    
    return result;
  }, [products, selectedHealthBenefit, selectedCategory, searchQuery]);

  // Group products by category for display
  const productsByCategory = useMemo(() => {
    const grouped = {};
    filteredProducts.forEach(product => {
      const category = product.intelligentCategory || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });
    return grouped;
  }, [filteredProducts]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedHealthBenefit('all');
    setSelectedCategory('all');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Header - Kiosk Friendly */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-emerald-800">Taste of Gratitude</h1>
                <p className="text-xs text-emerald-600">Wildcrafted Sea Moss Wellness</p>
              </div>
            </div>
            
            {/* QR Code Section */}
            <div className="flex items-center gap-3 bg-emerald-50 rounded-lg px-4 py-2 border border-emerald-200">
              <QrCode className="h-8 w-8 text-emerald-600" />
              <div className="text-right">
                <p className="text-xs font-medium text-emerald-800">Scan to Shop</p>
                <p className="text-xs text-emerald-600">tasteofgratitude.shop</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Clean Info Focus */}
      <section className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-white/30 px-4 py-1.5">
            <Sparkles className="h-4 w-4 mr-2" />
            {loading ? 'Loading...' : `${products.length} Premium Products`}
          </Badge>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Discover Your Wellness Journey
          </h2>
          
          <p className="text-lg text-emerald-100 max-w-2xl mx-auto mb-6">
            Explore our wildcrafted sea moss products, each infused with 92 essential minerals.
            Filter by your wellness goals to find the perfect match.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-300" />
            <Input
              type="text"
              placeholder="Search products, ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-10 py-3 bg-white/10 border-white/30 text-white placeholder:text-emerald-200 rounded-full focus:bg-white/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-200 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Health Benefit Filters */}
      <section className="py-8 bg-white border-b border-emerald-100">
        <div className="container mx-auto px-4">
          <HealthBenefitFilters
            benefitCounts={healthBenefitCounts}
            selectedBenefit={selectedHealthBenefit}
            onBenefitChange={setSelectedHealthBenefit}
            totalProducts={products.length}
          />
        </div>
      </section>

      {/* Category Tabs */}
      <section className="py-4 bg-emerald-50/50 border-b border-emerald-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              All Categories
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Display */}
      <main className="py-12">
        <div className="container mx-auto px-4">
          {/* Results Summary */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600">
              {loading ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                <>
                  Showing <span className="font-semibold text-emerald-700">{filteredProducts.length}</span> products
                  {selectedHealthBenefit !== 'all' && (
                    <> for <span className="font-semibold">{HEALTH_BENEFIT_FILTERS[selectedHealthBenefit]?.label}</span></>
                  )}
                </>
              )}
            </p>
            
            {(selectedHealthBenefit !== 'all' || selectedCategory !== 'all' || searchQuery) && (
              <button
                onClick={clearFilters}
                className="text-sm text-emerald-600 hover:text-emerald-700 underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <Skeleton className="h-56 w-full" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Products by Category */}
          {!loading && Object.entries(productsByCategory).map(([category, categoryProducts]) => (
            <div key={category} className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{category}</h3>
                <Badge variant="secondary" className="text-sm">
                  {categoryProducts.length} products
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryProducts.map(product => (
                  <InfoBoardProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          ))}

          {/* No Results */}
          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                <Search className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
              <button
                onClick={clearFilters}
                className="text-emerald-600 hover:text-emerald-700 font-medium underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer - Minimal, Info Focused */}
      <footer className="bg-emerald-800 text-emerald-100 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Leaf className="h-5 w-5" />
            <span className="font-semibold text-white">Taste of Gratitude</span>
          </div>
          <p className="text-sm mb-4">
            Wildcrafted Sea Moss • 92 Essential Minerals • Atlanta, GA
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span>Find us at local markets</span>
            <span>•</span>
            <span>tasteofgratitude.shop</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
