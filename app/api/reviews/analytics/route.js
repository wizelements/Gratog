import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    const { db } = await connectToDatabase();

    const matchStage = { approved: true, hidden: false };
    if (productId) matchStage.productId = productId;

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: productId ? null : '$productId',
          productName: { $first: '$productName' },
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          verifiedCount: { $sum: { $cond: ['$verifiedPurchase', 1, 0] } },
          withImages: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$images', []] } }, 0] }, 1, 0] } },
        }
      },
      {
        $project: {
          productId: '$_id',
          productName: 1,
          averageRating: { $round: ['$averageRating', 1] },
          totalReviews: 1,
          ratingDistribution: {
            1: '$rating1',
            2: '$rating2',
            3: '$rating3',
            4: '$rating4',
            5: '$rating5'
          },
          verifiedCount: 1,
          withImages: 1,
          verifiedPercentage: {
            $round: [
              { $multiply: [{ $divide: ['$verifiedCount', { $max: ['$totalReviews', 1] }] }, 100] },
              1
            ]
          }
        }
      },
      { $sort: { totalReviews: -1 } }
    ];

    const analytics = await db.collection('product_reviews').aggregate(pipeline).toArray();

    // If requesting single product analytics
    if (productId) {
      const result = analytics[0] || {
        productId,
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedCount: 0,
        withImages: 0,
        verifiedPercentage: 0
      };

      return NextResponse.json({
        success: true,
        analytics: result
      });
    }

    // Overall stats
    const overallStats = await db.collection('product_reviews').aggregate([
      { $match: { approved: true, hidden: false } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          totalProducts: { $addToSet: '$productId' },
          verifiedCount: { $sum: { $cond: ['$verifiedPurchase', 1, 0] } }
        }
      },
      {
        $project: {
          totalReviews: 1,
          averageRating: { $round: ['$averageRating', 1] },
          uniqueProducts: { $size: '$totalProducts' },
          verifiedCount: 1
        }
      }
    ]).toArray();

    return NextResponse.json({
      success: true,
      overall: overallStats[0] || { totalReviews: 0, averageRating: 0, uniqueProducts: 0, verifiedCount: 0 },
      byProduct: analytics
    });
  } catch (error) {
    console.error('Failed to fetch review analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
