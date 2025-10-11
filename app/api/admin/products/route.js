import { NextResponse } from 'next/server';
import { PRODUCTS } from '@/lib/products';
import { connectToDatabase, getCachedQuery } from '@/lib/db-optimized';

export async function GET() {
  try {
    // Cache the inventory data to reduce database calls
    const productsWithStock = await getCachedQuery('admin_products_with_inventory', async () => {
      const { db } = await connectToDatabase();
      const inventoryData = await db.collection('inventory').find({}).toArray();
      
      // Merge products with inventory data
      return PRODUCTS.map(product => {
        const inventoryItem = inventoryData.find(inv => inv.productId === product.id);
        return {
          ...product,
          stock: inventoryItem?.currentStock || 0,
          lowStockThreshold: inventoryItem?.lowStockThreshold || 10,
          lastRestocked: inventoryItem?.lastRestocked || null
        };
      });
    }, 60000); // Cache for 1 minute

    return NextResponse.json({ products: productsWithStock });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Failed to get products' },
      { status: 500 }
    );
  }
}
