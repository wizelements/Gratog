// ISS-008 FIX: Migrated from jsonwebtoken to jose (Edge-compatible)
import { randomUUID } from 'crypto';
import { jwtVerify, SignJWT } from 'jose';
import { hashPassword, comparePassword } from './auth';
import { connectToDatabase } from './db-optimized';
import { logger } from '@/lib/logger';
import { JWT_SECRET } from './auth-config';
import {getAdminSession} from '@/lib/auth/unified-admin';
import {isActiveAdminRecord,isSessionVersion} from '@/lib/auth/admin-session-policy.mjs';
import {establishMongoAdminLogin} from '@/lib/auth/mongo-admin-session.mjs';

const textEncoder = new TextEncoder();

function getJwtSecretKey() {
  return textEncoder.encode(JWT_SECRET);
}

/**
 * Create admin JWT token (async — uses jose)
 */
export async function createAdminToken(adminData) {
  if (!isSessionVersion(adminData.tokenVersion)) throw new Error('ADMIN_SESSION_VERSION_REQUIRED');
  return new SignJWT({
    id: adminData.id,
    email: adminData.email,
    role: adminData.role,
    sessionVersion: adminData.tokenVersion,
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
    if (!['admin','super_admin'].includes(payload.role) || !isSessionVersion(payload.sessionVersion)) {
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
  return getAdminSession(request);
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

  let admin = await db.collection('admin_users').findOne({ email });
  if (!admin) {
    throw new Error('Invalid credentials');
  }

  if (!isActiveAdminRecord(admin)) {
    throw new Error('Admin account is disabled');
  }

  const isValid = await comparePassword(password, admin.password);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  admin = await establishMongoAdminLogin(db.collection('admin_users'), admin, 'password');

  // Create token
  const token = await createAdminToken(admin);
  const { password: _, ...adminWithoutPassword } = admin;

  return {
    admin: adminWithoutPassword,
    token
  };
}
