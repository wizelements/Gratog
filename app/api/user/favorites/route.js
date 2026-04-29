import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { connectToDatabase } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Get auth token from cookie
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const userId = decoded.userId;

    // Aggregate to find most ordered products
    const favorites = await db.collection('orders').aggregate([
      // Match orders for this user
      { $match: { 'customer.userId': userId } },
      
      // Unwind items array
      { $unwind: '$items' },
      
      // Group by product and count
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          price: { $first: '$items.price' },
          image: { $first: '$items.image' },
          slug: { $first: '$items.slug' },
          totalOrdered: { $sum: '$items.quantity' }
        }
      },
      
      // Sort by most ordered
      { $sort: { totalOrdered: -1 } },
      
      // Limit to top 6
      { $limit: 6 },
      
      // Reshape output
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: 1,
          price: 1,
          image: 1,
          slug: 1,
          totalOrdered: 1
        }
      }
    ]).toArray();

    return NextResponse.json({
      success: true,
      favorites
    });
  } catch (error) {
    console.error('Favorites fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}
