/**
 * Payments Module
 * 
 * Centralized payment functionality for Taste of Gratitude.
 * 
 * Usage:
 * - Server-side config: import { getSquareServerConfig } from '@/lib/payments'
 * - Validation: import { validateSquareConfig } from '@/lib/payments'
 * - Health checks: import { getSquareHealthStatus } from '@/lib/payments'
 * 
 * Client-side components should fetch config from /api/square/config
 * NEVER import server config directly in client components.
 */

export {
  getSquareServerConfig,
  getSquarePublicConfig,
  validateSquareConfig,
  getSquareHealthStatus,
  type SquareServerConfig,
  type SquarePublicConfig,
  type ConfigValidationResult,
} from './config';
