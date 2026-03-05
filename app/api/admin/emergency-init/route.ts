import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * EMERGENCY ADMIN INITIALIZATION
 * 
 * Creates admin user without requiring existing login
 * SECURITY: Requires secret key to prevent abuse
 * 
 * Usage:
 * POST /api/admin/emergency-init
 * Body: { 
 *   "emergencySecret": "your-emergency-secret",
 *   "email": "admin@tasteofgratitude.shop",
 *   "password": "your-password"
 * }
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emergencySecret, email, password, name } = body;
    
    // Verify emergency secret (set in Vercel env vars)
    const EMERGENCY_SECRET = process.env.EMERGENCY_ADMIN_SECRET || process.env.ADMIN_SECRET;
    
    if (!EMERGENCY_SECRET) {
      console.error('[EMERGENCY-INIT] No EMERGENCY_ADMIN_SECRET configured');
      return NextResponse.json({
        error: 'Emergency initialization not configured',
        hint: 'Set EMERGENCY_ADMIN_SECRET in environment variables'
      }, { status: 503 });
    }
    
    if (emergencySecret !== EMERGENCY_SECRET) {
      console.warn('[EMERGENCY-INIT] Invalid emergency secret attempt');
      return NextResponse.json({
        error: 'Invalid emergency secret'
      }, { status: 401 });
    }
    
    if (!email || !password) {
      return NextResponse.json({
        error: 'Email and password required'
      }, { status: 400 });
    }
    
    // Import database connection
    const { connectToDatabase } = await import('@/lib/db-admin');
    const { db } = await connectToDatabase();
    
    // Check if admin already exists
    const existingAdmin = await db.collection('admin_users').findOne({ 
      email: email.toLowerCase() 
    });
    
    if (existingAdmin) {
      logger.info('[EMERGENCY-INIT] Admin already exists:', email);
      return NextResponse.json({
        success: true,
        message: 'Admin user already exists',
        email: email.toLowerCase(),
        note: 'You can now login with your existing credentials'
      });
    }
    
    // Create admin user
    console.log('[EMERGENCY-INIT] Creating admin user:', email);
    const passwordHash = await hashPassword(password);
    
    const adminUser = {
      email: email.toLowerCase(),
      passwordHash,
      name: name || 'Admin User',
      role: 'admin',
      createdAt: new Date(),
      createdBy: 'emergency-init',
      isActive: true,
      mustChangePassword: false
    };
    
    await db.collection('admin_users').insertOne(adminUser);
    
    console.log('[EMERGENCY-INIT] ✅ Admin user created successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      credentials: {
        email: email.toLowerCase(),
        loginUrl: '/admin/login'
      },
      nextSteps: [
        '1. Visit /admin/login',
        '2. Login with your credentials',
        '3. Go to Settings to connect Square (if needed)'
      ]
    });
    
  } catch (error: any) {
    console.error('[EMERGENCY-INIT] Error:', error);
    
    return NextResponse.json({
      error: 'Failed to create admin user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
