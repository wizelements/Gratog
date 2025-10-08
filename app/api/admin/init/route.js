import { NextResponse } from 'next/server';
import { getAdminUsers, getInventory } from '@/lib/db-admin';
import { hashPassword } from '@/lib/auth';
import { PRODUCTS } from '@/lib/products';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const { secret } = await request.json();
    
    // Simple secret to prevent unauthorized init
    if (secret !== 'taste-of-gratitude-init-2025') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminUsers = await getAdminUsers();
    const inventory = await getInventory();

    // Check if admin already exists
    const existingAdmin = await adminUsers.findOne({ email: 'admin@tasteofgratitude.com' });
    
    if (existingAdmin) {
      return NextResponse.json({
        message: 'Admin already initialized',
        email: 'admin@tasteofgratitude.com'
      });
    }

    // Create default admin user
    const hashedPassword = await hashPassword('TasteOfGratitude2025!');
    await adminUsers.insertOne({
      _id: uuidv4(),
      email: 'admin@tasteofgratitude.com',
      passwordHash: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date(),
      isActive: true
    });

    // Initialize inventory for all products
    const inventoryItems = PRODUCTS.map(product => ({
      _id: uuidv4(),
      productId: product.id,
      productName: product.name,
      currentStock: 50, // Default stock
      lowStockThreshold: 10,
      lastRestocked: new Date(),
      stockHistory: [{
        date: new Date(),
        adjustment: 50,
        reason: 'Initial stock',
        adjustedBy: 'system'
      }]
    }));

    await inventory.insertMany(inventoryItems);

    return NextResponse.json({
      success: true,
      message: 'Admin initialized successfully',
      credentials: {
        email: 'admin@tasteofgratitude.com',
        password: 'TasteOfGratitude2025!',
        note: 'Please change this password after first login'
      }
    });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json(
      { error: 'Initialization failed: ' + error.message },
      { status: 500 }
    );
  }
}
