import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-admin';
import { requireAdmin } from '@/lib/admin-session';
import { logger } from '@/lib/logger';

export async function DELETE(request, { params }) {
  try {
    const admin = await requireAdmin(request);
    
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Coupon ID is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Delete the coupon
    const result = await db.collection('coupons').deleteOne({ id });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    logger.info('API', `Coupon ${id} deleted by ${admin.email}`);

    return NextResponse.json({
      success: true,
      message: 'Coupon deleted successfully'
    });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Error deleting coupon', error);
    return NextResponse.json(
      { error: 'Failed to delete coupon' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const admin = await requireAdmin(request);
    
    const { id } = params;
    const updates = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Coupon ID is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Update the coupon
    const result = await db.collection('coupons').updateOne(
      { id },
      { 
        $set: {
          ...updates,
          updatedAt: new Date().toISOString(),
          updatedBy: admin.email
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    logger.info('API', `Coupon ${id} updated by ${admin.email}`);

    return NextResponse.json({
      success: true,
      message: 'Coupon updated successfully'
    });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Error updating coupon', error);
    return NextResponse.json(
      { error: 'Failed to update coupon' },
      { status: 500 }
    );
  }
}
