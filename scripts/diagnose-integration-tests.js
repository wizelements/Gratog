#!/usr/bin/env node

/**
 * Integration Test Diagnostics
 * Diagnoses issues with database and API integration tests
 * Run: node scripts/diagnose-integration-tests.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, status = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
    check: '🔍',
    waiting: '⏳'
  };
  
  const colorMap = {
    info: colors.cyan,
    success: colors.green,
    error: colors.red,
    warn: colors.yellow,
    check: colors.cyan,
    waiting: colors.yellow
  };
  
  console.log(`${colorMap[status]}${icons[status]} ${msg}${colors.reset}`);
}

function exec(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...options });
  } catch (err) {
    return null;
  }
}

function checkMongoDB() {
  log('Checking MongoDB connectivity...', 'check');
  
  const status = exec('mongosh --eval "db.adminCommand({ping: 1})" --quiet mongodb://localhost:27017 2>&1', { stdio: 'pipe' });
  
  if (status !== null && !status.includes('error') && !status.includes('Error')) {
    log('MongoDB is accessible on localhost:27017', 'success');
    return true;
  }
  
  log('MongoDB is NOT accessible', 'error');
  console.log('  Possible solutions:');
  console.log('  1. Start MongoDB: docker run -d --name mongo -p 27017:27017 mongo:6.0');
  console.log('  2. Check if running: docker ps | grep mongo');
  console.log('  3. Check connection string in .env.local');
  
  return false;
}

function checkEnvironmentVariables() {
  log('Checking environment variables...', 'check');
  
  const required = [
    'MONGODB_URI',
    'MONGO_URL',
    'JWT_SECRET',
    'NEXT_PUBLIC_BASE_URL'
  ];
  
  const missing = [];
  
  required.forEach(env => {
    if (!process.env[env]) {
      missing.push(env);
    }
  });
  
  if (missing.length === 0) {
    log('All required environment variables are set', 'success');
    return true;
  }
  
  log(`Missing ${missing.length} environment variables`, 'warn');
  missing.forEach(env => {
    console.log(`  - ${env}`);
  });
  
  return false;
}

function checkBuildHealth() {
  log('Checking build health...', 'check');
  
  if (!fs.existsSync('.next')) {
    log('No .next build directory found', 'warn');
    console.log('  Running build...');
    const buildResult = exec('yarn build', { stdio: 'inherit' });
    if (buildResult !== null) {
      log('Build completed successfully', 'success');
      return true;
    }
    log('Build failed', 'error');
    return false;
  }
  
  log('Build directory exists', 'success');
  return true;
}

function checkTestConfig() {
  log('Checking integration test configurations...', 'check');
  
  const configs = [
    { file: 'vitest.integration.config.ts', desc: 'API Integration Tests' },
    { file: 'vitest.db.config.ts', desc: 'Database Integration Tests' }
  ];
  
  const missing = [];
  
  configs.forEach(({ file, desc }) => {
    if (fs.existsSync(file)) {
      log(`${desc} config exists`, 'success');
    } else {
      log(`${desc} config NOT FOUND`, 'error');
      missing.push(file);
    }
  });
  
  if (missing.length === 0) {
    log('All test configs are present', 'success');
    return true;
  }
  
  return false;
}

function checkServerStartup() {
  log('Checking server startup capability...', 'check');
  
  const startResult = exec('timeout 10 yarn start 2>&1 | head -20', { stdio: 'pipe' });
  
  if (startResult && !startResult.includes('error')) {
    log('Server appears to start successfully', 'success');
    return true;
  }
  
  log('Server startup may have issues', 'warn');
  console.log('  Suggested debugging:');
  console.log('  1. yarn build');
  console.log('  2. yarn start');
  console.log('  3. Check console for error messages');
  
  return false;
}

function checkSquareConfig() {
  log('Checking Square configuration...', 'check');
  
  const hasToken = !!process.env.SQUARE_ACCESS_TOKEN;
  const hasEnv = !!process.env.SQUARE_ENVIRONMENT;
  
  if (hasToken && hasEnv) {
    log('Square credentials are configured', 'success');
    return true;
  }
  
  log('Square credentials are missing or incomplete', 'warn');
  if (!hasToken) console.log('  - Missing SQUARE_ACCESS_TOKEN');
  if (!hasEnv) console.log('  - Missing SQUARE_ENVIRONMENT');
  
  return false;
}

function checkHealthEndpoint() {
  log('Checking /api/health endpoint...', 'check');
  
  const route = 'app/api/health/route.ts';
  
  if (fs.existsSync(route)) {
    log('Health check endpoint exists', 'success');
    return true;
  }
  
  log('Health check endpoint NOT FOUND', 'error');
  return false;
}

function printDiagnosticSummary(results) {
  console.log('\n' + colors.bold + '📋 DIAGNOSTIC SUMMARY' + colors.reset + '\n');
  
  const passed = Object.values(results).filter(v => v).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([check, passed]) => {
    const status = passed ? 'success' : 'error';
    const icon = passed ? '✅' : '❌';
    const checkName = check.replace(/([A-Z])/g, ' $1').trim();
    log(`${checkName}: ${passed ? 'PASS' : 'FAIL'}`, status);
  });
  
  console.log(`\nStatus: ${passed}/${total} checks passed\n`);
  
  if (passed === total) {
    log('All systems ready for integration tests!', 'success');
    console.log('\nRun: yarn test:api');
  } else {
    log('Some systems need attention before running tests', 'warn');
    console.log('\nFix the issues above, then run: yarn test:api');
  }
}

function main() {
  console.clear();
  console.log(colors.bold + '🔍 INTEGRATION TEST DIAGNOSTICS' + colors.reset + '\n');
  
  const results = {
    'MongoDB Connectivity': checkMongoDB(),
    'Environment Variables': checkEnvironmentVariables(),
    'Build Health': checkBuildHealth(),
    'Test Configurations': checkTestConfig(),
    'Server Startup': checkServerStartup(),
    'Square Configuration': checkSquareConfig(),
    'Health Endpoint': checkHealthEndpoint()
  };
  
  console.log('');
  printDiagnosticSummary(results);
}

main();
