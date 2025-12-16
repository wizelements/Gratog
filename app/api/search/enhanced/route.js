import { NextResponse } from 'next/server';
import { enhancedSearch, getSearchSuggestions } from '@/lib/search/enhanced-search';

export const dynamic = 'force-dynamic';

/**
 * GET /api/search/enhanced
 * Advanced search with fuzzy matching, typo correction, and analytics
 * 
 * Query parameters:
 *   - q: search query (required)
 *   - category: filter by category
 *   - minPrice: minimum price filter
 *   - maxPrice: maximum price filter
 *   - inStock: filter to in-stock items only (boolean)
 *   - suggestions: return autocomplete suggestions instead (boolean)
 */
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const suggestions = searchParams.get('suggestions') === 'true';

    // Handle suggestions endpoint
    if (suggestions) {
      const result = await getSearchSuggestions(query, 5);
      return NextResponse.json({
        success: true,
        ...result,
        executionTime: Date.now() - startTime
      });
    }

    // Validate query
    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query is required',
          message: 'Please provide a search query using ?q=...'
        },
        { status: 400 }
      );
    }

    // Build filters
    const filters = {};
    
    if (searchParams.has('category')) {
      filters.category = searchParams.get('category');
    }
    
    if (searchParams.has('minPrice')) {
      const minPrice = parseFloat(searchParams.get('minPrice'));
      if (!isNaN(minPrice)) {
        filters.minPrice = minPrice;
      }
    }
    
    if (searchParams.has('maxPrice')) {
      const maxPrice = parseFloat(searchParams.get('maxPrice'));
      if (!isNaN(maxPrice)) {
        filters.maxPrice = maxPrice;
      }
    }
    
    if (searchParams.get('inStock') === 'true') {
      filters.inStock = true;
    }

    // Execute enhanced search
    const result = await enhancedSearch(query, filters);

    // Add execution metadata
    const response = {
      ...result,
      executionTime: Date.now() - startTime,
      filters
    };

    return NextResponse.json(response, {
      status: result.success ? 200 : 400
    });

  } catch (error) {
    console.error('Enhanced search error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/search/enhanced
 * Advanced search with full request body
 */
export async function POST(request) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { query, filters = {}, options = {} } = body;

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query is required'
        },
        { status: 400 }
      );
    }

    const result = await enhancedSearch(query, filters, options);

    return NextResponse.json({
      ...result,
      executionTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Enhanced search POST error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}
