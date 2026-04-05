/**
 * Hardened Admin Setup Route
 * 
 * SECURITY: This endpoint creates the initial admin user.
 * - Rate limited to prevent brute force
 * - Requires strong setup secret
 * - Can be disabled via environment variable
 * - Validates all inputs
 * - Audit logs all attempts
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { generateCsrfToken } from '@/lib/auth/unified-admin';

// ============================================================================
// CONFIGURATION
// ============================================================================

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

// Rate limiting (in-memory, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const SetupRequestSchema = z.object({
  secret: z.string().min(1, 'Setup secret is required'),
  email: z.string().email().optional(), // Optional, falls back to env
  password: z.string().min(8).optional(), // Optional, falls back to env
  name: z.string().min(1).max(100).optional(),
}).strict();

// ============================================================================
// RATE LIMITING
// ============================================================================

function checkRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, resetAt: now + windowMs };
  }
  
  if (entry.count >= maxRequests) {
    return { allowed: false, resetAt: entry.resetAt };
  }
  
  entry.count++;
  return { allowed: true, resetAt: entry.resetAt };
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

// ============================================================================
// POST - Create initial admin
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request);
  
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const rateLimit = checkRateLimit(`setup:${ip}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      logger.warn('SETUP', 'Rate limit exceeded', { ip });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }
    
    // Check if setup is disabled
    if (process.env.ADMIN_SETUP_DISABLED === 'true') {
      logger.warn('SETUP', 'Setup attempted but disabled', { ip });
      return NextResponse.json(
        { success: false, error: 'Admin setup is disabled' },
        { status: 403 }
      );
    }
    
    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
    const validation = SetupRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors.map(e => e.message).join('; ') },
        { status: 400 }
      );
    }
    
    const { secret, email: providedEmail, password: providedPassword, name: providedName } = validation.data;
    
    // Validate setup secret
    const setupSecret = process.env.ADMIN_SETUP_SECRET;
    
    if (!setupSecret) {
      logger.error('SETUP', 'ADMIN_SETUP_SECRET not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Constant-time comparison to prevent timing attacks
    if (!timingSafeEqual(secret, setupSecret)) {
      logger.warn('SETUP', 'Invalid setup secret attempt', { ip });
      return NextResponse.json(
        { success: false, error: 'Invalid setup secret' },
        { status: 401 }
      );
    }
    
    // Get credentials (from request or env)
    const adminEmail = providedEmail || process.env.ADMIN_DEFAULT_EMAIL;
    const adminPassword = providedPassword || process.env.ADMIN_DEFAULT_PASSWORD;
    const adminName = providedName || 'Admin User';
    
    if (!adminEmail || !adminPassword) {
      logger.error('SETUP', 'Admin credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Admin credentials not configured' },
        { status: 500 }
      );
    }
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(adminPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    // Check if admin already exists
    const existingAdmin = await db.collection('admin_users').findOne({
      email: adminEmail.toLowerCase(),
    });
    
    if (existingAdmin) {
      logger.info('SETUP', 'Admin already exists', { email: adminEmail });
      return NextResponse.json({
        success: false,
        error: 'Admin user already exists',
        exists: true,
      }, { status: 409 });
    }
    
    // Hash password with high cost
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    // Generate admin ID
    const adminId = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Generate CSRF token for future requests
    const csrfToken = generateCsrfToken();
    
    // Create admin user
    const newAdmin = {
      id: adminId,
      email: adminEmail.toLowerCase(),
      passwordHash: hashedPassword,
      name: adminName,
      role: 'admin',
      isActive: true,
      mustChangePassword: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'setup',
      csrfToken,
    };
    
    await db.collection('admin_users').insertOne(newAdmin);
    
    // Log success
    logger.info('SETUP', `Admin created successfully`, {
      adminId,
      email: adminEmail,
      ip,
      duration: Date.now() - startTime,
    });
    
    // Audit log
    await db.collection('audit_logs').insertOne({
      timestamp: new Date(),
      adminId,
      adminEmail,
      action: 'ADMIN_CREATED',
      resource: 'admin_users',
      resourceId: adminId,
      details: { createdBy: 'setup', ip },
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      success: true,
    });
    
    // Success response
    const response = NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      admin: {
        id: adminId,
        email: adminEmail.toLowerCase(),
        name: adminName,
        loginUrl: '/admin/login',
      },
      security: {
        mustChangePassword: true,
        csrfToken,
      },
    });
    
    // Set CSRF cookie
    response.cookies.set('admin_csrf', csrfToken, {
      httpOnly: false,
      secure: IS_PRODUCTION,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    return response;
    
  } catch (error) {
    logger.error('SETUP', 'Setup failed', { error, ip });
    return NextResponse.json(
      { success: false, error: 'Setup failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Check if setup is needed
// ============================================================================

export async function GET() {
  try {
    // Check if setup is disabled
    if (process.env.ADMIN_SETUP_DISABLED === 'true') {
      return NextResponse.json({
        success: true,
        setupRequired: false,
        disabled: true,
      });
    }
    
    const { db } = await connectToDatabase();
    
    // Check for any admin users
    const adminCount = await db.collection('admin_users').countDocuments({
      role: { $in: ['admin', 'super_admin'] },
    });
    
    return NextResponse.json({
      success: true,
      setupRequired: adminCount === 0,
      hasAdmins: adminCount > 0,
    });
    
  } catch (error) {
    logger.error('SETUP', 'Failed to check setup status', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do comparison to maintain constant time
    const dummy = '0'.repeat(b.length);
    let result = 0;
    for (let i = 0; i < dummy.length; i++) {
      result |= dummy.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password must be at most 128 characters' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  
  // Check for common passwords
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  if (commonPasswords.some(p => password.toLowerCase().includes(p))) {
    return { valid: false, message: 'Password contains common weak patterns' };
  }
  
  return { valid: true };
}
