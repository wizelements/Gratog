/**
 * Square Environment Validator - EMERGENT RUNBOOK Implementation
 * Validates Square configuration on startup per zero-defect standards
 */

interface SquareEnvConfig {
  environment: 'sandbox' | 'production';
  applicationId: string;
  accessToken: string;
  locationId: string;
  webhookSignatureKey?: string;
  allowedOrigins: string[];
  siteBaseUrl: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: Partial<SquareEnvConfig>;
}

export function validateSquareEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const config: Partial<SquareEnvConfig> = {
    environment: (process.env.SQUARE_ENVIRONMENT as any) || 'production',
    applicationId: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '',
    accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
    locationId: process.env.SQUARE_LOCATION_ID || '',
    webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    allowedOrigins: (process.env.SQUARE_ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    siteBaseUrl: process.env.NEXT_PUBLIC_BASE_URL || ''
  };
  
  // Critical validations
  if (!config.applicationId) {
    errors.push('SQUARE_APPLICATION_ID is required');
  }
  
  if (!config.accessToken) {
    errors.push('SQUARE_ACCESS_TOKEN is required');
  }
  
  if (!config.locationId) {
    errors.push('SQUARE_LOCATION_ID is required');
  }
  
  if (!config.siteBaseUrl) {
    errors.push('NEXT_PUBLIC_BASE_URL is required');
  }
  
  // Token format validation
  if (config.accessToken) {
    const tokenPrefix = config.accessToken.substring(0, 10);
    if (config.environment === 'production' && !config.accessToken.startsWith('EAAA') && !config.accessToken.startsWith('sq0')) {
      warnings.push(`Production environment but token prefix is ${tokenPrefix} - verify token is for production`);
    }
    
    if (config.environment === 'sandbox' && !config.accessToken.startsWith('sandbox-')) {
      warnings.push('Sandbox environment but token doesn\'t start with "sandbox-"');
    }
  }
  
  // Webhook signature validation
  if (!config.webhookSignatureKey) {
    warnings.push('SQUARE_WEBHOOK_SIGNATURE_KEY not set - webhook signature verification disabled');
  }
  
  // Origin validation  
  if (config.allowedOrigins.length === 0) {
    warnings.push('SQUARE_ALLOWED_ORIGINS not configured - CORS may fail');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config: config as SquareEnvConfig
  };
}

export function printSquareConfig(maskSecrets = true): void {
  const result = validateSquareEnvironment();
  
  console.log('\n🔍 SQUARE CONFIGURATION VALIDATION');
  console.log('=====================================');
  
  if (result.valid) {
    console.log('✅ Status: VALID');
  } else {
    console.log('❌ Status: INVALID');
  }
  
  console.log('\n📋 Configuration:');
  console.log(`  Environment: ${result.config.environment}`);
  console.log(`  Application ID: ${maskSecrets ? maskString(result.config.applicationId || '') : result.config.applicationId}`);
  console.log(`  Access Token: ${maskSecrets ? maskString(result.config.accessToken || '') : result.config.accessToken}`);
  console.log(`  Location ID: ${result.config.locationId}`);
  console.log(`  Site Base URL: ${result.config.siteBaseUrl}`);
  console.log(`  Allowed Origins: ${result.config.allowedOrigins?.join(', ') || 'none'}`);
  console.log(`  Webhook Key: ${result.config.webhookSignatureKey ? '✅ Set' : '⚠️  Not set'}`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    result.errors.forEach(err => console.log(`  - ${err}`));
  }
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    result.warnings.forEach(warn => console.log(`  - ${warn}`));
  }
  
  console.log('=====================================\n');
  
  if (!result.valid) {
    throw new Error('Square configuration validation failed. Fix errors before proceeding.');
  }
}

function maskString(str: string): string {
  if (!str || str.length < 8) return '***';
  return str.substring(0, 6) + '...' + str.substring(str.length - 4);
}

export function getSquareConfig(): SquareEnvConfig {
  const result = validateSquareEnvironment();
  
  if (!result.valid) {
    throw new Error(`Square configuration invalid: ${result.errors.join(', ')}`);
  }
  
  return result.config as SquareEnvConfig;
}
