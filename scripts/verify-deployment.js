#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Runs all local tests to verify deployment readiness
 * Run: npm run verify:deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, type = 'info') {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️', check: '🔍', test: '🧪' };
  const colorMap = { info: colors.cyan, success: colors.green, error: colors.red, warn: colors.yellow, check: colors.cyan, test: colors.cyan };
  console.log(`${colorMap[type]}${icons[type]} ${msg}${colors.reset}`);
}

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'inherit' });
  } catch (err) {
    return null;
  }
}

function execQuiet(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
  } catch (err) {
    return null;
  }
}

async function main() {
  console.clear();
  console.log(colors.bold + '\n🚀 DEPLOYMENT VERIFICATION\n' + colors.reset);
  
  const results = {};
  const startTime = Date.now();

  // 1. TypeScript check
  log('TypeScript check...', 'check');
  const tsResult = execQuiet('yarn tsc --noEmit --skipLibCheck 2>&1');
  results.typescript = !tsResult || !tsResult.includes('error');
  if (results.typescript) {
    log('✅ TypeScript: No errors', 'success');
  } else {
    log('❌ TypeScript: Errors found', 'error');
  }
  console.log('');

  // 2. ESLint
  log('ESLint check...', 'check');
  const eslintResult = execQuiet('yarn lint 2>&1');
  results.eslint = !eslintResult || !eslintResult.includes('error');
  if (results.eslint) {
    log('✅ ESLint: Passing', 'success');
  } else {
    log('❌ ESLint: Found errors', 'error');
  }
  console.log('');

  // 3. Build
  log('Building application...', 'test');
  console.log('');
  const buildResult = exec('yarn build');
  results.build = buildResult !== null;
  console.log('');
  if (results.build) {
    log('✅ Build: Success', 'success');
  } else {
    log('❌ Build: Failed', 'error');
  }
  console.log('');

  // 4. Unit tests
  log('Running unit tests...', 'test');
  console.log('');
  const unitResult = exec('yarn test:unit 2>&1 | tail -20');
  results.unit = unitResult && unitResult.includes('passed');
  console.log('');
  if (results.unit) {
    log('✅ Unit tests: Passing', 'success');
  } else {
    log('❌ Unit tests: Failed or skipped', 'error');
  }
  console.log('');

  // 5. Smoke tests
  log('Running smoke tests...', 'test');
  console.log('');
  const smokeResult = exec('yarn test:smoke 2>&1 | tail -20');
  results.smoke = smokeResult && smokeResult.includes('passed');
  console.log('');
  if (results.smoke) {
    log('✅ Smoke tests: Passing', 'success');
  } else {
    log('❌ Smoke tests: Failed or skipped', 'error');
  }
  console.log('');

  // Summary
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const passed = Object.values(results).filter(v => v).length;
  const total = Object.keys(results).length;

  console.log(colors.bold + '═══════════════════════════════════════\n' + colors.reset);
  log('VERIFICATION SUMMARY', 'check');
  console.log('');
  
  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? 'success' : 'error';
    log(`${name.charAt(0).toUpperCase() + name.slice(1)}: ${passed ? 'PASS' : 'FAIL'}`, status);
  });

  console.log('');
  log(`Total: ${passed}/${total} checks passed`, passed === total ? 'success' : 'warn');
  log(`Time: ${elapsed}s`, 'info');
  console.log('');

  if (passed === total) {
    log('✅ DEPLOYMENT READY', 'success');
    console.log('\nThe application is ready for deployment.');
    console.log('All tests pass locally and build succeeds.\n');
    console.log('Waiting for GitHub Actions to execute integration tests...');
    console.log('Run: npm run ci:monitor\n');
    process.exit(0);
  } else {
    log('❌ DEPLOYMENT NOT READY', 'error');
    console.log('\nFix the failures above before deploying.\n');
    process.exit(1);
  }
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'error');
  process.exit(1);
});
