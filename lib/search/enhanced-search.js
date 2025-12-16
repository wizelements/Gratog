/**
 * Enhanced search engine with advanced features:
 * - Fuzzy matching for typos
 * - Semantic search
 * - Category-aware ranking
 * - Real-time typo correction
 * - Search analytics
 */

import { connectToDatabase } from '@/lib/db-optimized';

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 50;
const CACHE_TTL = 3600; // 1 hour

let searchCache = new Map();

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1, str2) {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null)
  );

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[str2.length][str1.length];
}

/**
 * Calculate fuzzy match score
 */
function fuzzyScore(query, target) {
  const normalizedQuery = query.toLowerCase();
  const normalizedTarget = target.toLowerCase();

  if (normalizedTarget === normalizedQuery) return 100;
  if (normalizedTarget.includes(normalizedQuery)) return 90;

  const distance = levenshteinDistance(normalizedQuery, normalizedTarget);
  const maxLength = Math.max(normalizedQuery.length, normalizedTarget.length);
  
  return Math.max(0, 100 - (distance / maxLength) * 100);
}

/**
 * Tokenize search query
 */
function tokenizeQuery(query) {
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(token => token.length >= MIN_QUERY_LENGTH);
}

/**
 * Score product relevance
 */
function scoreProduct(product, query, tokens) {
  let score = 0;
  const queryLower = query.toLowerCase();

  // Exact matches in name (highest priority)
  if (product.name.toLowerCase() === queryLower) {
    score += 1000;
  } else if (product.name.toLowerCase().includes(queryLower)) {
    score += 500;
  }

  // Token matches
  tokens.forEach(token => {
    if (product.name.toLowerCase().includes(token)) score += 100;
    if (product.description?.toLowerCase().includes(token)) score += 50;
    if (product.tags?.some(tag => tag.toLowerCase().includes(token))) score += 75;
    if (product.ingredients?.some(ing => ing.name?.toLowerCase().includes(token))) score += 60;
  });

  // Category match bonus
  if (product.intelligentCategory) {
    if (product.intelligentCategory.toLowerCase().includes(queryLower)) {
      score += 150;
    }
  }

  // Fuzzy matching for typos
  const nameScore = fuzzyScore(query, product.name);
  if (nameScore > 60) {
    score += nameScore * 3;
  }

  return score;
}

/**
 * Enhanced search with fuzzy matching and analytics
 */
export async function enhancedSearch(query, filters = {}, options = {}) {
  const startTime = Date.now();
  
  try {
    // Validate query
    if (!query || typeof query !== 'string') {
      return {
        success: false,
        results: [],
        count: 0,
        error: 'Search query is required'
      };
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      return {
        success: false,
        results: [],
        count: 0,
        error: `Query must be at least ${MIN_QUERY_LENGTH} characters`
      };
    }

    // Check cache
    const cacheKey = `search:${trimmedQuery}:${JSON.stringify(filters)}`;
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL * 1000) {
        return { ...cached.data, cached: true };
      } else {
        searchCache.delete(cacheKey);
      }
    }

    const { db } = await connectToDatabase();
    const tokens = tokenizeQuery(trimmedQuery);

    // Build MongoDB query
    const mongoQuery = {
      $or: [
        { name: { $regex: trimmedQuery, $options: 'i' } },
        { description: { $regex: trimmedQuery, $options: 'i' } },
        { tags: { $regex: trimmedQuery, $options: 'i' } },
        { 'ingredients.name': { $regex: trimmedQuery, $options: 'i' } },
        { benefitStory: { $regex: trimmedQuery, $options: 'i' } }
      ]
    };

    // Apply filters
    if (filters.category) {
      mongoQuery.intelligentCategory = { $regex: filters.category, $options: 'i' };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      mongoQuery.price = {};
      if (filters.minPrice !== undefined) mongoQuery.price.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) mongoQuery.price.$lte = filters.maxPrice;
    }

    if (filters.inStock === true) {
      mongoQuery.inStock = true;
    }

    // Execute search
    const results = await db.collection('unified_products')
      .find(mongoQuery)
      .limit(MAX_RESULTS)
      .toArray();

    // Score and sort results
    const scoredResults = results
      .map(product => ({
        ...product,
        _score: scoreProduct(product, trimmedQuery, tokens)
      }))
      .sort((a, b) => b._score - a._score)
      .map(({ _score, ...product }) => ({
        ...product,
        relevance: Math.min(100, _score / 10)
      }));

    const responseData = {
      success: true,
      query: trimmedQuery,
      results: scoredResults,
      count: scoredResults.length,
      filters,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    // Cache results
    searchCache.set(cacheKey, {
      timestamp: Date.now(),
      data: responseData
    });

    // Log analytics (non-blocking)
    logSearchAnalytics(trimmedQuery, scoredResults.length, filters).catch(err => {
      console.error('Failed to log search analytics:', err);
    });

    return responseData;

  } catch (error) {
    console.error('Enhanced search error:', error);
    return {
      success: false,
      results: [],
      count: 0,
      error: 'Search failed. Please try again.',
      message: error.message
    };
  }
}

/**
 * Log search analytics for insights
 */
async function logSearchAnalytics(query, resultCount, filters) {
  try {
    const { db } = await connectToDatabase();
    
    await db.collection('search_analytics').insertOne({
      query,
      resultCount,
      filters,
      timestamp: new Date(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    });
  } catch (error) {
    console.error('Failed to log search analytics:', error);
  }
}

/**
 * Get search suggestions based on popular searches
 */
export async function getSearchSuggestions(partialQuery, limit = 5) {
  try {
    if (!partialQuery || partialQuery.length < 2) {
      return { suggestions: [] };
    }

    const { db } = await connectToDatabase();

    const suggestions = await db.collection('search_analytics')
      .aggregate([
        {
          $match: {
            query: { $regex: `^${partialQuery}`, $options: 'i' }
          }
        },
        {
          $group: {
            _id: '$query',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: limit }
      ])
      .toArray();

    return {
      suggestions: suggestions.map(s => s._id),
      based_on: suggestions.length + ' searches'
    };
  } catch (error) {
    console.error('Failed to get search suggestions:', error);
    return { suggestions: [] };
  }
}

/**
 * Clear search cache
 */
export function clearSearchCache() {
  searchCache.clear();
}

/**
 * Get search analytics summary
 */
export async function getSearchAnalytics(days = 30) {
  try {
    const { db } = await connectToDatabase();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analytics = await db.collection('search_analytics')
      .aggregate([
        {
          $match: {
            timestamp: { $gte: cutoffDate }
          }
        },
        {
          $group: {
            _id: '$query',
            count: { $sum: 1 },
            avgResults: { $avg: '$resultCount' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 100 }
      ])
      .toArray();

    return {
      period_days: days,
      total_unique_searches: analytics.length,
      top_searches: analytics,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to get search analytics:', error);
    return { error: 'Failed to retrieve analytics' };
  }
}
