export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { connectToDatabase } from '@/lib/db-optimized';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin auth
    const session = await getAdminSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: productId } = await params;
    const { db } = await connectToDatabase();

    // Find product
    const product = await db.collection('products').findOne({
      $or: [{ _id: productId }, { source_id: productId }, { slug: productId }]
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // If there's a Square catalog sync function, use it
    // For now, mark product as sync-requested and return current state
    await db.collection('products').updateOne(
      { _id: product._id },
      { $set: { lastSyncRequested: new Date(), syncStatus: 'pending' } }
    );

    return NextResponse.json({
      success: true,
      message: 'Product sync initiated',
      product: {
        id: product._id?.toString() || product.source_id,
        title: product.title,
        slug: product.slug,
        syncStatus: 'pending',
        lastSyncRequested: new Date(),
      },
    });
  } catch (error) {
    console.error('Product sync error:', error);
    return NextResponse.json({ success: false, error: 'Failed to sync product' }, { status: 500 });
  }
}
