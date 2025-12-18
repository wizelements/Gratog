/**
 * Centralized authentication configuration
 * Single source of truth for JWT secrets and auth settings
 * 
 * SECURITY: This module enforces that secrets are properly configured in production
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const IS_BUILD_TIME = process.env.NEXT_PHASE === 'phase-production-build';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    // Allow build to proceed without secrets - they'll be required at runtime
    if (IS_BUILD_TIME) {
      return 'build-time-placeholder-not-for-use';
    }
    if (IS_PRODUCTION) {
      throw new Error(
        'JWT_SECRET environment variable is required in production. ' +
        'Set this in your Vercel project settings under Environment Variables.'
      );
    }
    console.warn('⚠️ JWT_SECRET not set - using insecure development secret');
    return 'dev-only-insecure-secret-do-not-use-in-production';
  }
  
  if (secret.length < 32) {
    console.warn('⚠️ JWT_SECRET should be at least 32 characters for security');
  }
  
  return secret;
}

function getAdminSetupSecret(): string {
  const secret = process.env.ADMIN_SETUP_SECRET;
  
  if (!secret) {
    if (IS_BUILD_TIME) {
      return 'build-time-placeholder';
    }
    if (IS_PRODUCTION) {
      throw new Error(
        'ADMIN_SETUP_SECRET environment variable is required in production. ' +
        'Set this in your Vercel project settings under Environment Variables.'
      );
    }
    console.warn('⚠️ ADMIN_SETUP_SECRET not set - using insecure development secret');
    return 'dev-setup-secret';
  }
  
  return secret;
}

function getCronSecret(): string {
  const secret = process.env.CRON_SECRET;
  
  if (!secret) {
    if (IS_BUILD_TIME) {
      return 'build-time-placeholder';
    }
    if (IS_PRODUCTION) {
      throw new Error(
        'CRON_SECRET environment variable is required in production. ' +
        'Set this in your Vercel project settings under Environment Variables.'
      );
    }
    console.warn('⚠️ CRON_SECRET not set - using insecure development secret');
    return 'dev-cron-secret';
  }
  
  return secret;
}

function getSyncSecret(): string {
  const secret = process.env.SYNC_SECRET || process.env.ADMIN_SECRET;
  
  if (!secret) {
    if (IS_BUILD_TIME) {
      return 'build-time-placeholder';
    }
    if (IS_PRODUCTION) {
      throw new Error(
        'SYNC_SECRET environment variable is required in production. ' +
        'Set this in your Vercel project settings under Environment Variables.'
      );
    }
    console.warn('⚠️ SYNC_SECRET not set - using insecure development secret');
    return 'dev-sync-secret';
  }
  
  return secret;
}

export const JWT_SECRET = getJwtSecret();
export const ADMIN_SETUP_SECRET = getAdminSetupSecret();
export const CRON_SECRET = getCronSecret();
export const SYNC_SECRET = getSyncSecret();

export const AUTH_CONFIG = {
  jwtExpiresIn: '7d',
  cookieMaxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  cookieOptions: {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'strict' as const,
    path: '/',
  },
} as const;

export { IS_PRODUCTION };
