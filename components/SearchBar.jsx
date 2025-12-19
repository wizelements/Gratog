'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const POPULAR_SEARCHES = [
  { query: 'Sea Moss Gel', category: 'Products' },
  { query: 'Elderberry Blend', category: 'Products' },
  { query: 'How to use sea moss', category: 'Learn' },
  { query: 'Benefits of sea moss', category: 'Learn' },
  { query: 'Shipping information', category: 'Help' },
  { query: 'Rewards program', category: 'Account' },
];

export default function SearchBar({ placeholder = 'Search products, benefits, guides...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 0) {
      const filtered = POPULAR_SEARCHES.filter(
        (item) =>
          item.query.toLowerCase().includes(value.toLowerCase()) ||
          item.category.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions(POPULAR_SEARCHES.slice(0, 5));
    }
    setIsOpen(true);
  };

  const handleSearch = (searchQuery) => {
    // Navigate to search results or catalog with query
    const encoded = encodeURIComponent(searchQuery);
    window.location.href = `/catalog?search=${encoded}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      handleSearch(query);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md mx-4">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10 py-2 text-sm"
          aria-label="Search products and content"
          aria-autocomplete="list"
          aria-expanded={isOpen}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions(POPULAR_SEARCHES.slice(0, 5));
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-50"
          role="listbox"
        >
          <div className="max-h-96 overflow-y-auto">
            {suggestions.length > 0 ? (
              <>
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearch(item.query)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors flex justify-between items-center group"
                    role="option"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.query}
                        </p>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 group-hover:text-gray-600">→</span>
                  </button>
                ))}
              </>
            ) : (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                No results for "{query}"
              </div>
            )}
          </div>

          {/* Quick Help */}
          <div className="border-t bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-600 mb-2 font-medium">Quick Help</p>
            <div className="flex flex-wrap gap-2">
              {['FAQ', 'Contact', 'Shipping'].map((link) => (
                <Link
                  key={link}
                  href={link === 'FAQ' ? '/#faq' : link === 'Contact' ? '/contact' : '/contact'}
                  className="text-xs bg-white border rounded px-2 py-1 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
