import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import bcrypt from 'bcryptjs';
import { ADMIN_SETUP_SECRET } from '@/lib/auth-config';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/setup
 * Creates the initial admin user (one-time setup)
 * 
 * SECURITY: This endpoint is protected by ADMIN_SETUP_SECRET
 * and can optionally be disabled after initial setup.
 */
export async function POST(request) {
  try {
    // Check if setup is disabled
    if (process.env.ADMIN_SETUP_DISABLED === 'true') {
      return NextResponse.json(
        { error: 'Admin setup is disabled' },
        { status: 403 }
      );
    }

    const { secret } = await request.json();
    
    // Require a setup secret to prevent unauthorized access
    if (!ADMIN_SETUP_SECRET) {
      logger.error('AdminSetup', 'ADMIN_SETUP_SECRET not configured');
      return NextResponse.json(
        { error: 'Server misconfigured - setup secret not set' },
        { status: 500 }
      );
    }

    // Validate secret length for security
    if (ADMIN_SETUP_SECRET.length < 32) {
      logger.warn('AdminSetup', 'ADMIN_SETUP_SECRET is too short (should be 32+ chars)');
    }

    if (secret !== ADMIN_SETUP_SECRET) {
      logger.warn('AdminSetup', 'Invalid setup secret attempt');
      return NextResponse.json(
        { error: 'Unauthorized - invalid setup secret' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Get credentials from environment
    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL;
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL;
      if (isProd) {
        return NextResponse.json(
          { error: 'ADMIN_DEFAULT_EMAIL and ADMIN_DEFAULT_PASSWORD must be set in production' },
          { status: 500 }
        );
      }
      logger.warn('AdminSetup', 'Using development admin credentials - NOT FOR PRODUCTION');
    }
    
    const finalEmail = adminEmail || 'admin@dev.local';
    const finalPassword = adminPassword || 'dev-password-change-me';

    // Check if admin already exists
    const existingAdmin = await db.collection('admin_users').findOne({ 
      email: finalEmail.toLowerCase() 
    });

    if (existingAdmin) {
      return NextResponse.json({
        success: false,
        message: 'Admin user already exists',
        admin: {
          createdAt: existingAdmin.createdAt
        }
      });
    }

    // Hash password with strong cost factor
    const hashedPassword = await bcrypt.hash(finalPassword, 12);

    // Create admin user
    const result = await db.collection('admin_users').insertOne({
      email: finalEmail.toLowerCase(),
      passwordHash: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      mustChangePassword: true
    });

    logger.info('AdminSetup', `Admin user created: ${finalEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      admin: {
        id: result.insertedId.toString(),
        loginUrl: '/admin/login'
      }
    });

  } catch (error) {
    logger.error('AdminSetup', 'Admin setup error:', error);
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
 * 
 * SECURITY: This only returns minimal info (boolean) in production
 */
export async function GET() {
  try {
    // Check if setup is disabled
    if (process.env.ADMIN_SETUP_DISABLED === 'true') {
      return NextResponse.json({
        setupDisabled: true,
        setupRequired: false
      });
    }

    const { db } = await connectToDatabase();
    
    const adminCount = await db.collection('admin_users').countDocuments({ 
      role: 'admin' 
    });

    // In production, only return whether setup is required
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    
    if (isProd) {
      return NextResponse.json({
        setupRequired: adminCount === 0
      });
    }

    // In development, return more details
    return NextResponse.json({
      adminExists: adminCount > 0,
      adminCount,
      setupRequired: adminCount === 0
    });

  } catch (error) {
    logger.error('AdminSetup', 'Admin check error:', error);
    return NextResponse.json(
      { error: 'Failed to check admin status' },
      { status: 500 }
    );
  }
}
