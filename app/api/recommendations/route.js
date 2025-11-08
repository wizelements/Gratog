import { NextResponse } from 'next/server';
import { 
  getPersonalizedRecommendations, 
  getIngredientSuggestions,
  getComplementarySuggestions,
  getTrendingByCategory,
  smartSearch
} from '@/lib/adaptive-recommendations';

export const dynamic = 'force-dynamic';

/**
 * GET /api/recommendations
 * Get personalized product recommendations
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'personalized';
    
    if (type === 'ingredient') {
      const ingredient = searchParams.get('ingredient');
      const limit = parseInt(searchParams.get('limit') || '4');
      
      const result = await getIngredientSuggestions(ingredient, limit);
      return NextResponse.json({ success: true, ...result });
    }
    
    if (type === 'trending') {
      const category = searchParams.get('category');
      const days = parseInt(searchParams.get('days') || '7');
      const limit = parseInt(searchParams.get('limit') || '5');
      
      const result = await getTrendingByCategory(category, days, limit);
      return NextResponse.json({ success: true, ...result });
    }
    
    if (type === 'search') {
      const query = searchParams.get('q');
      const filters = {
        category: searchParams.get('category'),
        minPrice: parseFloat(searchParams.get('minPrice')),
        maxPrice: parseFloat(searchParams.get('maxPrice'))
      };
      
      const result = await smartSearch(query, filters);
      return NextResponse.json({ success: true, ...result });
    }
    
    // Default: personalized
    return NextResponse.json({
      success: true,
      message: 'Recommendations API ready',
      types: ['personalized', 'ingredient', 'trending', 'search']
    });
    
  } catch (error) {
    console.error('❌ Recommendations API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get recommendations',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/recommendations
 * Get recommendations based on user behavior
 */
export async function POST(request) {
  try {
    const { type, data } = await request.json();
    
    if (type === 'personalized') {
      const result = await getPersonalizedRecommendations(data);
      return NextResponse.json({ success: true, ...result });
    }
    
    if (type === 'complementary') {
      const result = await getComplementarySuggestions(data.cartItems || [], data.limit || 3);
      return NextResponse.json({ success: true, ...result });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid recommendation type'
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Recommendations POST Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate recommendations',
      message: error.message
    }, { status: 500 });
  }
}
