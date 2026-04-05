/**
 * Hardened Coupons Admin API
 * 
 * Security: RBAC, input validation, CSRF, rate limiting, audit logging
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware, AuthenticatedRequest } from '@/lib/middleware/admin';
import { CouponCreateSchema, validateBody, ObjectIdSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { ObjectId } from 'mongodb';

/**
 * GET /api/admin/coupons
 * List coupons with filtering and pagination
 */
export const GET = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const status = searchParams.get('status')?.trim();
    const code = searchParams.get('code')?.trim();
    const isUsed = searchParams.get('isUsed');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const skip = (page - 1) * limit;
    
    try {
      const { db } = await connectToDatabase();
      
      // Build query with whitelist validation
      const query: Record<string, unknown> = {};
      
      if (status && ['active', 'expired', 'used'].includes(status)) {
        query.status = status;
      }
      
      if (code) {
        // Safe partial match with length limit
        const sanitizedCode = code.slice(0, 50).toUpperCase();
        query.code = { $regex: sanitizedCode, $options: 'i' };
      }
      
      if (isUsed !== null && isUsed !== undefined) {
        query.isUsed = isUsed === 'true';
      }
      
      // Whitelist sort fields
      const allowedSortFields = ['createdAt', 'code', 'expiresAt', 'usedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      
      // Get coupons with pagination
      const [coupons, total] = await Promise.all([
        db.collection('coupons')
          .find(query)
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limit)
          .project({
            _id: 1,
            id: 1,
            code: 1,
            discountAmount: 1,
            discountPercent: 1,
            freeShipping: 1,
            isUsed: 1,
            usedAt: 1,
            usedBy: 1,
            orderId: 1,
            expiresAt: 1,
            maxUses: 1,
            currentUses: 1,
            createdAt: 1,
            updatedAt: 1,
            customerEmail: 1,
            // Exclude sensitive fields
          })
          .toArray(),
        db.collection('coupons').countDocuments(query),
      ]);
      
      // Get summary stats
      const statsAgg = await db.collection('coupons').aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $and: [{ $ne: ['$isUsed', true] }, { $or: [{ $eq: ['$expiresAt', null] }, { $gt: ['$expiresAt', new Date()] }] }] }, 1, 0] } },
            used: { $sum: { $cond: ['$isUsed', 1, 0] } },
            expired: { $sum: { $cond: [{ $and: [{ $ne: ['$isUsed', true] }, { $lt: ['$expiresAt', new Date()] }] }, 1, 0] } },
          },
        },
      ]).toArray();
      
      const stats = statsAgg[0] || { total: 0, active: 0, used: 0, expired: 0 };
      
      // Mask customer emails for privacy
      const sanitizedCoupons = coupons.map(coupon => ({
        ...coupon,
        customerEmail: coupon.customerEmail ? 
          coupon.customerEmail.replace(/(.{2}).*(@)/, '$1***$2') : 
          null,
      }));
      
      return NextResponse.json({
        success: true,
        coupons: sanitizedCoupons,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        stats,
      });
      
    } catch (error) {
      logger.error('COUPONS', 'Failed to fetch coupons', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch coupons' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.COUPONS_VIEW,
    resource: 'coupons',
    action: 'list',
  }
);

/**
 * POST /api/admin/coupons
 * Create a new coupon
 */
export const POST = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const admin = request.admin;
    
    try {
      const body = await request.json();
      
      // Validate with Zod
      const validation = validateBody(body, CouponCreateSchema);
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      
      const { code, discountAmount, discountPercent, freeShipping, maxUses, expiresAt, minimumOrderAmount } = validation.data;
      
      // Normalize code
      const normalizedCode = code.toUpperCase().trim();
      
      const { db } = await connectToDatabase();
      
      // Check for duplicate code
      const existing = await db.collection('coupons').findOne({ code: normalizedCode });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Coupon code already exists' },
          { status: 409 }
        );
      }
      
      // Validate expiration date if provided
      let expiresDate: Date | null = null;
      if (expiresAt) {
        expiresDate = new Date(expiresAt);
        if (expiresDate <= new Date()) {
          return NextResponse.json(
            { success: false, error: 'Expiration date must be in the future' },
            { status: 400 }
          );
        }
        // Max 1 year in future
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 1);
        if (expiresDate > maxDate) {
          return NextResponse.json(
            { success: false, error: 'Expiration date must be within 1 year' },
            { status: 400 }
          );
        }
      }
      
      // Calculate discount type
      const discountType = discountPercent ? 'percentage' : discountAmount ? 'fixed' : 'free_shipping';
      
      const coupon = {
        id: `coupon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        code: normalizedCode,
        discountAmount: discountAmount || null,
        discountPercent: discountPercent || null,
        freeShipping: freeShipping || false,
        discountType,
        isUsed: false,
        usedAt: null,
        usedBy: null,
        orderId: null,
        expiresAt: expiresDate,
        maxUses: maxUses || null,
        currentUses: 0,
        minimumOrderAmount: minimumOrderAmount || null,
        createdBy: admin.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.collection('coupons').insertOne(coupon);
      
      logger.info('COUPONS', `Coupon created by ${admin.email}`, {
        code: normalizedCode,
        discountType,
      });
      
      return NextResponse.json(
        {
          success: true,
          coupon: {
            id: coupon.id,
            code: coupon.code,
            discountType,
            isUsed: false,
            expiresAt: coupon.expiresAt,
          },
        },
        { status: 201 }
      );
      
    } catch (error) {
      logger.error('COUPONS', 'Failed to create coupon', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create coupon' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.COUPONS_CREATE,
    resource: 'coupons',
    action: 'create',
    rateLimit: { maxRequests: 30, windowSeconds: 60 },
  }
);

/**
 * DELETE /api/admin/coupons
 * Bulk delete coupons
 */
export const DELETE = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const admin = request.admin;
    
    try {
      const body = await request.json();
      const { couponIds } = body;
      
      if (!Array.isArray(couponIds) || couponIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Coupon IDs array is required' },
          { status: 400 }
        );
      }
      
      if (couponIds.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Maximum 100 coupons can be deleted at once' },
          { status: 400 }
        );
      }
      
      // Validate all IDs
      const objectIds: ObjectId[] = [];
      for (const id of couponIds) {
        if (!ObjectId.isValid(id)) {
          return NextResponse.json(
            { success: false, error: `Invalid coupon ID: ${id}` },
            { status: 400 }
          );
        }
        objectIds.push(new ObjectId(id));
      }
      
      const { db } = await connectToDatabase();
      
      // Archive before delete
      const couponsToDelete = await db.collection('coupons')
        .find({ _id: { $in: objectIds } })
        .toArray();
      
      if (couponsToDelete.length > 0) {
        await db.collection('deleted_coupons').insertMany(
          couponsToDelete.map(c => ({
            ...c,
            deletedBy: admin.email,
            deletedAt: new Date(),
            originalId: c._id,
            _id: new ObjectId(),
          }))
        );
      }
      
      // Delete
      const result = await db.collection('coupons').deleteMany(
        { _id: { $in: objectIds } }
      );
      
      logger.info('COUPONS', `Coupons deleted by ${admin.email}`, {
        count: result.deletedCount,
      });
      
      return NextResponse.json({
        success: true,
        deletedCount: result.deletedCount,
        archivedCount: couponsToDelete.length,
      });
      
    } catch (error) {
      logger.error('COUPONS', 'Failed to delete coupons', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete coupons' },
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
