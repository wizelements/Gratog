'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

const POPULAR_SEARCHES = [
  { query: 'Sea Moss Gel', category: 'Products', trending: true, volume: '2.3k searches' },
  { query: 'Elderberry Blend', category: 'Products', trending: true, volume: '1.8k searches' },
  { query: 'How to use sea moss', category: 'Learn', trending: true, volume: '890 searches' },
  { query: 'Benefits of sea moss', category: 'Learn', trending: false, volume: '650 searches' },
  { query: 'Shipping information', category: 'Help', trending: false, volume: null },
];

export default function SearchBar({ placeholder = 'Search products, benefits, guides...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const router = useRouter();

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
    const encoded = encodeURIComponent(searchQuery);
    router.push(`/catalog?search=${encoded}`);
    setIsOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      handleSearch(query);
    }
  };

  const clearQuery = () => {
    setQuery('');
    setSuggestions(POPULAR_SEARCHES.slice(0, 5));
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md mx-4">
      <form onSubmit={handleSubmit} className="relative">
        <Search 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" 
          aria-hidden="true" 
        />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10 py-2 text-sm"
          role="combobox"
          aria-label="Search products and content"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="search-suggestions"
        />
        {query && (
          <button
            type="button"
            onClick={clearQuery}
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
          id="search-suggestions"
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
                    aria-selected="false"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {item.query}
                          </p>
                          {item.trending && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                              🔥 Trending
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500">{item.category}</p>
                          {item.volume && (
                            <span className="text-xs text-emerald-600">{item.volume}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 group-hover:text-gray-600" aria-hidden="true">→</span>
                  </button>
                ))}
              </>
            ) : (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                No results for "{query}"
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="border-t bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-600 mb-2 font-medium">Quick Help</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'FAQ', href: '/#faq' },
                { label: 'Contact', href: '/contact' },
                { label: 'Shipping', href: '/contact' }
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-xs bg-white border rounded px-2 py-1 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
