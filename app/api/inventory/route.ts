import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import DailyInventory from '@/models/DailyInventory';
import { getTodayDateString } from '@/lib/date-utils';

export const runtime = 'nodejs';

/**
 * GET /api/inventory?marketId=xxx
 * Returns today's inventory for a specific market
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('marketId') || 'serenbe-farmers-market';
    
    await connectToDatabase();
    
    const today = getTodayDateString();
    let inventory = await DailyInventory.findOne({
      marketId,
      date: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59') },
    });

    // If no inventory for today, create from Square catalog
    if (!inventory) {
      // This would typically fetch from Square and create initial inventory
      // For now, return empty with flag to create
      return NextResponse.json({
        inventory: null,
        needsSetup: true,
        message: 'Inventory not set up for today',
      });
    }

    return NextResponse.json({
      inventory: {
        marketId: inventory.marketId,
        marketName: inventory.marketName,
        date: inventory.date,
        isClosed: inventory.isClosed,
        items: inventory.items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          category: item.category,
          initialQuantity: item.initialQuantity,
          remaining: item.initialQuantity - item.soldCount,
          isSoldOut: item.isSoldOut,
        })),
      },
    });
  } catch (error) {
    console.error('Inventory fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory
 * Update inventory (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketId, items, action } = body;
    
    await connectToDatabase();
    
    const today = getTodayDateString();
    
    if (action === 'setup') {
      // Create new daily inventory
      const existing = await DailyInventory.findOne({
        marketId,
        date: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59') },
      });
      
      if (existing) {
        return NextResponse.json({ error: 'Inventory already exists for today' }, { status: 400 });
      }
      
      const inventory = await DailyInventory.create({
        marketId,
        marketName: body.marketName || 'Serenbe Farmers Market',
        date: new Date(today),
        items: items.map((item: any) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          category: item.category,
          initialQuantity: item.quantity,
          soldCount: 0,
          isSoldOut: false,
        })),
      });
      
      return NextResponse.json({ success: true, inventory });
    }
    
    if (action === 'update') {
      // Update specific item
      const { productId, isSoldOut, adjustment } = body;
      
      const update: any = {};
      if (isSoldOut !== undefined) update['items.$.isSoldOut'] = isSoldOut;
      if (adjustment) update['items.$.soldCount'] = adjustment;
      
      await DailyInventory.updateOne(
        {
          marketId,
          date: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59') },
          'items.productId': productId,
        },
        { $set: update }
      );
      
      return NextResponse.json({ success: true });
    }
    
    if (action === 'close') {
      // Mark inventory as closed for the day
      await DailyInventory.updateOne(
        {
          marketId,
          date: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59') },
        },
        { $set: { isClosed: true } }
      );
      
      return NextResponse.json({ success: true, message: 'Market closed' });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Inventory update error:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}
