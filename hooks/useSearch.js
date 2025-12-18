'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * useSearch - Custom hook for product search functionality
 * 
 * Features:
 * - Fetches products from /api/products
 * - Filters by name match (case-insensitive)
 * - Returns { results, loading, search, error }
 */
export function useSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const productsCache = useRef(null);

  const fetchProducts = useCallback(async () => {
    if (productsCache.current) {
      return productsCache.current;
    }

    try {
      const response = await fetch('/api/products', {
        next: { revalidate: 300 }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data = await response.json();
      const products = data.products || [];
      productsCache.current = products;
      return products;
    } catch (err) {
      console.error('Failed to fetch products:', err);
      throw err;
    }
  }, []);

  const search = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setError(null);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const products = await fetchProducts();
      const searchTerm = query.toLowerCase().trim();
      
      const filtered = products.filter(product => {
        const name = (product.name || '').toLowerCase();
        const description = (product.description || '').toLowerCase();
        const category = (product.category || '').toLowerCase();
        
        return (
          name.includes(searchTerm) ||
          description.includes(searchTerm) ||
          category.includes(searchTerm)
        );
      });

      const sorted = filtered.sort((a, b) => {
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        const aStartsWith = aName.startsWith(searchTerm);
        const bStartsWith = bName.startsWith(searchTerm);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return aName.localeCompare(bName);
      });

      setResults(sorted.slice(0, 8));
      return sorted.slice(0, 8);
    } catch (err) {
      setError('Failed to search products');
      setResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchProducts]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults
  };
}

export default useSearch;
