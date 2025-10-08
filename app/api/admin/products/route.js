import { NextResponse } from 'next/server';
import { PRODUCTS } from '@/lib/products';
import { getInventory } from '@/lib/db-admin';

export async function GET() {
  try {
    const inventory = await getInventory();
    const inventoryData = await inventory.find({}).toArray();
    
    // Merge products with inventory data
    const productsWithStock = PRODUCTS.map(product => {
      const inventoryItem = inventoryData.find(inv => inv.productId === product.id);
      return {
        ...product,
        stock: inventoryItem?.currentStock || 0,
        lowStockThreshold: inventoryItem?.lowStockThreshold || 10,
        lastRestocked: inventoryItem?.lastRestocked || null
      };
    });

    return NextResponse.json({ products: productsWithStock });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Failed to get products' },
      { status: 500 }
    );
  }
}
