export const dynamic = 'force-dynamic';

/**
 * Hardened Inventory Admin API
 * 
 * Security: Atomic operations, RBAC, input validation, CSRF, rate limiting, audit logging
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddlewareWithContext, AuthenticatedRequest } from '@/lib/middleware/admin';
import { InventoryAdjustmentSchema, validateBody } from '@/lib/validation';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/inventory/[productId]
 * Get inventory details for a specific product
 */
export const GET = withAdminMiddlewareWithContext(
  async (_request: AuthenticatedRequest, context: { params: Promise<Record<string, string>> }) => {
    const params = await context.params;
    const productId = params.productId;
    
    try {
      // Validate productId format
      if (!productId || typeof productId !== 'string' || productId.length < 1) {
        return NextResponse.json(
          { success: false, error: 'Invalid product ID' },
          { status: 400 }
        );
      }
      
      const { db } = await connectToDatabase();
      
      // Get inventory with product info
      const inventory = await db.collection('inventory').findOne({ productId });
      
      if (!inventory) {
        return NextResponse.json(
          { success: false, error: 'Inventory not found for this product' },
          { status: 404 }
        );
      }
      
      // Get product details
      const product = await db.collection('unified_products').findOne(
        { id: productId },
        { projection: { name: 1, id: 1, images: 1 } }
      );
      
      return NextResponse.json({
        success: true,
        inventory: {
          ...inventory,
          productName: product?.name || 'Unknown Product',
          productImage: product?.images?.[0] || null,
        },
      });
      
    } catch (error) {
      logger.error('INVENTORY', 'Failed to fetch inventory', { productId, error });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch inventory' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.INVENTORY_VIEW,
    resource: 'inventory',
    action: 'view',
  }
);

/**
 * PATCH /api/admin/inventory/[productId]
 * Adjust inventory stock level
 * 
 * CRITICAL: This uses atomic MongoDB operations to prevent race conditions
 */
export const PATCH = withAdminMiddlewareWithContext(
  async (request: AuthenticatedRequest, context: { params: Promise<Record<string, string>> }) => {
    const params = await context.params;
    const productId = params.productId;
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
      const validation = validateBody(body, InventoryAdjustmentSchema);
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: (validation as { success: false; error: string }).error },
          { status: 400 }
        );
      }
      
      const { adjustment, reason } = validation.data;
      
      // Prevent zero adjustments
      if (adjustment === 0) {
        return NextResponse.json(
          { success: false, error: 'Adjustment must be non-zero' },
          { status: 400 }
        );
      }
      
      const { db } = await connectToDatabase();
      
      // ATOMIC OPERATION: Use findOneAndUpdate with $inc
      // This prevents race conditions between concurrent requests
      const historyEntry = {
        date: new Date(),
        adjustment,
        reason: reason || 'Manual adjustment',
        adjustedBy: admin.email,
        previousStock: null as number | null,
      };
      
      // First, get current stock to include in history
      const current = await db.collection('inventory').findOne(
        { productId },
        { projection: { currentStock: 1 } }
      );
      
      if (!current) {
        return NextResponse.json(
          { success: false, error: 'Product not found in inventory' },
          { status: 404 }
        );
      }
      
      historyEntry.previousStock = current.currentStock;
      
      // Calculate new stock
      const newStock = current.currentStock + adjustment;
      
      // Validate new stock won't go negative
      if (newStock < 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Insufficient stock',
            details: {
              currentStock: current.currentStock,
              requestedAdjustment: adjustment,
              wouldResult: newStock,
            },
          },
          { status: 400 }
        );
      }
      
      // ATOMIC UPDATE: Use $inc for thread-safe operations
      const result = await db.collection('inventory').findOneAndUpdate(
        { productId },
        {
          $inc: { currentStock: adjustment },
          $set: {
            lastRestocked: adjustment > 0 ? new Date() : current.lastRestocked,
            updatedAt: new Date(),
            updatedBy: admin.email,
          },
          $push: {
            stockHistory: historyEntry,
          },
        },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Failed to update inventory' },
          { status: 500 }
        );
      }
      
      // Update product inStock status based on new stock level
      const lowStockThreshold = result.lowStockThreshold || 5;
      const isInStock = result.currentStock > 0;
      const isLowStock = result.currentStock <= lowStockThreshold;
      
      await db.collection('unified_products').updateOne(
        { id: productId },
        {
          $set: {
            inStock: isInStock,
            stock: result.currentStock,
            lowStock: isLowStock,
            updatedAt: new Date(),
          },
        }
      );
      
      logger.info('INVENTORY', `Stock adjusted for ${productId}`, {
        admin: admin.email,
        adjustment,
        newStock: result.currentStock,
        reason: reason || 'Manual adjustment',
      });
      
      return NextResponse.json({
        success: true,
        newStock: result.currentStock,
        adjustment,
        isLowStock,
        previousStock: historyEntry.previousStock,
      });
      
    } catch (error) {
      logger.error('INVENTORY', 'Failed to adjust inventory', { productId, error });
      return NextResponse.json(
        { success: false, error: 'Failed to adjust inventory' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.INVENTORY_ADJUST,
    resource: 'inventory',
    action: 'adjust',
    rateLimit: { maxRequests: 30, windowSeconds: 60 },
  }
);


/**
 * PUT /api/admin/inventory/[productId]
 * Record an owner-confirmed, ABSOLUTE physical count. This is intentionally
 * different from the legacy +/- adjustment API, which is not stock evidence.
 */
export const PUT = withAdminMiddlewareWithContext(
  async (request: AuthenticatedRequest, context: { params: Promise<Record<string, string>> }) => {
    const { productId } = await context.params;
    if (!productId || !/^[a-zA-Z0-9:_-]{1,128}$/.test(productId)) {
      return NextResponse.json({ success:false, error:'Invalid product' }, { status:400 });
    }
    try {
      const input = await request.json();
      const count = input?.countedUnits;
      if (!Number.isSafeInteger(count) || count < 0 || count > 10000 ||
          input.confirmedPhysicalCount !== true ||
          typeof input.expectedUpdatedAt !== 'string' ||
          input.expectedUpdatedAt.length < 10 ||
          typeof input.reason !== 'string' || input.reason.trim().length < 3) {
        return NextResponse.json({ success:false,
          error:'Enter the physically counted units, a reason, and confirm that you counted them.' },
          { status:422 });
      }
      const { db } = await connectToDatabase();
      const collection = db.collection('inventory');
      const current = await collection.findOne({ productId });
      if (!current) return NextResponse.json({success:false,error:'Product inventory record not found'},
        {status:404});
      const previousTime = current.updatedAt ? new Date(current.updatedAt).toISOString() : 'missing';
      if (input.expectedUpdatedAt !== previousTime) {
        return NextResponse.json({success:false,code:'COUNT_CHANGED',
          error:'Inventory changed. Refresh the count before submitting.'},{status:409});
      }
      const now = new Date();
      const previousCount = Number(current.currentStock);
      const filter: Record<string, unknown> = {productId};
      filter.updatedAt = current.updatedAt || {$exists:false};
      const updated = await collection.findOneAndUpdate(filter,{
        $set:{
          currentStock:count, stockSource:'merchant_physical_count',
          stockVerifiedAt:now, updatedAt:now, updatedBy:request.admin.email,
          lastRestocked:count > previousCount ? now : current.lastRestocked,
        },
        $push:{stockHistory:{date:now, adjustment:count-previousCount,
          reason:'Physically verified: '+input.reason.trim().slice(0,200),
          adjustedBy:request.admin.email, previousStock:previousCount}},
      },{returnDocument:'after'});
      if (!updated) return NextResponse.json({success:false,code:'COUNT_CONFLICT',
        error:'Inventory changed during verification. Refresh and retry.'},{status:409});
      await db.collection('unified_products').updateOne({id:productId},{
        $set:{inStock:count>0,stock:count,updatedAt:now}
      });
      return NextResponse.json({success:true,productId,verifiedCount:count,
        verifiedAt:now.toISOString(),source:'merchant_physical_count'});
    } catch {
      return NextResponse.json({success:false,error:'Unable to verify this physical count'},
        {status:500});
    }
  },
  {permission:PERMISSIONS.INVENTORY_ADJUST,resource:'inventory',action:'physical_count',
   rateLimit:{maxRequests:20,windowSeconds:60}}
);
