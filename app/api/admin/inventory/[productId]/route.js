import { NextResponse } from 'next/server';
import { getInventory } from '@/lib/db-admin';
import { verifyToken } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function PATCH(request, { params }) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { productId } = params;
    const { adjustment, reason } = await request.json();

    if (typeof adjustment !== 'number') {
      return NextResponse.json(
        { error: 'Invalid adjustment value' },
        { status: 400 }
      );
    }

    const inventory = await getInventory();
    const item = await inventory.findOne({ productId });

    if (!item) {
      return NextResponse.json(
        { error: 'Product not found in inventory' },
        { status: 404 }
      );
    }

    const newStock = item.currentStock + adjustment;
    
    if (newStock < 0) {
      return NextResponse.json(
        { error: 'Insufficient stock' },
        { status: 400 }
      );
    }

    const historyEntry = {
      date: new Date(),
      adjustment,
      reason: reason || 'Manual adjustment',
      adjustedBy: decoded.email
    };

    await inventory.updateOne(
      { productId },
      {
        $set: {
          currentStock: newStock,
          lastRestocked: adjustment > 0 ? new Date() : item.lastRestocked
        },
        $push: { stockHistory: historyEntry }
      }
    );

    return NextResponse.json({
      success: true,
      newStock,
      adjustment
    });
  } catch (error) {
    logger.error('API', 'Update inventory error', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}
