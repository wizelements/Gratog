import { verifyAuth } from '@/lib/auth/middleware';
import { getDB } from '@/lib/db-client';
import { ObjectId } from 'mongodb';

/**
 * GET /api/user/wishlist
 * Retrieve user's wishlist
 */
export async function GET(req) {
  try {
    const userId = await verifyAuth(req);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();
    const wishlist = await db.collection('wishlists').findOne({ 
      userId: new ObjectId(userId) 
    });
    
    return Response.json({
      items: wishlist?.items || [],
      count: wishlist?.items?.length || 0,
      createdAt: wishlist?.createdAt,
      updatedAt: wishlist?.updatedAt
    });
  } catch (error) {
    console.error('Wishlist GET error:', error);
    return Response.json({ 
      error: 'Failed to fetch wishlist',
      message: error.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/user/wishlist
 * Add item to wishlist
 * Body: { productId: string }
 */
export async function POST(req) {
  try {
    const userId = await verifyAuth(req);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await req.json();
    
    if (!productId) {
      return Response.json({ 
        error: 'Invalid request',
        message: 'productId is required'
      }, { status: 400 });
    }

    const db = await getDB();
    const userObjectId = new ObjectId(userId);
    const productObjectId = new ObjectId(productId);

    const result = await db.collection('wishlists').updateOne(
      { userId: userObjectId },
      { 
        $addToSet: { items: productObjectId },
        $set: { 
          updatedAt: new Date(),
          userId: userObjectId
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    return Response.json({ 
      success: true, 
      message: 'Added to wishlist',
      acknowledged: result.acknowledged
    });
  } catch (error) {
    console.error('Wishlist POST error:', error);
    return Response.json({ 
      error: 'Failed to add to wishlist',
      message: error.message 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/user/wishlist
 * Remove item from wishlist
 * Body: { productId: string }
 */
export async function DELETE(req) {
  try {
    const userId = await verifyAuth(req);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await req.json();
    
    if (!productId) {
      return Response.json({ 
        error: 'Invalid request',
        message: 'productId is required'
      }, { status: 400 });
    }

    const db = await getDB();
    const userObjectId = new ObjectId(userId);
    const productObjectId = new ObjectId(productId);

    const result = await db.collection('wishlists').updateOne(
      { userId: userObjectId },
      { 
        $pull: { items: productObjectId },
        $set: { updatedAt: new Date() }
      }
    );

    return Response.json({ 
      success: true, 
      message: 'Removed from wishlist',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Wishlist DELETE error:', error);
    return Response.json({ 
      error: 'Failed to remove from wishlist',
      message: error.message 
    }, { status: 500 });
  }
}

/**
 * PATCH /api/user/wishlist
 * Clear entire wishlist
 */
export async function PATCH(req) {
  try {
    const userId = await verifyAuth(req);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();
    const userObjectId = new ObjectId(userId);

    const result = await db.collection('wishlists').updateOne(
      { userId: userObjectId },
      { 
        $set: { 
          items: [],
          updatedAt: new Date()
        }
      }
    );

    return Response.json({ 
      success: true, 
      message: 'Wishlist cleared',
      acknowledged: result.acknowledged
    });
  } catch (error) {
    console.error('Wishlist PATCH error:', error);
    return Response.json({ 
      error: 'Failed to clear wishlist',
      message: error.message 
    }, { status: 500 });
  }
}
