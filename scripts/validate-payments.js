#!/usr/bin/env node
/**
 * Pre-deployment Payment System Validation
 * 
 * Run before every deployment: npm run validate:payments
 * 
 * Checks:
 * 1. All required environment variables are set
 * 2. Square API credentials are valid (not client secrets)
 * 3. Square API is reachable and credentials work
 * 4. Location ID is valid and active
 * 5. Application ID format is correct
 */

const results = [];
const STRICT_PAYMENT_VALIDATION =
  process.env.CI === 'true' || process.env.REQUIRE_PAYMENT_SECRETS === 'true';

function log(result) {
  results.push(result);
  const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠';
  const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'fail' ? '\x1b[31m' : '\x1b[33m';
  console.log(`${color}${icon}\x1b[0m ${result.check}: ${result.message}`);
}

function logMissingCredential(check, description) {
  if (STRICT_PAYMENT_VALIDATION) {
    log({ check, status: 'fail', message: `Missing! ${description} is required`, fatal: true });
    return;
  }

  log({
    check,
    status: 'warn',
    message: `Missing in local environment. Set ${check} (or REQUIRE_PAYMENT_SECRETS=true) to enforce full credential validation.`,
  });
}

function validateEnvironmentVariables() {
  console.log('\n📋 Checking Environment Variables...\n');

  const requiredVars = [
    { name: 'SQUARE_ACCESS_TOKEN', description: 'Square API access token' },
    { name: 'SQUARE_LOCATION_ID', description: 'Square location ID' },
    { name: 'NEXT_PUBLIC_SQUARE_APPLICATION_ID', description: 'Square application ID' },
  ];

  const optionalVars = [
    { name: 'SQUARE_ENVIRONMENT', description: 'Square environment (sandbox/production)' },
  ];

  for (const v of requiredVars) {
    const value = process.env[v.name];
    if (!value) {
      logMissingCredential(v.name, v.description);
    } else {
      log({ check: v.name, status: 'pass', message: `Set (${value.slice(0, 8)}...)` });
    }
  }

  for (const v of optionalVars) {
    const value = process.env[v.name];
    if (!value) {
      log({ check: v.name, status: 'warn', message: `Not set - will use default` });
    } else {
      log({ check: v.name, status: 'pass', message: `Set: ${value}` });
    }
  }
}

function validateCredentialFormats() {
  console.log('\n🔐 Validating Credential Formats...\n');

  const accessToken = process.env.SQUARE_ACCESS_TOKEN || '';
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '';
  const locationId = process.env.SQUARE_LOCATION_ID || '';

  // Check access token format - THIS IS CRITICAL
  if (accessToken.startsWith('sq0csp-')) {
    log({
      check: 'Access Token Type',
      status: 'fail',
      message: 'Using CLIENT SECRET (sq0csp-). You need a Production Access Token (EAAA... or sq0atp-...)',
      fatal: true
    });
  } else if (accessToken.startsWith('EAAA') || accessToken.startsWith('sq0atp-')) {
    log({ check: 'Access Token Type', status: 'pass', message: 'Valid production access token format' });
  } else if (accessToken.startsWith('sandbox-sq0')) {
    log({ check: 'Access Token Type', status: 'warn', message: 'Sandbox token detected - OK for testing only' });
  } else if (accessToken) {
    log({ check: 'Access Token Type', status: 'warn', message: 'Unknown token format - verify in Square Dashboard' });
  }

  // Check application ID format
  if (applicationId.startsWith('sq0idp-')) {
    log({ check: 'Application ID Format', status: 'pass', message: 'Valid production application ID' });
  } else if (applicationId.startsWith('sandbox-sq0idp-')) {
    log({ check: 'Application ID Format', status: 'warn', message: 'Sandbox application ID - OK for testing' });
  } else if (applicationId) {
    log({ check: 'Application ID Format', status: 'warn', message: 'Unknown format - verify in Square Dashboard' });
  }

  // Check location ID format
  if (locationId && locationId.length > 10) {
    log({ check: 'Location ID Format', status: 'pass', message: `Valid format (${locationId})` });
  } else if (locationId) {
    log({ check: 'Location ID Format', status: 'warn', message: 'Location ID seems short - verify in Square Dashboard' });
  }
}

