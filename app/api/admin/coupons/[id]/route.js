import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-admin';
import { verifyToken } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function DELETE(request, { params }) {
  // Verify admin authentication
  const token = request.cookies.get('admin_token')?.value;
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  try {
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

    return NextResponse.json({
      success: true,
      message: 'Coupon deleted successfully'
    });

  } catch (error) {
    logger.error('API', 'Error deleting coupon', error);
    return NextResponse.json(
      { error: 'Failed to delete coupon' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  // Verify admin authentication
  const token = request.cookies.get('admin_token')?.value;
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  try {
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
          updatedAt: new Date().toISOString()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Coupon updated successfully'
    });

  } catch (error) {
    logger.error('API', 'Error updating coupon', error);
    return NextResponse.json(
      { error: 'Failed to update coupon' },
      { status: 500 }
    );
  }
}