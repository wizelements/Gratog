'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, AlertCircle, X, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * Enhanced search component with autocomplete, fuzzy matching, and beautiful UI
 */
export default function SearchEnhanced({
  onSearch,
  onSelect,
  placeholder = 'Search products...',
  showSuggestions = true,
  className = '',
  variant = 'default'
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchTimeout = useRef(null);

  // Fetch suggestions
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    setLoading(true);

    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search/enhanced?q=${encodeURIComponent(query)}&suggestions=true`
        );
        const data = await response.json();

        if (data.success && data.suggestions) {
          setSuggestions(data.suggestions.slice(0, 5));
          setShowDropdown(true);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
        setError('Failed to load suggestions');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout.current);
  }, [query]);

  // Handle search submission
  const handleSearch = useCallback(async (searchQuery = query) => {
    if (searchQuery.length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setShowDropdown(false);

    try {
      const response = await fetch(
        `/api/search/enhanced?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (data.success) {
        setResults(data);
        onSearch?.(data);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to perform search');
    } finally {
      setLoading(false);
    }
  }, [query, onSearch]);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setSuggestions([]);
    setShowDropdown(false);
    handleSearch(suggestion);
    onSelect?.(suggestion);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0) {
          handleSuggestionClick(suggestions[activeIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const variantClasses = {
    default: 'border-emerald-200 focus:border-emerald-500',
    compact: 'text-sm border-gray-300',
    large: 'text-lg h-12'
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && suggestions.length > 0 && setShowDropdown(true)}
          className={`pl-10 pr-10 ${variantClasses[variant]} transition-all`}
          aria-label="Search products"
        />
        
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setShowDropdown(false);
              setResults(null);
              setError(null);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {loading && query && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-emerald-200 rounded-lg shadow-lg z-50 overflow-hidden"
        >
          <div className="max-h-64 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-100 last:border-b-0 ${
                  activeIndex === index
                    ? 'bg-emerald-50 text-emerald-900'
                    : 'hover:bg-gray-50 text-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Display */}
      {results && results.results && results.results.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">
              Found <span className="font-semibold text-emerald-600">{results.count}</span> results
            </p>
            <p className="text-xs text-gray-500">
              {results.executionTime}ms
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {results.results.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug || product.id}`}
                className="p-3 border border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition group"
              >
                <div className="flex gap-3">
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate group-hover:text-emerald-700">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {product.description}
                    </p>
                    {product.price && (
                      <p className="text-sm font-semibold text-emerald-600 mt-1">
                        ${(product.price / 100).toFixed(2)}
                      </p>
                    )}
                  </div>
                  {product.relevance > 0 && (
                    <div className="flex-shrink-0 flex items-end">
                      <span className="text-xs text-emerald-600 font-semibold">
                        {Math.round(product.relevance)}%
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {results && results.count === 0 && (
        <div className="mt-4 p-6 text-center bg-gray-50 rounded-lg border border-gray-200">
          <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 mb-2">No products found for "{query}"</p>
          <p className="text-xs text-gray-500">Try different keywords or browse our categories</p>
        </div>
      )}

      {/* Empty State */}
      {!query && !results && (
        <div className="mt-4 p-6 text-center bg-emerald-50 rounded-lg border border-emerald-200">
          <Search className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-emerald-900 font-medium">Start searching</p>
          <p className="text-sm text-emerald-700">Type at least 2 characters to find products</p>
        </div>
      )}
    </div>
  );
}
