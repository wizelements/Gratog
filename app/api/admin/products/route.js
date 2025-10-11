import { NextResponse } from 'next/server';
import { PRODUCTS } from '@/lib/products';
import { connectToDatabase, getCachedQuery } from '@/lib/db-optimized';

export async function GET() {
  try {
    // For production, use static products with default stock data
    const productsWithStock = PRODUCTS.map(product => {
      return {
        ...product,
        stock: 25, // Default stock for production
        lowStockThreshold: 5,
        lastRestocked: new Date().toISOString()
      };
    });

    return NextResponse.json({ products: productsWithStock });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Failed to get products' },
      { status: 500 }
    );
  }
}
