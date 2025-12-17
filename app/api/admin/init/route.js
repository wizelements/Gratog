import { NextResponse } from 'next/server';
import { getAdminUsers, getInventory } from '@/lib/db-admin';
import { hashPassword } from '@/lib/auth';
import { PRODUCTS } from '@/lib/products';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

export async function POST(request) {
  try {
    const { secret } = await request.json();
    
    // Validate initialization secret from environment
    const INIT_SECRET = process.env.INIT_SECRET;
    if (!INIT_SECRET) {
      return NextResponse.json(
        { error: 'Server misconfigured: INIT_SECRET not set' },
        { status: 500 }
      );
    }
    
    if (secret !== INIT_SECRET) {
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

    // Create default admin user with env password
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD;
    if (!defaultPassword) {
      return NextResponse.json(
        { error: 'Server misconfigured: ADMIN_DEFAULT_PASSWORD not set' },
        { status: 500 }
      );
    }
    
    const hashedPassword = await hashPassword(defaultPassword);
    await adminUsers.insertOne({
      _id: uuidv4(),
      email: process.env.ADMIN_DEFAULT_EMAIL || 'admin@tasteofgratitude.com',
      passwordHash: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date(),
      isActive: true,
      mustChangePassword: true // Force password change on first login
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
        email: process.env.ADMIN_DEFAULT_EMAIL || 'admin@tasteofgratitude.com',
        note: 'Use ADMIN_DEFAULT_PASSWORD from environment. MUST change password after first login.'
      }
    });
  } catch (error) {
    logger.error('API', 'Admin init error', error);
    return NextResponse.json(
      { error: 'Initialization failed: ' + error.message },
      { status: 500 }
    );
  }
}
