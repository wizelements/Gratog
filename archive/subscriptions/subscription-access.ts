/**
 * Subscription access token utilities
 * Generates secure tokens for subscription management without requiring login
 */

import { logger } from './logger';
import { Cache } from './redis';

const TOKEN_PREFIX = 'sub_token';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SubscriptionAccessPayload {
  email: string;
  subscriptionId: string;
  permissions?: string[];
}

/**
 * Generate a secure subscription access token
 * This allows customers to manage subscriptions without logging in
 */
export function generateSubscriptionAccessToken(payload: SubscriptionAccessPayload): string {
  const token = `${TOKEN_PREFIX}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  try {
    Cache.set(token, payload, TOKEN_TTL_SECONDS);
    logger.info('Subscriptions', 'Generated access token', { 
      subscriptionId: payload.subscriptionId,
      email: payload.email 
    });
    return token;
  } catch (error) {
    logger.error('Subscriptions', 'Error generating access token', { error });
    throw new Error('Failed to generate access token');
  }
}

/**
 * Validate a subscription access token
 */
export function validateSubscriptionAccessToken(token: string): SubscriptionAccessPayload | null {
  try {
    const payload = Cache.get(token);
    if (!payload) {
      logger.warn('Subscriptions', 'Invalid or expired token', { token: token.substring(0, 10) + '...' });
      return null;
    }
    return payload as SubscriptionAccessPayload;
  } catch (error) {
    logger.error('Subscriptions', 'Error validating token', { error });
    return null;
  }
}

export const verifySubscriptionAccessToken = validateSubscriptionAccessToken;

/**
 * Revoke a subscription access token
 */
export function revokeSubscriptionAccessToken(token: string): boolean {
  try {
    Cache.delete(token);
    logger.info('Subscriptions', 'Revoked access token', { token: token.substring(0, 10) + '...' });
    return true;
  } catch (error) {
    logger.error('Subscriptions', 'Error revoking token', { error });
    return false;
  }
}

/**
 * Extend token expiration
 */
export function extendSubscriptionAccessToken(token: string): boolean {
  try {
    const payload = Cache.get(token);
    if (!payload) {
      return false;
    }
    Cache.set(token, payload, TOKEN_TTL_SECONDS);
    return true;
  } catch (error) {
    logger.error('Subscriptions', 'Error extending token', { error });
    return false;
  }
}

// Default export
export default {
  generateSubscriptionAccessToken,
  validateSubscriptionAccessToken,
  verifySubscriptionAccessToken,
  revokeSubscriptionAccessToken,
  extendSubscriptionAccessToken
};
