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
import { withTransaction } from '@/lib/transactions';
import { buildOpeeBusinessEvent } from '@/lib/opee/contract';
import { ensureOpeeOutboxIndexes, insertOpeeOutboxEvent } from '@/lib/opee/outbox';

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
      if (!productId || typeof productId !== 'string' || productId.length < 1) {
        return NextResponse.json(
          { success: false, error: 'Invalid product ID' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const validation = validateBody(body, InventoryAdjustmentSchema);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: (validation as { success: false; error: string }).error },
          { status: 400 }
        );
      }

      const { adjustment, reason } = validation.data;
      if (adjustment === 0) {
        return NextResponse.json(
          { success: false, error: 'Adjustment must be non-zero' },
          { status: 400 }
        );
      }

      await ensureOpeeOutboxIndexes();
      const outcome: any = await withTransaction(async (db, session) => {
        const now = new Date();
        const current = await db.collection('inventory').findOne(
          { productId },
          { projection: { currentStock: 1, lastRestocked: 1 }, session }
        );

        if (!current) {
          return { ok: false, status: 404, error: 'Product not found in inventory' };
        }

        const previousStock = Number(current.currentStock || 0);
        const newStock = previousStock + adjustment;
        if (newStock < 0) {
          return {
            ok: false,
            status: 400,
            error: 'Insufficient stock',
            details: {
              currentStock: previousStock,
              requestedAdjustment: adjustment,
              wouldResult: newStock,
            },
          };
        }

        const historyEntry = {
          date: now,
          adjustment,
          reason: reason || 'Manual adjustment',
          adjustedBy: admin.email,
          previousStock,
        };

        const guard =
          adjustment < 0
            ? { productId, currentStock: { $gte: Math.abs(adjustment) } }
            : { productId };

        const result = await db.collection('inventory').findOneAndUpdate(
          guard,
          {
            $inc: { currentStock: adjustment },
            $set: {
              lastRestocked: adjustment > 0 ? now : current.lastRestocked,
              updatedAt: now,
              updatedBy: admin.email,
            },
            $push: { stockHistory: historyEntry },
          },
          { returnDocument: 'after', session }
        );

        if (!result) {
          return { ok: false, status: 409, error: 'Inventory changed concurrently; retry adjustment' };
        }

        const lowStockThreshold = Number(result.lowStockThreshold || 5);
        const isInStock = Number(result.currentStock || 0) > 0;
        const isLowStock = Number(result.currentStock || 0) <= lowStockThreshold;

        await db.collection('unified_products').updateOne(
          { id: productId },
          {
            $set: {
              inStock: isInStock,
              stock: result.currentStock,
              lowStock: isLowStock,
              updatedAt: now,
            },
          },
          { session }
        );

        const event = buildOpeeBusinessEvent({
          eventType: 'tog.inventory.adjusted',
          source: 'gratog.admin.inventory',
          sourceEventId: `${productId}:${now.toISOString()}`,
          correlationId: productId,
          subject: { type: 'inventory', id: productId },
          payload: {
            product_id: productId,
            adjustment,
            previous_stock: previousStock,
            current_stock: Number(result.currentStock || 0),
            low_stock: isLowStock,
            reason_present: Boolean(reason),
          },
        });
        await insertOpeeOutboxEvent(db, event, { session });

        return {
          ok: true,
          newStock: result.currentStock,
          adjustment,
          isLowStock,
          previousStock,
        };
      });

      if (!outcome.ok) {
        return NextResponse.json(
          { success: false, error: outcome.error, details: outcome.details },
          { status: outcome.status }
        );
      }

      logger.info('INVENTORY', `Stock adjusted for ${productId}`, {
        admin: admin.email,
        adjustment,
        newStock: outcome.newStock,
        reason: reason || 'Manual adjustment',
      });

      return NextResponse.json({
        success: true,
        newStock: outcome.newStock,
        adjustment,
        isLowStock: outcome.isLowStock,
        previousStock: outcome.previousStock,
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
