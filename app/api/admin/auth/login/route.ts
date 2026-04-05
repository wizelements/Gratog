/**
 * Hardened Admin Login Route
 * 
 * SECURITY:
 * - Rate limited (5 attempts per 15 minutes)
 * - Password validation with bcrypt
 * - Secure cookie settings
 * - CSRF token generation
 * - Comprehensive audit logging
 * - Account lockout after failed attempts
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { 
  generateAdminToken, 
  setAdminCookie, 
  setCsrfCookie,
  generateCsrfToken,
} from '@/lib/auth/unified-admin';

// ============================================================================
// CONFIGURATION
// ============================================================================

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number; locked?: boolean; lockUntil?: number }>();

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const LoginSchema = z.object({
  email: z.string().email('Invalid email address').min(1).max(254),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().optional().default(false),
}).strict();

// ============================================================================
// RATE LIMITING
// ============================================================================

function checkLoginRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number; locked?: boolean; lockUntil?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // Check if locked
  if (entry?.locked && entry.lockUntil && now < entry.lockUntil) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetAt: entry.lockUntil,
      locked: true,
      lockUntil: entry.lockUntil,
    };
  }
  
  // Clear lock if expired
  if (entry?.locked && entry.lockUntil && now >= entry.lockUntil) {
    rateLimitStore.delete(key);
  }
  
  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + LOCKOUT_DURATION_MS });
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - 1, resetAt: now + LOCKOUT_DURATION_MS };
  }
  
  // Check if max attempts reached
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    // Lock account
    entry.locked = true;
    entry.lockUntil = now + LOCKOUT_DURATION_MS;
    return { 
      allowed: false, 
      remaining: 0, 
      resetAt: entry.lockUntil,
      locked: true,
      lockUntil: entry.lockUntil,
    };
  }
  
  entry.count++;
  return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - entry.count, resetAt: entry.resetAt };
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + LOCKOUT_DURATION_MS });
  } else {
    entry.count++;
  }
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

// ============================================================================
// POST - Login
// ============================================================================

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitKey = `login:${ip}`;
  
  try {
    // Rate limiting check
    const rateLimit = checkLoginRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      const retryAfter = rateLimit.lockUntil 
        ? Math.ceil((rateLimit.lockUntil - Date.now()) / 1000)
        : 900;
      
      logger.warn('LOGIN', 'Rate limit exceeded', { 
        ip, 
        locked: rateLimit.locked,
        retryAfter,
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: rateLimit.locked 
            ? 'Account temporarily locked due to too many failed attempts. Please try again later.'
            : 'Too many login attempts. Please try again later.',
          retryAfter,
          locked: rateLimit.locked,
        },
        { 
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
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
    
    const validation = LoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }
    
    const { email, password, rememberMe } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();
    
    // Get database
    const { db } = await connectToDatabase();
    
    // Find admin user
    const admin = await db.collection('admin_users').findOne({
      email: normalizedEmail,
    });
    
    // Check if user exists and is active
    if (!admin || admin.isActive === false) {
      // Record failed attempt (even for non-existent users to prevent user enumeration)
      recordFailedAttempt(rateLimitKey);
      
      logger.warn('LOGIN', 'Failed login attempt - user not found or inactive', { 
        email: normalizedEmail, 
        ip,
        remaining: rateLimit.remaining - 1,
      });
      
      // Generic error to prevent user enumeration
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    
    if (!isPasswordValid) {
      // Record failed attempt
      recordFailedAttempt(rateLimitKey);
      
      const updatedRateLimit = checkLoginRateLimit(rateLimitKey);
      
      logger.warn('LOGIN', 'Failed login attempt - invalid password', { 
        email: normalizedEmail, 
        ip,
        remaining: updatedRateLimit.remaining,
      });
      
      // Generic error
      const response: Record<string, unknown> = { 
        success: false, 
        error: 'Invalid credentials',
      };
      
      // Warn about remaining attempts
      if (updatedRateLimit.remaining <= 2) {
        response.warning = `${updatedRateLimit.remaining} attempts remaining before temporary lockout`;
      }
      
      return NextResponse.json(response, { status: 401 });
    }
    
    // Password valid - clear rate limit
    rateLimitStore.delete(rateLimitKey);
    
    // Generate JWT token
    const token = await generateAdminToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
    });
    
    // Generate CSRF token
    const csrfToken = generateCsrfToken();
    
    // Update last login
    await db.collection('admin_users').updateOne(
      { id: admin.id },
      { 
        $set: { 
          lastLogin: new Date(),
          lastLoginIp: ip,
        },
        $push: {
          loginHistory: {
            $each: [{ date: new Date(), ip }],
            $slice: -10, // Keep last 10 logins
          },
        },
      }
    );
    
    // Audit log
    await db.collection('audit_logs').insertOne({
      timestamp: new Date(),
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'LOGIN_SUCCESS',
      resource: 'auth',
      details: { ip, userAgent: request.headers.get('user-agent') || 'unknown' },
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      success: true,
    });
    
    // Success response
    logger.info('LOGIN', `Successful login: ${admin.email}`, { ip });
    
    const response = NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        mustChangePassword: admin.mustChangePassword || false,
      },
    });
    
    // Set auth cookie with appropriate expiration
    const cookieMaxAge = rememberMe 
      ? 30 * 24 * 60 * 60 // 30 days
      : 7 * 24 * 60 * 60; // 7 days
    
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'strict',
      path: '/',
      maxAge: cookieMaxAge,
    });
    
    // Set CSRF cookie
    response.cookies.set('admin_csrf', csrfToken, {
      httpOnly: false, // Must be readable by JS
      secure: IS_PRODUCTION,
      sameSite: 'strict',
      path: '/',
      maxAge: cookieMaxAge,
    });
    
    return response;
    
  } catch (error) {
    logger.error('LOGIN', 'Login error', { error, ip });
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
