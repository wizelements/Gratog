/**
 * Storefront Catalog API
 * Returns products for the pay-flow and market checkout
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cache headers to prevent caching
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export async function GET(request: NextRequest) {
  try {
    // Fetch from the existing products API
    const productsUrl = new URL('/api/products', request.url);
    const response = await fetch(productsUrl.toString(), {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Products API failed: ${response.status}`);
    }

    const data = await response.json();

    // Transform to storefront format expected by pay-flow
    const products = (data.products || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      priceCents: Math.round((product.price || 0) * 100),
      images: product.images || [product.image].filter(Boolean),
      image: product.image,
      category: product.category,
      categoryId: product.category,
      ingredients: product.ingredients,
      ingredientHighlights: product.ingredientHighlights,
      available: product.available !== false && product.inStock !== false,
      inStock: product.inStock !== false,
      stockQuantity: product.stockQuantity || product.quantity || 99,
      tags: product.tags || [],
      isPopular: product.isPopular,
      isNew: product.isNew,
      originalPrice: product.originalPrice,
      squareData: product.squareData
    }));

    return NextResponse.json(
      {
        success: true,
        products,
        categories: data.categories || [],
        timestamp: new Date().toISOString()
      },
      { headers: NO_STORE_HEADERS }
    );

  } catch (error) {
    console.error('Storefront catalog error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch catalog',
        products: [],
        categories: []
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS
      }
    );
  }
}
