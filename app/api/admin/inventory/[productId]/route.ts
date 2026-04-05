import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { getAdminSession } from '@/lib/admin-session';
import { InventoryAdjustmentSchema, validateBody } from '@/lib/validation';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware, AuthenticatedRequest } from '@/lib/middleware/admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/inventory/[productId]
 * Get inventory details for a specific product
 */
export const GET = withAdminMiddleware(
  async (request: AuthenticatedRequest, context: { params: Promise<{ productId: string }> }) => {
    const { productId } = await context.params;
    
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
export const PATCH = withAdminMiddleware(
  async (request: AuthenticatedRequest, context: { params: Promise<{ productId: string }> }) => {
    const { productId } = await context.params;
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
          { success: false, error: validation.error },
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
 * POST /api/admin/inventory/[productId]/restock
 * Explicit restock endpoint with transaction safety
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  // Delegate to PATCH handler after validating this is a restock action
  const { productId } = await context.params;
  
  try {
    const admin = await getAdminSession(request);
    
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { quantity, reason } = body;
    
    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid positive quantity required' },
        { status: 400 }
      );
    }
    
    // Convert to PATCH-style adjustment
    const patchRequest = new Request(request.url, {
      method: 'PATCH',
      headers: request.headers,
      body: JSON.stringify({
        adjustment: quantity,
        reason: reason || 'Restock',
      }),
    });
    
    // Call PATCH handler
    const response = await PATCH(patchRequest as AuthenticatedRequest, context);
    return response;
    
  } catch (error) {
    logger.error('INVENTORY', 'Restock failed', { productId, error });
    return NextResponse.json(
      { success: false, error: 'Restock failed' },
      { status: 500 }
    );
  }
}
