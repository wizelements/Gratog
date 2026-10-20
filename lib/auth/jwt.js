// ISS-008 FIX: Migrated from jsonwebtoken to jose (Edge-compatible)
import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import {openTursoPreview,tursoPreviewSelected} from '../checkout/turso-preview-runtime.mjs';
import {createTursoCustomerSession,verifyTursoCustomerSession,revokeTursoCustomerSession} from './turso-customer-accounts.mjs';

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
export async function generateToken(userId, email, options={}) {
  const claims=tursoPreviewSelected()
    ? await createTursoCustomerSession(await openTursoPreview(),userId,email,options.passwordHash) : {userId,email};
  return new SignJWT(claims)
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
    const { payload } = await jwtVerify(token, getJwtSecretKey(),{algorithms:['HS256']});
    if(tursoPreviewSelected())return verifyTursoCustomerSession(await openTursoPreview(),payload);
    return payload;
  } catch (error) {
    return null;
  }
}

/** Revoke the persisted customer session before acknowledging logout. */
export async function revokeToken(token) {
  if(!token||!tursoPreviewSelected())return;
  let payload;
  try {({payload}=await jwtVerify(token,getJwtSecretKey(),{algorithms:['HS256']}));}
  catch {return;}
  await revokeTursoCustomerSession(await openTursoPreview(),payload);
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
