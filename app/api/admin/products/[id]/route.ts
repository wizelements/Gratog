/**
 * Hardened Individual Product API
 * 
 * Security: RBAC, input validation, CSRF, rate limiting, audit logging
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddlewareWithContext, AuthenticatedRequest } from '@/lib/middleware/admin';
import { ProductUpdateSchema, validateBody } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';

/**
 * GET /api/admin/products/[id]
 * Get single product details for editing
 */
export const GET = withAdminMiddlewareWithContext(
  async (request: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;
    const productId = params.id;
    
    try {
      // Validate productId
      if (!productId || typeof productId !== 'string' || productId.length < 1) {
        return NextResponse.json(
          { success: false, error: 'Invalid product ID' },
          { status: 400 }
        );
      }
      
      const { db } = await connectToDatabase();
      
      // Get product from unified collection
      const product = await db.collection('unified_products').findOne({ id: productId });
      
      if (!product) {
        // Try square_catalog_items as fallback
        const squareProduct = await db.collection('square_catalog_items').findOne({ id: productId });
        
        if (!squareProduct) {
          return NextResponse.json(
            { success: false, error: 'Product not found' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          product: squareProduct,
          source: 'square',
        });
      }
      
      // Get inventory data
      const inventory = await db.collection('inventory').findOne({ productId });
      
      return NextResponse.json({
        success: true,
        product: {
          ...product,
          inventory: inventory || null,
        },
        source: 'unified',
      });
      
    } catch (error) {
      logger.error('API', 'Failed to fetch product', { productId, error });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch product' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.PRODUCTS_VIEW,
    resource: 'products',
    action: 'view',
  }
);

/**
 * PUT /api/admin/products/[id]
 * Update a specific product
 */
export const PUT = withAdminMiddlewareWithContext(
  async (request: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;
    const productId = params.id;
    const admin = request.admin;
    
    try {
      // Validate productId
      if (!productId || typeof productId !== 'string' || productId.length < 1) {
        return NextResponse.json(
          { success: false, error: 'Invalid product ID' },
          { status: 400 }
        );
      }
      
      // Parse and validate body
      const body = await request.json();
      const { updates } = body;
      
      if (!updates || typeof updates !== 'object') {
        return NextResponse.json(
          { success: false, error: 'Updates object is required' },
          { status: 400 }
        );
      }
      
      // Validate with Zod schema
      const validation = validateBody(updates, ProductUpdateSchema);
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      
      const sanitizedUpdates = validation.data;
      
      // Reject if no valid updates
      if (Object.keys(sanitizedUpdates).length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid fields to update' },
          { status: 400 }
        );
      }
      
      const { db } = await connectToDatabase();
      
      // Prepare update data
      const updateData: Record<string, unknown> = {
        ...sanitizedUpdates,
        updatedAt: new Date(),
        updatedBy: admin.email,
        source: 'admin_update',
      };
      
      // Handle manual category override
      if (sanitizedUpdates.category) {
        updateData.intelligentCategory = sanitizedUpdates.category;
        updateData.manualCategoryOverride = true;
        delete updateData.category;
      }
      
      // Update unified_products (canonical)
      const result = await db.collection('unified_products').updateOne(
        { id: productId },
        { $set: updateData }
      );
      
      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404 }
        );
      }
      
      // Update square_catalog_items for consistency
      const squareUpdate: Record<string, unknown> = {};
      if (sanitizedUpdates.name) squareUpdate.name = sanitizedUpdates.name;
      if (sanitizedUpdates.description) squareUpdate.description = sanitizedUpdates.description;
      if (sanitizedUpdates.price) squareUpdate.price = sanitizedUpdates.price;
      if (sanitizedUpdates.inStock !== undefined) squareUpdate.inStock = sanitizedUpdates.inStock;
      
      if (Object.keys(squareUpdate).length > 0) {
        squareUpdate.updatedAt = new Date();
        await db.collection('square_catalog_items').updateOne(
          { id: productId },
          { $set: squareUpdate }
        );
      }
      
      // Update inventory if lowStockThreshold changed
      if (sanitizedUpdates.lowStockThreshold !== undefined) {
        await db.collection('inventory').updateOne(
          { productId },
          { 
            $set: { 
              lowStockThreshold: sanitizedUpdates.lowStockThreshold,
              updatedAt: new Date(),
              updatedBy: admin.email,
            } 
          }
        );
      }
      
      // Revalidate storefront
      try {
        revalidatePath('/catalog');
        revalidatePath('/');
        
        // Revalidate product page
        const product = await db.collection('unified_products').findOne(
          { id: productId },
          { projection: { name: 1 } }
        );
        if (product?.name) {
          const slug = product.name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
          if (slug) {
            revalidatePath(`/product/${slug}`);
          }
        }
      } catch (revalError) {
        logger.warn('API', 'Revalidation failed (non-critical)', revalError);
      }
      
      logger.info('API', `Product ${productId} updated by ${admin.email}`, {
        fields: Object.keys(sanitizedUpdates),
      });
      
      return NextResponse.json({
        success: true,
        message: 'Product updated successfully',
        updatedFields: Object.keys(sanitizedUpdates),
      });
      
    } catch (error) {
      logger.error('API', 'Failed to update product', { productId, error });
      return NextResponse.json(
        { success: false, error: 'Failed to update product' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.PRODUCTS_UPDATE,
    resource: 'products',
    action: 'update',
    rateLimit: { maxRequests: 60, windowSeconds: 60 },
  }
);

/**
 * DELETE /api/admin/products/[id]
 * Delete a product
 */
export const DELETE = withAdminMiddlewareWithContext(
  async (request: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;
    const productId = params.id;
    const admin = request.admin;
    
    try {
      // Validate productId
      if (!productId || typeof productId !== 'string' || productId.length < 1) {
        return NextResponse.json(
          { success: false, error: 'Invalid product ID' },
          { status: 400 }
        );
      }
      
      const { db } = await connectToDatabase();
      
      // Check if product has orders (can't delete if it does)
      const orderCount = await db.collection('orders').countDocuments({
        'items.productId': productId,
        status: { $nin: ['cancelled'] },
      });
      
      if (orderCount > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Cannot delete product with existing orders',
            details: { orderCount },
          },
          { status: 409 }
        );
      }
      
      // Archive instead of delete for audit trail
      const archiveResult = await db.collection('deleted_products').insertOne({
        productId,
        deletedBy: admin.email,
        deletedAt: new Date(),
        restored: false,
      });
      
      // Soft delete from unified_products
      const result = await db.collection('unified_products').updateOne(
        { id: productId },
        { 
          $set: { 
            deleted: true,
            deletedAt: new Date(),
            deletedBy: admin.email,
            inStock: false,
          } 
        }
      );
      
      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404 }
        );
      }
      
      // Revalidate storefront
      try {
        revalidatePath('/catalog');
        revalidatePath('/');
      } catch (revalError) {
        logger.warn('API', 'Revalidation failed (non-critical)', revalError);
      }
      
      logger.info('API', `Product ${productId} soft-deleted by ${admin.email}`);
      
      return NextResponse.json({
        success: true,
        message: 'Product deleted successfully',
        archived: true,
        archiveId: archiveResult.insertedId,
      });
      
    } catch (error) {
      logger.error('API', 'Failed to delete product', { productId, error });
      return NextResponse.json(
        { success: false, error: 'Failed to delete product' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.PRODUCTS_DELETE,
    resource: 'products',
    action: 'delete',
    rateLimit: { maxRequests: 30, windowSeconds: 60 },
  }
);
