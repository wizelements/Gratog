import { logger } from '@/lib/logger';
import { 
  fuzzySearch, 
  generateSuggestions, 
  getCorrectedQuery,
  autocompleteSearch,
  calculateFacets,
  trackSearch
} from '@/lib/search-enhanced';
import { connectToDatabase } from '@/lib/db-optimized';
import { searchCache } from '@/lib/cache';
import { RateLimit } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/search/enhanced
 * Enhanced search with fuzzy matching, typo tolerance, and autocomplete
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!RateLimit.check(`search:${clientIp}`, 100, 60)) {
      return NextResponse.json(
        { error: 'Too many search requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      query,
      filters = {},
      options = {}
    } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const {
      fuzzy = true,
      typoTolerance = 2,
      limit = 20,
      offset = 0,
      autocomplete = false
    } = options;

    // Check cache for exact query
    const cacheKey = `search:${query.toLowerCase()}:${JSON.stringify(filters)}`;
    const cached = searchCache.getResults(cacheKey);
    
    if (cached && !autocomplete) {
      return NextResponse.json({
        success: true,
        ...cached,
        cached: true,
        searchTime: `${Date.now() - startTime}ms`
      });
    }

    const { db } = await connectToDatabase();

    // Build query
    const dbQuery: any = {};
    
    if (filters.category) {
      dbQuery.category = filters.category;
    }
    
    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      dbQuery.price = { $gte: min, $lte: max };
    }

    if (filters.inStock !== undefined) {
      dbQuery.inStock = filters.inStock;
    }

    // Get products from database
    const products = await db.collection('unified_products')
      .find(dbQuery)
      .limit(200) // Limit for performance
      .toArray();

    // Get categories for suggestions
    const categories = await db.collection('unified_products')
      .distinct('category');

    let results: any[] = [];
    let suggestions: any[] = [];
    let correctedQuery: string | null = null;

    if (autocomplete) {
      // Autocomplete mode - return suggestions only
      suggestions = autocompleteSearch(query, products, 10);
      
      return NextResponse.json({
        success: true,
        suggestions,
        query,
        searchTime: `${Date.now() - startTime}ms`
      });
    }

    // Full search mode
    if (fuzzy) {
      // Fuzzy search
      const searchResults = fuzzySearch(query, products, {
        threshold: typoTolerance >= 2 ? 0.6 : 0.7,
        limit: limit + offset
      });

      results = searchResults.map(r => ({
        ...r.product,
        searchScore: r.score,
        matches: r.matches
      }));

      // Get corrected query suggestion
      correctedQuery = getCorrectedQuery(query, products);
    } else {
      // Exact match search
      const regex = new RegExp(query.split('').join('.*'), 'i');
      results = products.filter(p => 
        regex.test(p.name) || 
        regex.test(p.description) ||
        regex.test(p.category)
      ).map(p => ({ ...p, searchScore: 1.0 }));
    }

    // Generate suggestions if no exact matches
    if (results.length === 0 || results.length < 3) {
      suggestions = generateSuggestions(query, products, categories);
    }

    // Calculate facets
    const facets = calculateFacets(results.map(r => ({ product: r, score: r.searchScore, matches: [] })));

    // Paginate results
    const paginatedResults = results.slice(offset, offset + limit);

    // Prepare response
    const response = {
      results: paginatedResults,
      suggestions: suggestions.map(s => s.text),
      correctedQuery,
      totalResults: results.length,
      facets,
      pagination: {
        offset,
        limit,
        hasMore: results.length > offset + limit
      }
    };

    // Cache results (except for autocomplete)
    if (!autocomplete) {
      searchCache.setResults(cacheKey, {
        results: paginatedResults,
        suggestions: suggestions.map(s => s.text),
        correctedQuery,
        totalResults: results.length,
        facets
      });
    }

    // Track analytics
    const searchTime = Date.now() - startTime;
    trackSearch({
      query,
      timestamp: new Date(),
      resultCount: results.length,
      hasResults: results.length > 0,
      correctedQuery: correctedQuery || undefined,
      latency: searchTime
    });

    logger.info('Search', 'Enhanced search completed', {
      query,
      results: results.length,
      latency: searchTime
    });

    return NextResponse.json({
      success: true,
      ...response,
      searchTime: `${searchTime}ms`
    });
  } catch (error) {
    const searchTime = Date.now() - startTime;
    logger.error('Search', 'Error in enhanced search', { error, query: request.url });
    
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search/enhanced
 * Health check and popular searches
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'popular') {
      const { getPopularSearches } = await import('@/lib/search-enhanced');
      const popular = getPopularSearches(10);
      
      return NextResponse.json({
        success: true,
        popular
      });
    }

    // Health check
    return NextResponse.json({
      status: 'active',
      features: {
        fuzzy: true,
        autocomplete: true,
        typoTolerance: true,
        suggestions: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Search', 'Error in search health check', { error });
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}
