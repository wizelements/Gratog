/**
 * Enhanced Search with Fuzzy Matching and Autocomplete
 * Production-ready search utilities with typo tolerance
 */

import { logger } from './logger';

// Fuzzy matching threshold (0-1, higher = stricter)
const FUZZY_THRESHOLD = parseFloat(process.env.SEARCH_FUZZY_THRESHOLD || '0.7');
const MAX_SUGGESTIONS = parseInt(process.env.SEARCH_MAX_SUGGESTIONS || '10');

export interface SearchResult {
  product: any;
  score: number;
  matches: SearchMatch[];
}

export interface SearchMatch {
  field: string;
  value: string;
  similarity: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'product' | 'category' | 'recent';
  score: number;
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,  // substitution
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j] + 1       // deletion
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score (0-1)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const maxLen = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / maxLen;
}

/**
 * Check if strings are phonetically similar
 */
export function isPhoneticMatch(str1: string, str2: string): boolean {
  const phoneticMap: Record<string, string[]> = {
    'sea': ['see', 'c'],
    'moss': ['moss', 'mose'],
    'gel': ['jell', 'jelle'],
    'shot': ['shots'],
    'gratitude': ['gratatude', 'gratetude'],
    'taste': ['tast', 'tayste'],
    'wellness': ['welness', 'wellnes'],
    'health': ['helth', 'healt'],
    'organic': ['organik', 'organick'],
    'natural': ['natral', 'naturall']
  };

  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Check direct phonetic map
  for (const [key, variations] of Object.entries(phoneticMap)) {
    if (variations.includes(s1) && variations.includes(s2)) {
      return true;
    }
  }

  // Check Soundex-like similarity
  const soundex1 = getSoundex(s1);
  const soundex2 = getSoundex(s2);
  
  return soundex1 === soundex2;
}

/**
 * Simple Soundex implementation
 */
function getSoundex(str: string): string {
  const codes: Record<string, string> = {
    'b': '1', 'f': '1', 'p': '1', 'v': '1',
    'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
    'd': '3', 't': '3',
    'l': '4',
    'm': '5', 'n': '5',
    'r': '6'
  };

  if (str.length === 0) return '';

  let result = str[0].toUpperCase();
  let prevCode = codes[str[0].toLowerCase()] || '';

  for (let i = 1; i < str.length && result.length < 4; i++) {
    const code = codes[str[i].toLowerCase()];
    if (code && code !== prevCode) {
      result += code;
      prevCode = code;
    }
  }

  return result.padEnd(4, '0');
}

/**
 * Generate search suggestions with typo correction
 */
export function generateSuggestions(
  query: string,
  products: any[],
  categories: string[]
): SearchSuggestion[] {
  const suggestions: SearchSuggestion[] = [];
  const queryLower = query.toLowerCase();

  // Product name suggestions
  for (const product of products) {
    const name = product.name || '';
    const similarity = calculateSimilarity(queryLower, name.toLowerCase());
    
    if (similarity >= FUZZY_THRESHOLD - 0.2 || name.toLowerCase().includes(queryLower)) {
      suggestions.push({
        text: name,
        type: 'product',
        score: similarity
      });
    }
  }

  // Category suggestions
  for (const category of categories) {
    const similarity = calculateSimilarity(queryLower, category.toLowerCase());
    
    if (similarity >= FUZZY_THRESHOLD - 0.3 || category.toLowerCase().includes(queryLower)) {
      suggestions.push({
        text: category,
        type: 'category',
        score: similarity
      });
    }
  }

  // Phonetic matches
  for (const product of products) {
    const name = product.name || '';
    if (isPhoneticMatch(queryLower, name.toLowerCase())) {
      suggestions.push({
        text: name,
        type: 'product',
        score: 0.85
      });
    }
  }

  // Sort by score and remove duplicates
  const uniqueSuggestions = suggestions
    .sort((a, b) => b.score - a.score)
    .filter((suggestion, index, self) =>
      index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
    )
    .slice(0, MAX_SUGGESTIONS);

  return uniqueSuggestions;
}

/**
 * Fuzzy search products
 */
export function fuzzySearch(
  query: string,
  products: any[],
  options: {
    fields?: string[];
    threshold?: number;
    limit?: number;
  } = {}
): SearchResult[] {
  const {
    fields = ['name', 'description', 'category', 'tags'],
    threshold = FUZZY_THRESHOLD,
    limit = 20
  } = options;

  const queryLower = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const product of products) {
    const matches: SearchMatch[] = [];
    let maxScore = 0;

    for (const field of fields) {
      const value = product[field];
      if (!value) continue;

      // Handle arrays (e.g., tags)
      const values = Array.isArray(value) ? value : [value];
      
      for (const val of values) {
        const valStr = String(val).toLowerCase();
        const similarity = calculateSimilarity(queryLower, valStr);
        
        // Boost exact match
        const exactMatch = valStr === queryLower || valStr.includes(queryLower);
        const score = exactMatch ? 1.0 : similarity;

        if (score >= threshold || exactMatch) {
          matches.push({
            field,
            value: String(val),
            similarity: score
          });
          maxScore = Math.max(maxScore, score);
        }

        // Check phonetic match
        if (isPhoneticMatch(queryLower, valStr) && score < threshold) {
          matches.push({
            field,
            value: String(val),
            similarity: 0.8
          });
          maxScore = Math.max(maxScore, 0.8);
        }
      }
    }

    if (matches.length > 0) {
      results.push({
        product,
        score: maxScore,
        matches
      });
    }
  }

  // Sort by score and limit results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get corrected query ("Did you mean?")
 */
