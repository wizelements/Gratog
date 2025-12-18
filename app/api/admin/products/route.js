import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { requireAdmin } from '@/lib/admin-session';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/products
 * Fetch all products for admin dashboard
 */
export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    
    const { db } = await connectToDatabase();
    
    // Fetch products from unified collection (has enriched data)
    let products = await db.collection('unified_products')
      .find({})
      .sort({ name: 1 })
      .toArray();
    
    // Fallback to square_catalog_items if unified is empty
    if (products.length === 0) {
      logger.info('API', 'unified_products empty, falling back to square_catalog_items');
      products = await db.collection('square_catalog_items')
        .find({})
        .sort({ name: 1 })
        .toArray();
    }
    
    // Transform to admin format
    const adminProducts = products.map(product => ({
      id: product.id || product._id?.toString() || 'unknown',
      name: product.name || 'Unnamed Product',
      description: product.description || '',
      category: product.intelligentCategory || product.category || 'uncategorized',
      price: product.price || 0,
      variations: product.variations || [],
      images: product.images || [],
      image: product.images?.[0] || product.image || '/images/sea-moss-default.svg',
      inStock: product.inStock !== false,
      active: true,
      subtitle: product.benefitStory || (product.description ? product.description.substring(0, 100) : '') || 'Premium sea moss product',
      featured: product.featured || false,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));
    
    return NextResponse.json({
      success: true,
      products: adminProducts,
      count: adminProducts.length
    });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Admin products fetch error', error);
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
  try {
    const admin = await requireAdmin(request);
    
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
    
    logger.info('API', `Product ${productId} updated by admin ${admin.email}`);
    
    return NextResponse.json({
      success: true,
      message: 'Product updated successfully'
    });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Admin product update error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}
