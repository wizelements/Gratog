/**
 * 🚀 Gratog Pay Flow — Product Feed
 * Scrollable product grid with category filtering
 * Optimized for fast vertical swiping
 */

'use client';

import { useMemo } from 'react';
import { usePayFlowUI, usePayFlowInventory } from '@/lib/pay-flow/store';
import { ProductCard } from './ProductCard';
import { cn } from '@/lib/utils';

export function ProductFeed() {
  const { activeCategory, searchQuery, isStaffMode } = usePayFlowUI();
  const { products } = usePayFlowInventory();
  
  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Category filter
    if (activeCategory !== 'all') {
      filtered = filtered.filter(p => p.category === activeCategory);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.ingredients.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    
    // Staff mode: show all, Customer mode: available only
    if (!isStaffMode) {
      filtered = filtered.filter(p => p.available && p.stockQuantity > 0);
    }
    
    return filtered;
  }, [products, activeCategory, searchQuery, isStaffMode]);
  
  // Group by category for "all" view
  const groupedProducts = useMemo(() => {
    if (activeCategory !== 'all') return null;
    
    const groups: Record<string, typeof filteredProducts> = {};
    filteredProducts.forEach(product => {
      if (!groups[product.category]) groups[product.category] = [];
      groups[product.category].push(product);
    });
    return groups;
  }, [filteredProducts, activeCategory]);
  
  if (filteredProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <span className="text-6xl mb-4">🥤</span>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No drinks available</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          {searchQuery 
            ? "No products match your search. Try different keywords." 
            : "We're temporarily sold out. Check back soon!"}
        </p>
      </div>
    );
  }
  
  // Single category view - simple grid
  if (activeCategory !== 'all') {
    return (
      <div className="p-3">
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    );
  }
  
  // All categories view - grouped by category
  return (
    <div className="pb-24">
      {groupedProducts && Object.entries(groupedProducts).map(([category, items]) => (
        <section key={category} className="mb-6">
          <div className="sticky top-[60px] z-10 bg-white/95 backdrop-blur-sm px-3 py-2 border-y border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              {category.replace('-', ' ')}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 p-3">
            {items.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
