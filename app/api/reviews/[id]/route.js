import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

// Admin endpoint to hide/show reviews
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { hidden, adminKey } = await request.json();

    // Simple admin authentication (in production, use proper auth)
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();

    const result = await db.collection('product_reviews').updateOne(
      { _id: id },
      {
        $set: {
          hidden: hidden === true,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: hidden ? 'Review hidden' : 'Review visible',
    });
  } catch (error) {
    console.error('Failed to update review:', { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

// Admin endpoint to delete reviews
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('adminKey');

    // Simple admin authentication
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();

    const result = await db.collection('product_reviews').deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Review deleted',
    });
  } catch (error) {
    console.error('Failed to delete review:', { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}
