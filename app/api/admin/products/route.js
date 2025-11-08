import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/admin/products
 * Fetch all products for admin dashboard
 */
export async function GET(request) {
  // Verify admin authentication
  const token = request.cookies.get('admin_token')?.value;
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  try {
    const { db } = await connectToDatabase();
    
    // Fetch products from unified collection (has enriched data)
    const products = await db.collection('unified_products')
      .find({})
      .sort({ name: 1 })
      .toArray();
    
    // Transform to admin format
    const adminProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description || '',
      category: product.intelligentCategory || product.category || 'uncategorized',
      price: product.price || 0,
      variations: product.variations || [],
      images: product.images || [],
      image: product.images?.[0] || '/images/sea-moss-default.svg',
      inStock: true,
      active: true,
      subtitle: product.benefitStory || product.description?.substring(0, 100) || '',
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));
    
    return NextResponse.json({
      success: true,
      products: adminProducts,
      count: adminProducts.length
    });
  } catch (error) {
    console.error('Admin products fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/products
 * Update product data
 */
export async function PUT(request) {
  // Verify admin authentication
  const token = request.cookies.get('admin_token')?.value;
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  try {
    const body = await request.json();
    const { productId, updates } = body;
    
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID required' },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    // Update product
    const result = await db.collection('square_catalog_items').updateOne(
      { id: productId },
      { 
        $set: { 
          ...updates,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Admin product update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}
