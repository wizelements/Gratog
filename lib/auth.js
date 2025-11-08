import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Lazy getter for JWT_SECRET - only validates when actually used
function getJWTSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
      'Please add it to your Vercel environment variables: Settings > Environment Variables'
    );
  }
  return secret;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId, email, role) {
  return jwt.sign(
    { userId, email, role },
    getJWTSecret(),
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getJWTSecret());
  } catch (error) {
    return null;
  }
}

export function getTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}
