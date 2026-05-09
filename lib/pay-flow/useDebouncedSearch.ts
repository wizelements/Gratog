/**
 * 🚀 Gratog Pay Flow — Debounced Search Hook
 * Prevents excessive re-renders and XSS via input sanitization
 */

import { useState, useEffect, useCallback } from 'react';

// SECURITY: Sanitize input to prevent XSS and ReDoS
function sanitizeSearchInput(input: string): string {
  // Remove control characters and limit length
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[<>\"']/g, '') // Remove potential XSS chars
    .slice(0, 50); // Limit to 50 chars
}

export function useDebouncedSearch(
  onSearch: (query: string) => void,
  delay = 300
) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  
  useEffect(() => {
    const sanitized = sanitizeSearchInput(inputValue);
    const timer = setTimeout(() => {
      setDebouncedValue(sanitized);
      onSearch(sanitized);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [inputValue, delay, onSearch]);
  
  const clearSearch = useCallback(() => {
    setInputValue('');
    setDebouncedValue('');
    onSearch('');
  }, [onSearch]);
  
  return {
    inputValue,
    setInputValue,
    debouncedValue,
    clearSearch
  };
}

// SECURITY: Escape special regex characters to prevent ReDoS
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Safe search filter that prevents ReDoS
export function safeSearchFilter(
  items: Array<{ name: string; ingredients?: string; tags?: string[] }>,
  query: string
): typeof items {
  if (!query.trim()) return items;
  
  const sanitized = sanitizeSearchInput(query.toLowerCase());
  if (!sanitized) return items;
  
  // Use simple string includes instead of regex for safety
  return items.filter(item => {
    const nameMatch = item.name.toLowerCase().includes(sanitized);
    const ingredientsMatch = item.ingredients?.toLowerCase().includes(sanitized);
    const tagsMatch = item.tags?.some(t => t.toLowerCase().includes(sanitized));
    return nameMatch || ingredientsMatch || tagsMatch;
  });
}
