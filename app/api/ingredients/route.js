import { NextResponse } from 'next/server';
import { getAllExtendedIngredients } from '@/lib/ingredient-data-extended';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const allIngredients = getAllExtendedIngredients();
    let ingredients = Object.values(allIngredients);

    // Filter by category
    if (category && category !== 'all') {
      ingredients = ingredients.filter(ing => ing.category === category);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      ingredients = ingredients.filter(ing => 
        ing.name.toLowerCase().includes(searchLower) ||
        ing.description?.toLowerCase().includes(searchLower) ||
        ing.benefits?.some(b => b.toLowerCase().includes(searchLower))
      );
    }

    // Get unique categories
    const categories = [...new Set(ingredients.map(ing => ing.category))].filter(Boolean);

    return NextResponse.json({
      success: true,
      ingredients,
      count: ingredients.length,
      categories
    });
  } catch (error) {
    console.error('Ingredients API error:', error.message, { stack: error.stack });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ingredients' },
      { status: 500 }
    );
  }
}
