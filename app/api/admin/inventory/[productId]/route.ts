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
        { projection: { currentStock: 1, stockVerified: 1, lastRestocked: 1 } }
      );
      
      if (!current) {
        return NextResponse.json(
          { success: false, error: 'Product not found in inventory' },
          { status: 404 }
        );
      }
      if (current.stockVerified !== true) {
        return NextResponse.json(
          { success: false, error: 'Inventory requires an absolute verified merchant count before adjustments.' },
          { status: 409 }
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
 * An authorized merchant can establish the FIRST physical count without
 * inheriting old seed/demo defaults. This is an absolute, audited count,
 * not an unverified increment.
 */
export const PUT = withAdminMiddlewareWithContext(
  async (request: AuthenticatedRequest, context: { params: Promise<Record<string, string>> }) => {
    const { productId } = await context.params;
    if (!productId || typeof productId !== 'string' || productId.length > 128) {
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 });
    }
    try {
      const body = await request.json();
      const newStock = body?.currentStock;
      const reason = body?.reason;
      if (!Number.isSafeInteger(newStock) || newStock < 0 || newStock > 1000000 ||
          typeof reason !== 'string' || reason.trim().length < 8 || reason.length > 500) {
        return NextResponse.json({
          success: false,
          error: 'Enter an absolute nonnegative inventory count and an audit reason (8–500 characters).',
        }, { status: 400 });
      }
      const { db } = await connectToDatabase();
      const product = await db.collection('unified_products').findOne(
        { id: productId }, { projection: { id: 1, name: 1 } }
      );
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found in merchant catalog.' },
          { status: 404 });
      }
      const now = new Date();
      const previous = await db.collection('inventory').findOne({ productId });
      const update = await db.collection('inventory').findOneAndUpdate(
        { productId },
        {
          $set: {
            currentStock: newStock,
            stockVerified: true,
            stockSource: 'merchant_admin',
            lastVerifiedAt: now,
            verifiedBy: request.admin.email,
            updatedAt: now,
            updatedBy: request.admin.email,
            productName: product.name,
            isActive: true,
          },
          $setOnInsert: {
            productId,
            createdAt: now,
            lowStockThreshold: 5,
          },
        },
        { upsert: true, returnDocument: 'after' }
      );
      if (!update) throw new Error('Inventory verification did not persist');
      await db.collection('inventory_events').insertOne({
        type: 'merchant_count_verification',
        productId,
        oldStock: previous?.currentStock ?? null,
        newStock,
        reason: reason.trim(),
        actor: request.admin.email,
        createdAt: now,
      });
      await db.collection('unified_products').updateOne(
        { id: productId },
        { $set: { stock: newStock, inStock: newStock > 0, updatedAt: now } }
      );
      return NextResponse.json({
        success: true,
        productId,
        currentStock: newStock,
        stockVerified: true,
        inventorySource: 'merchant_admin',
      }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      logger.error('INVENTORY', 'Failed to verify absolute merchant inventory', { productId, error });
      return NextResponse.json({ success: false, error: 'Inventory verification failed' },
        { status: 500 });
    }
  },
  {
    permission: PERMISSIONS.INVENTORY_ADJUST,
    resource: 'inventory',
    action: 'verify_count',
    rateLimit: { maxRequests: 20, windowSeconds: 60 },
  }
);
