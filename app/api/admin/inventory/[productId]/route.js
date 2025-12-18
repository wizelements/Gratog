import { NextResponse } from 'next/server';
import { getInventory } from '@/lib/db-admin';
import { requireAdmin } from '@/lib/admin-session';
import { logger } from '@/lib/logger';

export async function PATCH(request, { params }) {
  try {
    const admin = await requireAdmin(request);

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
      adjustedBy: admin.email
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

    logger.info('API', `Inventory updated for ${productId} by ${admin.email}: ${adjustment}`);

    return NextResponse.json({
      success: true,
      newStock,
      adjustment
    });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Update inventory error', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}
