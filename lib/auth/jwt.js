import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const DEV_SECRET = 'taste-of-gratitude-jwt-secret-key-2025-secure-random-string';
const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET;

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: JWT_SECRET not set in production. Using fallback key.');
}
const JWT_EXPIRES_IN = '7d';

/**
 * Generate JWT token for user
 */
export function generateToken(userId, email) {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
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
