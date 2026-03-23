// ISS-008 FIX: Migrated from jsonwebtoken to jose (Edge-compatible)
import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';

const textEncoder = new TextEncoder();

function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable must be set in production');
  }
  return textEncoder.encode(secret || 'development-only-insecure-key');
}
const JWT_EXPIRES_IN = '7d';

/**
 * Generate JWT token for user (async — uses jose)
 */
export async function generateToken(userId, email) {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(getJwtSecretKey());
}

/**
 * Verify JWT token (async — uses jose)
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
