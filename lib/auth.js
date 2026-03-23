// ISS-008 FIX: Migrated from jsonwebtoken to jose (Edge-compatible)
import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import { JWT_SECRET } from './auth-config';

const textEncoder = new TextEncoder();

function getJwtSecretKey() {
  return textEncoder.encode(JWT_SECRET);
}

/**
 * Hash a plain text password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} True if passwords match
 */
export async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Verify password (alias for comparePassword)
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} True if passwords match
 */
export async function verifyPassword(password, hashedPassword) {
  return comparePassword(password, hashedPassword);
}

/**
 * Generate JWT token for user (async — uses jose)
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} role - User role
 * @returns {Promise<string>} JWT token
 */
export async function generateToken(userId, email, role = 'admin') {
  // If called with just length parameter (old usage), generate random string
  if (typeof userId === 'number') {
    const { randomBytes } = await import('crypto');
    return randomBytes(Math.ceil(userId / 2)).toString('hex').slice(0, userId);
  }
  
  return new SignJWT({ userId, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecretKey());
}

/**
 * Verify JWT token (async — uses jose)
 * @param {string} token - JWT token
 * @returns {Promise<Object|null>} Decoded token or null if invalid
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
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid phone
 */
export function isValidPhone(phone) {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
}
