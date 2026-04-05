import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { slug } = params;
    
    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Find product by slug
    const product = await db.collection('products').findOne({
      $or: [
        { slug: slug },
        { slug: { $regex: slug, $options: 'i' } },
        { id: slug }
      ]
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Convert ObjectId to string
    const serializedProduct = {
      ...product,
      _id: product._id?.toString(),
      createdAt: product.createdAt?.toISOString(),
      updatedAt: product.updatedAt?.toISOString(),
      syncedAt: product.syncedAt?.toISOString(),
    };

    return NextResponse.json({
      success: true,
      product: serializedProduct
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error('[Product API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
