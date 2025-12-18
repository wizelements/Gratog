'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import Image from 'next/image';
import { useSearch } from '@/hooks/useSearch';

const RECENT_SEARCHES_KEY = 'tog_recent_searches';
const MAX_RECENT_SEARCHES = 5;

/**
 * SearchAutocomplete - Search input with autocomplete dropdown
 * 
 * Features:
 * - Debounced search (300ms)
 * - Dropdown with matching products (name, image, price)
 * - Recent searches (stored in localStorage)
 * - "No results" helpful suggestions
 * - Keyboard navigation (up/down arrows, enter to select)
 * - Click outside to close
 */
export default function SearchAutocomplete({
  onSelect,
  placeholder = 'Search products...',
  className = ''
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);
  
  const { results, loading, search, clearResults } = useSearch();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed to load recent searches:', err);
      }
    }
  }, []);

  const saveRecentSearch = useCallback((searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) return;
    
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== searchTerm.toLowerCase());
      const updated = [searchTerm, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save recent searches:', err);
      }
      
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (err) {
      console.error('Failed to clear recent searches:', err);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        search(query);
      }, 300);
    } else {
      clearResults();
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, search, clearResults]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((product) => {
    saveRecentSearch(product.name);
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
    clearResults();
    onSelect?.(product);
  }, [saveRecentSearch, clearResults, onSelect]);

  const handleRecentSearch = useCallback((term) => {
    setQuery(term);
    search(term);
  }, [search]);

  const handleKeyDown = useCallback((e) => {
    const items = results.length > 0 ? results : (query.length < 2 ? recentSearches : []);
    const itemCount = items.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev < itemCount - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < itemCount) {
          if (results.length > 0) {
            handleSelect(results[activeIndex]);
          } else if (query.length < 2 && recentSearches.length > 0) {
            handleRecentSearch(recentSearches[activeIndex]);
          }
        } else if (query.trim().length >= 2) {
          saveRecentSearch(query);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  }, [results, recentSearches, query, activeIndex, handleSelect, handleRecentSearch, saveRecentSearch]);

  const handleFocus = () => {
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleClear = () => {
    setQuery('');
    clearResults();
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return '';
    const numPrice = typeof price === 'number' ? price : parseFloat(price);
    if (numPrice > 100) {
      return `$${(numPrice / 100).toFixed(2)}`;
    }
    return `$${numPrice.toFixed(2)}`;
  };

  const showDropdown = isOpen && (
    results.length > 0 ||
    (query.length < 2 && recentSearches.length > 0) ||
    (query.length >= 2 && !loading && results.length === 0)
  );

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="pl-10 pr-10 h-10 border-gray-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
          aria-label="Search products"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          autoComplete="off"
        />
        
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4AF37] animate-spin" />
        )}
        
        {!loading && query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
          role="listbox"
        >
          {results.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              {results.map((product, index) => (
                <Link
                  key={product.id || index}
                  href={`/products/${product.slug || product.id}`}
                  onClick={() => handleSelect(product)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors border-b border-gray-100 last:border-b-0 ${
                    activeIndex === index
                      ? 'bg-[#D4AF37]/10'
                      : 'hover:bg-gray-50'
                  }`}
                  role="option"
                  aria-selected={activeIndex === index}
                >
                  {product.image && (
                    <div className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {product.name}
                    </p>
                    {product.category && (
                      <p className="text-xs text-gray-500 truncate">
                        {product.category}
                      </p>
                    )}
                  </div>
                  {(product.price || product.priceCents) && (
                    <span className="text-sm font-semibold text-[#D4AF37] flex-shrink-0">
                      {formatPrice(product.priceCents || product.price)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {query.length < 2 && recentSearches.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Recent Searches
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((term, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleRecentSearch(term)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-b-0 ${
                    activeIndex === index
                      ? 'bg-[#D4AF37]/10'
                      : 'hover:bg-gray-50'
                  }`}
                  role="option"
                  aria-selected={activeIndex === index}
                >
                  <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{term}</span>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="p-6 text-center">
              <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                No products found for "{query}"
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Try searching for:</p>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {['Sea Moss', 'Lemonade', 'Gel', 'Juice'].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setQuery(suggestion);
                        search(suggestion);
                      }}
                      className="px-2 py-1 bg-gray-100 hover:bg-[#D4AF37]/10 rounded text-gray-600 hover:text-[#D4AF37] transition-colors"
                    >
                      <TrendingUp className="h-3 w-3 inline mr-1" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
