import { NextResponse } from 'next/server';
import { getAdminUsers, getInventory } from '@/lib/db-admin';
import { hashPassword } from '@/lib/auth';
import { PRODUCTS } from '@/lib/products';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/init
 * Initialize admin user and inventory
 * 
 * SECURITY: Protected by INIT_SECRET environment variable
 * Can be disabled via ADMIN_INIT_DISABLED env var
 */
export async function POST(request) {
  try {
    // Check if init is disabled
    if (process.env.ADMIN_INIT_DISABLED === 'true') {
      return NextResponse.json(
        { error: 'Admin initialization is disabled' },
        { status: 403 }
      );
    }

    const { secret } = await request.json();
    
    // Validate initialization secret from environment
    const INIT_SECRET = process.env.INIT_SECRET;
    if (!INIT_SECRET) {
      logger.error('AdminInit', 'INIT_SECRET not configured');
      return NextResponse.json(
        { error: 'Server misconfigured: INIT_SECRET not set' },
        { status: 500 }
      );
    }
    
    // Validate secret length
    if (INIT_SECRET.length < 32) {
      logger.warn('AdminInit', 'INIT_SECRET should be at least 32 characters');
    }
    
    if (secret !== INIT_SECRET) {
      logger.warn('AdminInit', 'Invalid init secret attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminUsers = await getAdminUsers();
    const inventory = await getInventory();

    // Check if admin already exists
    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@tasteofgratitude.net';
    const existingAdmin = await adminUsers.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      return NextResponse.json({
        message: 'Admin already initialized',
        alreadyExists: true
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
      email: adminEmail,
      passwordHash: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date(),
      isActive: true,
      mustChangePassword: true
    });

    // Initialize inventory for all products
    const inventoryItems = PRODUCTS.map(product => ({
      _id: uuidv4(),
      productId: product.id,
      productName: product.name,
      currentStock: 50,
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

    logger.info('AdminInit', `Admin initialized successfully: ${adminEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Admin initialized successfully',
      note: 'Change password after first login'
    });
  } catch (error) {
    logger.error('AdminInit', 'Admin init error:', error);
    return NextResponse.json(
      { error: 'Initialization failed' },
      { status: 500 }
    );
  }
}