export function getCorrectedQuery(
  query: string,
  products: any[]
): string | null {
  const queryLower = query.toLowerCase();
  
  // Check if query has a good match
  let bestMatch: { text: string; score: number } | null = null;

  for (const product of products) {
    const name = product.name || '';
    const similarity = calculateSimilarity(queryLower, name.toLowerCase());
    
    if (similarity >= FUZZY_THRESHOLD && similarity < 1.0) {
      if (!bestMatch || similarity > bestMatch.score) {
        bestMatch = { text: name, score: similarity };
      }
    }
  }

  return bestMatch?.text || null;
}

/**
 * Search with auto-complete
 */
export function autocompleteSearch(
  prefix: string,
  products: any[],
  limit: number = 10
): SearchSuggestion[] {
  const prefixLower = prefix.toLowerCase();
  const suggestions: SearchSuggestion[] = [];

  for (const product of products) {
    const name = product.name || '';
    const nameLower = name.toLowerCase();

    // Starts with prefix
    if (nameLower.startsWith(prefixLower)) {
      suggestions.push({
        text: name,
        type: 'product',
        score: 1.0
      });
    }
    // Contains prefix as word
    else if (nameLower.includes(` ${prefixLower}`) || nameLower.includes(`${prefixLower} `)) {
      suggestions.push({
        text: name,
        type: 'product',
        score: 0.8
      });
    }
  }

  return suggestions
    .sort((a, b) => b.score - a.score)
    .filter((s, i, self) => 
      self.findIndex(t => t.text.toLowerCase() === s.text.toLowerCase()) === i
    )
    .slice(0, limit);
}

/**
 * Highlight matching terms in text
 */
export function highlightMatches(text: string, query: string): string {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  if (!textLower.includes(queryLower)) {
    // Try fuzzy highlighting
    for (let i = 0; i < query.length; i++) {
      const char = query[i].toLowerCase();
      const regex = new RegExp(char, 'gi');
      // This is a simplified version - production would use more sophisticated highlighting
    }
    return text;
  }

  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculate search facets
 */
export function calculateFacets(results: SearchResult[]): {
  categories: Record<string, number>;
  priceRanges: Record<string, number>;
} {
  const categories: Record<string, number> = {};
  const priceRanges: Record<string, number> = {};

  const priceRanges_def = [
    { label: 'Under $25', min: 0, max: 25 },
    { label: '$25 - $50', min: 25, max: 50 },
    { label: '$50 - $100', min: 50, max: 100 },
    { label: 'Over $100', min: 100, max: Infinity }
  ];

  for (const result of results) {
    const product = result.product;
    
    // Category facet
    const category = product.category || 'Uncategorized';
    categories[category] = (categories[category] || 0) + 1;

    // Price range facet
    const price = product.price || 0;
    for (const range of priceRanges_def) {
      if (price >= range.min && price < range.max) {
        priceRanges[range.label] = (priceRanges[range.label] || 0) + 1;
        break;
      }
    }
  }

  return { categories, priceRanges };
}

// Search analytics tracking
interface SearchAnalytics {
  query: string;
  timestamp: Date;
  resultCount: number;
  hasResults: boolean;
  correctedQuery?: string;
  latency: number;
}

const searchHistory: SearchAnalytics[] = [];
const MAX_HISTORY = 1000;

/**
 * Track search analytics
 */
export function trackSearch(analytics: SearchAnalytics): void {
  searchHistory.push(analytics);
  
  // Keep only recent searches
  if (searchHistory.length > MAX_HISTORY) {
    searchHistory.shift();
  }

  // Log zero-result queries
  if (!analytics.hasResults) {
    logger.warn('Search', 'Zero results query', { 
      query: analytics.query,
      corrected: analytics.correctedQuery 
    });
  }
}

/**
 * Get popular searches
 */
export function getPopularSearches(limit: number = 10): Array<{ query: string; count: number }> {
  const counts: Record<string, number> = {};
  
  for (const search of searchHistory) {
    if (search.hasResults) {
      counts[search.query] = (counts[search.query] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get recent searches for a session
 */
export function getRecentSearches(sessionId: string): string[] {
  // In production, this would query a database
  // For now, return empty (client-side storage preferred)
  return [];
}

// Default export
export default {
  levenshteinDistance,
  calculateSimilarity,
  isPhoneticMatch,
  getSoundex,
  generateSuggestions,
  fuzzySearch,
  getCorrectedQuery,
  autocompleteSearch,
  highlightMatches,
  calculateFacets,
  trackSearch,
  getPopularSearches,
  getRecentSearches
};
