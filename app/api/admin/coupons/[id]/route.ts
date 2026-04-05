/**
 * Hardened Individual Coupon API
 * 
 * Security: RBAC, input validation, CSRF, rate limiting, audit logging
 */

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddlewareWithContext, AuthenticatedRequest } from '@/lib/middleware/admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CouponUpdateSchema = z.object({
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
}).strict();

/**
 * GET /api/admin/coupons/[id]
 * Get coupon details
 */
export const GET = withAdminMiddlewareWithContext(
  async (request: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;
    const couponId = params.id;
    
    try {
      // Validate ID format
      if (!ObjectId.isValid(couponId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid coupon ID format' },
          { status: 400 }
        );
      }
      
      const { db } = await connectToDatabase();
      
      const coupon = await db.collection('coupons').findOne(
        { _id: new ObjectId(couponId) },
        {
          projection: {
            // Exclude any sensitive internal fields
            _internalSync: 0,
          },
        }
      );
      
      if (!coupon) {
        return NextResponse.json(
          { success: false, error: 'Coupon not found' },
          { status: 404 }
        );
      }
      
      // Mask customer email
      const sanitizedCoupon = {
        ...coupon,
        customerEmail: coupon.customerEmail ?
          coupon.customerEmail.replace(/(.{2}).*(@)/, '$1***$2') :
          null,
      };
      
      return NextResponse.json({
        success: true,
        coupon: sanitizedCoupon,
      });
      
    } catch (error) {
      logger.error('COUPONS', 'Failed to fetch coupon', { couponId, error });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch coupon' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.COUPONS_VIEW,
    resource: 'coupons',
    action: 'view',
  }
);

/**
 * PATCH /api/admin/coupons/[id]
 * Update coupon (limited fields)
 */
export const PATCH = withAdminMiddlewareWithContext(
  async (request: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;
    const couponId = params.id;
    const admin = request.admin;
    
    try {
      // Validate ID
      if (!ObjectId.isValid(couponId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid coupon ID format' },
          { status: 400 }
        );
      }
      
      // Parse and validate body
      const body = await request.json();
      const validation = CouponUpdateSchema.safeParse(body);
      
      if (!validation.success) {
        const errorMessage = validation.error.errors.map(e => e.message).join('; ');
        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: 400 }
        );
      }
      
      const updates = validation.data;
      
      // Validate expiration if provided
      if (updates.expiresAt) {
        const expiresDate = new Date(updates.expiresAt);
        if (expiresDate <= new Date()) {
          return NextResponse.json(
            { success: false, error: 'Expiration date must be in the future' },
            { status: 400 }
          );
        }
      }
      
      const { db } = await connectToDatabase();
      
      // Check if coupon exists
      const existing = await db.collection('coupons').findOne({ _id: new ObjectId(couponId) });
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Coupon not found' },
          { status: 404 }
        );
      }
      
      // Prevent modifying used coupons
      if (existing.isUsed && Object.keys(updates).some(k => k !== 'isActive')) {
        return NextResponse.json(
          { success: false, error: 'Cannot modify used coupon' },
          { status: 400 }
        );
      }
      
      // Build update
      const updateData: Record<string, unknown> = {
        ...updates,
        updatedAt: new Date(),
        updatedBy: admin.email,
      };
      
      if (updates.expiresAt) {
        updateData.expiresAt = new Date(updates.expiresAt);
      }
      
      await db.collection('coupons').updateOne(
        { _id: new ObjectId(couponId) },
        { $set: updateData }
      );
      
      logger.info('COUPONS', `Coupon ${couponId} updated by ${admin.email}`, {
        fields: Object.keys(updates),
      });
      
      return NextResponse.json({
        success: true,
        message: 'Coupon updated successfully',
      });
      
    } catch (error) {
      logger.error('COUPONS', 'Failed to update coupon', { couponId, error });
      return NextResponse.json(
        { success: false, error: 'Failed to update coupon' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.COUPONS_CREATE,
    resource: 'coupons',
    action: 'update',
    rateLimit: { maxRequests: 30, windowSeconds: 60 },
  }
);

/**
 * DELETE /api/admin/coupons/[id]
 * Delete single coupon
 */
export const DELETE = withAdminMiddlewareWithContext(
  async (request: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;
    const couponId = params.id;
    const admin = request.admin;
    
    try {
      if (!ObjectId.isValid(couponId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid coupon ID format' },
          { status: 400 }
        );
      }
      
      const { db } = await connectToDatabase();
      
      // Get coupon for archiving
      const coupon = await db.collection('coupons').findOne({ _id: new ObjectId(couponId) });
      
      if (!coupon) {
        return NextResponse.json(
          { success: false, error: 'Coupon not found' },
          { status: 404 }
        );
      }
      
      // Archive
      await db.collection('deleted_coupons').insertOne({
        ...coupon,
        deletedBy: admin.email,
        deletedAt: new Date(),
        originalId: coupon._id,
        _id: new ObjectId(),
      });
      
      // Delete
      await db.collection('coupons').deleteOne({ _id: new ObjectId(couponId) });
      
      logger.info('COUPONS', `Coupon ${couponId} deleted by ${admin.email}`);
      
      return NextResponse.json({
        success: true,
        message: 'Coupon deleted successfully',
      });
      
    } catch (error) {
      logger.error('COUPONS', 'Failed to delete coupon', { couponId, error });
      return NextResponse.json(
        { success: false, error: 'Failed to delete coupon' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.COUPONS_DELETE,
    resource: 'coupons',
    action: 'delete',
    rateLimit: { maxRequests: 20, windowSeconds: 60 },
  }
);
