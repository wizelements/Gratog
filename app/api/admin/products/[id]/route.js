import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/lib/db-optimized';
import { requireAdmin } from '@/lib/admin-session';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/products/[id]
 * Get single product for editing
 */
export async function GET(request, { params }) {
  try {
    const admin = await requireAdmin(request);

    const { db } = await connectToDatabase();
    const { id: productId } = await params;

    // Get from unified products (has all enriched data)
    const product = await db.collection('unified_products')
      .findOne({ id: productId });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product
    });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Failed to fetch product', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/products/[id]
 * Update product in database
 */
export async function PUT(request, { params }) {
  try {
    const admin = await requireAdmin(request);

    const { db } = await connectToDatabase();
    const { id: productId } = await params;
    const { updates } = await request.json();

    // Prepare update object
    const updateData = {
      ...updates,
      updatedAt: new Date(),
      updatedBy: admin.email,
      source: 'admin_update'
    };

    // If category is being manually set, mark it as a manual override
    if (updates.category) {
      updateData.intelligentCategory = updates.category;
      updateData.manualCategoryOverride = true;
    }

    // Update unified_products collection
    const result = await db.collection('unified_products').updateOne(
      { id: productId },
      {
        $set: updateData
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Also update square_catalog_items for consistency
    await db.collection('square_catalog_items').updateOne(
      { id: productId },
      {
        $set: {
          name: updates.name,
          description: updates.description,
          updatedAt: new Date()
        }
      }
    );

    logger.info('API', `Product ${productId} updated by ${admin.email}`);

    // Revalidate storefront so changes appear instantly
    try {
      revalidatePath('/catalog');
      revalidatePath('/');
      const slug = (updates.name || '')
        .toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (slug) {
        revalidatePath(`/product/${slug}`);
      }
    } catch (revalError) {
      logger.warn('API', 'Revalidation after product update failed (non-critical)', revalError);
    }

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
    logger.error('API', 'Failed to update product', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}
