import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { verifyToken } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/products/[id]
 * Get single product for editing
 */
export async function GET(request, { params }) {
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
    const productId = params.id;

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
    const productId = params.id;
    const { updates } = await request.json();

    // Prepare update object
    const updateData = {
      ...updates,
      updatedAt: new Date(),
      source: 'admin_update'
    };

    // If category is being manually set, mark it as a manual override
    if (updates.category) {
      updateData.intelligentCategory = updates.category;
      updateData.manualCategoryOverride = true; // Flag to prevent auto-categorization
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

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully'
    });
  } catch (error) {
    logger.error('API', 'Failed to update product', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}
