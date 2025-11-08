import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import bcrypt from 'bcrypt';

/**
 * POST /api/admin/setup
 * Creates the initial admin user (one-time setup)
 * 
 * This endpoint is for first-time setup only
 */
export async function POST(request) {
  try {
    const { secret } = await request.json();
    
    // Require a setup secret to prevent unauthorized access
    const setupSecret = process.env.ADMIN_SETUP_SECRET || 'setup-admin-2025';
    
    if (secret !== setupSecret) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid setup secret' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Get credentials from environment or use defaults
    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@tasteofgratitude.com';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'TasteOfGratitude2025!';

    // Check if admin already exists
    const existingAdmin = await db.collection('users').findOne({ 
      email: adminEmail.toLowerCase() 
    });

    if (existingAdmin) {
      return NextResponse.json({
        success: false,
        message: 'Admin user already exists',
        admin: {
          email: existingAdmin.email,
          createdAt: existingAdmin.createdAt
        }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create admin user
    const result = await db.collection('users').insertOne({
      email: adminEmail.toLowerCase(),
      passwordHash: hashedPassword,
      password: hashedPassword, // Compatibility field
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    });

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      admin: {
        id: result.insertedId.toString(),
        email: adminEmail,
        loginUrl: '/admin/login',
        credentials: {
          email: adminEmail,
          password: '(check environment variables)'
        }
      }
    });

  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json(
      { 
        error: 'Setup failed', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/setup
 * Check if admin user exists
 */
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    
    const adminCount = await db.collection('users').countDocuments({ 
      role: 'admin' 
    });

    const admin = await db.collection('users').findOne({ 
      role: 'admin' 
    });

    return NextResponse.json({
      adminExists: adminCount > 0,
      adminCount,
      adminEmail: admin?.email || null,
      setupRequired: adminCount === 0
    });

  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json(
      { error: 'Failed to check admin status' },
      { status: 500 }
    );
  }
}
