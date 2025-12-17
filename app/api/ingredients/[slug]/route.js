import { NextResponse } from 'next/server';
import { getIngredientBySlug } from '@/lib/ingredient-data-extended';

export async function GET(request, { params }) {
  try {
    const { slug } = params;
    const ingredient = getIngredientBySlug(slug);

    if (!ingredient) {
      return NextResponse.json(
        { success: false, error: 'Ingredient not found' },
        { status: 404 }
      );
    }

    // In a real implementation, you would fetch related products from database
    // For now, return empty array
    const relatedProducts = [];

    return NextResponse.json({
      success: true,
      ingredient,
      relatedProducts
    });
  } catch (error) {
    console.error('Ingredient detail API error:', error.message, { stack: error.stack });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ingredient' },
      { status: 500 }
    );
  }
}
