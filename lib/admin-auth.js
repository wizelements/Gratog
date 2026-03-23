// ISS-008 FIX: Migrated from jsonwebtoken to jose (Edge-compatible)
import { randomUUID } from 'crypto';
import { jwtVerify, SignJWT } from 'jose';
import { hashPassword, comparePassword } from './auth';
import { connectToDatabase } from './db-optimized';
import { logger } from '@/lib/logger';
import { JWT_SECRET } from './auth-config';

const textEncoder = new TextEncoder();

function getJwtSecretKey() {
  return textEncoder.encode(JWT_SECRET);
}

/**
 * Create admin JWT token (async — uses jose)
 */
export async function createAdminToken(adminData) {
  return new SignJWT({
    id: adminData.id,
    email: adminData.email,
    role: 'admin',
    name: adminData.name
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecretKey());
}

/**
 * Verify admin JWT token (async — uses jose)
 */
export async function verifyAdminToken(token) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (payload.role !== 'admin') {
      throw new Error('Not an admin token');
    }
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Get admin from request (middleware helper)
 */
export async function getAdminFromRequest(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAdminToken(token);
    if (!decoded) {
      return null;
    }

    // Get full admin from database
    const { db } = await connectToDatabase();
    const admin = await db.collection('admin_users').findOne({ id: decoded.id });

    if (!admin || !admin.active) {
      return null;
    }

    // Don't return password
    const { password, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
  } catch (error) {
    logger.error('AdminAuth', 'Admin auth error', error);
    return null;
  }
}

/**
 * Require admin authentication (middleware helper)
 */
export async function requireAdmin(request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    throw new Error('Unauthorized - Admin access required');
  }
  return admin;
}

/**
 * Create initial admin user (for setup)
 */
export async function createAdminUser(email, password, name) {
  const { db } = await connectToDatabase();
  
  // Check if admin already exists
  const existing = await db.collection('admin_users').findOne({ email });
  if (existing) {
    throw new Error('Admin user already exists');
  }

  const hashedPassword = await hashPassword(password);
  const adminUser = {
    id: `admin_${randomUUID()}`,
    email,
    password: hashedPassword,
    name,
    role: 'admin',
    active: true,
    createdAt: new Date(),
    lastLogin: null
  };

  await db.collection('admin_users').insertOne(adminUser);
  const { password: _, ...adminWithoutPassword } = adminUser;
  return adminWithoutPassword;
}

/**
 * Login admin user
 */
export async function loginAdmin(email, password) {
  const { db } = await connectToDatabase();
  
  const admin = await db.collection('admin_users').findOne({ email });
  if (!admin) {
    throw new Error('Invalid credentials');
  }

  if (!admin.active) {
    throw new Error('Admin account is disabled');
  }

  const isValid = await comparePassword(password, admin.password);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  await db.collection('admin_users').updateOne(
    { id: admin.id },
    { $set: { lastLogin: new Date() } }
  );

  // Create token
  const token = await createAdminToken(admin);
  const { password: _, ...adminWithoutPassword } = admin;
  
  return {
    admin: adminWithoutPassword,
    token
  };
}