async function validateSquareConnectivity() {
  console.log('\n🌐 Testing Square API Connectivity...\n');

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const envSetting = process.env.SQUARE_ENVIRONMENT || 'production';

  if (!accessToken || !locationId) {
    if (STRICT_PAYMENT_VALIDATION) {
      log({ check: 'API Connectivity', status: 'fail', message: 'Cannot test - missing credentials', fatal: true });
    } else {
      log({
        check: 'API Connectivity',
        status: 'warn',
        message: 'Skipped in local environment because payment credentials are not set.',
      });
    }
    return;
  }

  const baseUrl = envSetting === 'sandbox' 
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';

  try {
    const response = await fetch(`${baseUrl}/v2/locations`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18'
      }
    });

    const data = await response.json();

    if (response.ok && data.locations && data.locations.length > 0) {
      log({ check: 'API Authentication', status: 'pass', message: `Authenticated - found ${data.locations.length} location(s)` });
      
      const configuredLocation = data.locations.find(l => l.id === locationId);
      if (configuredLocation) {
        log({ 
          check: 'Location Verification', 
          status: 'pass', 
          message: `Found: "${configuredLocation.name}" (${configuredLocation.status})` 
        });
        
        if (configuredLocation.status !== 'ACTIVE') {
          log({ 
            check: 'Location Status', 
            status: 'warn', 
            message: `Location is ${configuredLocation.status} - payments may not work` 
          });
        }

        const capabilities = configuredLocation.capabilities || [];
        if (capabilities.includes('CREDIT_CARD_PROCESSING')) {
          log({ check: 'Payment Capability', status: 'pass', message: 'Credit card processing enabled' });
        } else {
          log({ check: 'Payment Capability', status: 'fail', message: 'Credit card processing NOT enabled for this location', fatal: true });
        }
      } else {
        log({ 
          check: 'Location Verification', 
          status: 'fail', 
          message: `Location ID "${locationId}" not found in your Square account`,
          fatal: true
        });
      }
    } else {
      const errorMsg = data.errors?.[0]?.detail || 'Unknown error';
      log({ check: 'API Authentication', status: 'fail', message: `Failed: ${errorMsg}`, fatal: true });
    }

  } catch (error) {
    log({ check: 'API Connectivity', status: 'fail', message: `Network error: ${error.message}`, fatal: true });
  }
}

function validateWebPaymentsSetup() {
  console.log('\n💳 Checking Web Payments SDK Requirements...\n');

  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  
  if (!applicationId) {
    if (STRICT_PAYMENT_VALIDATION) {
      log({ check: 'Web SDK Setup', status: 'fail', message: 'Missing NEXT_PUBLIC_SQUARE_APPLICATION_ID', fatal: true });
    } else {
      log({
        check: 'Web SDK Setup',
        status: 'warn',
        message: 'Skipped in local environment because NEXT_PUBLIC_SQUARE_APPLICATION_ID is not set.',
      });
    }
    return;
  }

  log({
    check: 'Domain Registration',
    status: 'warn',
    message: 'IMPORTANT: Ensure your domain is added in Square Dashboard!'
  });

  console.log('\n   ⚠️  REQUIRED: Register these domains in Square Dashboard:');
  console.log('   Square Dashboard > Developer > Applications > [Your App] > Web Payments SDK\n');
  console.log('   Production domains to add:');
  console.log('   - https://tasteofgratitude.shop');
  console.log('   - https://gratog-theangelsilvers-projects.vercel.app');
  console.log('');
  console.log('   Development domain:');
  console.log('   - http://localhost:3000');
}

function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warn').length;
  const fatal = results.filter(r => r.fatal).length;

  console.log(`   ✓ Passed:   ${passed}`);
  console.log(`   ⚠ Warnings: ${warnings}`);
  console.log(`   ✗ Failed:   ${failed}`);
  
  if (fatal > 0) {
    console.log(`\n\x1b[31m❌ DEPLOYMENT BLOCKED: ${fatal} fatal error(s) found\x1b[0m`);
    console.log('\nFatal issues that MUST be fixed:');
    results.filter(r => r.fatal).forEach(r => {
      console.log(`   ✗ ${r.check}: ${r.message}`);
    });
    console.log('');
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`\n\x1b[33m⚠️  DEPLOYMENT OK with ${warnings} warning(s)\x1b[0m`);
    console.log('\nReview these warnings:');
    results.filter(r => r.status === 'warn').forEach(r => {
      console.log(`   ⚠ ${r.check}: ${r.message}`);
    });
    console.log('');
    process.exit(0);
  } else {
    console.log(`\n\x1b[32m✅ ALL CHECKS PASSED - Safe to deploy\x1b[0m\n`);
    process.exit(0);
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 PRE-DEPLOYMENT PAYMENT VALIDATION');
  console.log('='.repeat(60));

  if (!STRICT_PAYMENT_VALIDATION) {
    console.log('ℹ️  Running in local mode (missing payment credentials are warnings).');
    console.log('   Set REQUIRE_PAYMENT_SECRETS=true to enforce strict credential checks.\n');
  }

  validateEnvironmentVariables();
  validateCredentialFormats();
  await validateSquareConnectivity();
  validateWebPaymentsSetup();
  generateReport();
}

main().catch(err => {
  console.error('\n\x1b[31m❌ Validation script failed:\x1b[0m', err.message);
  process.exit(1);
});
