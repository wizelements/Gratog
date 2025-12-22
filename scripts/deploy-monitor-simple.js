#!/usr/bin/env node

/**
 * Simple Continuous Deployment Monitor
 * Polls for failures locally and fixes them
 * Run: npm run deploy:monitor
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHECK_INTERVAL = 30000; // 30 seconds
const MAX_ATTEMPTS = 10;

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, type = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
    waiting: '⏳',
    check: '🔍',
    fix: '🔧'
  };
  
  const colorMap = {
    info: colors.cyan,
    success: colors.green,
    error: colors.red,
    warn: colors.yellow,
    waiting: colors.yellow,
    check: colors.cyan,
    fix: colors.yellow
  };
  
  console.log(`${colorMap[type]}${icons[type]} ${msg}${colors.reset}`);
}

function execSafe(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...options });
  } catch (err) {
    return null;
  }
}

function execVerbose(cmd, stdio = 'inherit') {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio });
  } catch (err) {
    return null;
  }
}

function checkFailureContext() {
  if (fs.existsSync('FAILURE_CONTEXT.md')) {
    const content = fs.readFileSync('FAILURE_CONTEXT.md', 'utf8');
    return {
      exists: true,
      hasFailures: content.includes('Failed Jobs') || content.includes('failed'),
      content
    };
  }
  return { exists: false, hasFailures: false };
}

function getLatestFailureReport() {
  const dir = '.failure-reports';
  if (!fs.existsSync(dir)) {
    return null;
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(dir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) return null;

  try {
    const data = JSON.parse(
      fs.readFileSync(path.join(dir, files[0].name), 'utf8')
    );
    return { file: files[0].name, data };
  } catch {
    return null;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fixAndRetry(attemptNumber) {
  log(`\n${'='.repeat(60)}`, 'info');
  log(`FIX ATTEMPT #${attemptNumber}`, 'fix');
  log(`${'='.repeat(60)}`, 'info');
  console.log('');

  // Run diagnostics
  log('Running diagnostics...', 'check');
  console.log('');
  execVerbose('node scripts/diagnose-integration-tests.js');
  console.log('');

  // Show failure context if exists
  const report = getLatestFailureReport();
  if (report) {
    log('Latest failure report:', 'info');
    console.log(`  File: ${report.file}`);
    if (report.data.failedJobs && report.data.failedJobs[0]) {
      console.log(`  Failed: ${report.data.failedJobs[0].name}`);
    }
    console.log('');
  }

  // Common fixes
  log('Applying auto-fixes...', 'fix');
  
  // Fix 1: Clear caches
  log('Clearing build cache...', 'fix');
  execSafe('rm -rf .next');
  
  // Fix 2: Check MongoDB
  log('Checking MongoDB...', 'check');
  const mongoCheck = execSafe('mongosh --eval "db.adminCommand({ping: 1})" --quiet mongodb://localhost:27017 2>&1');
  if (!mongoCheck || mongoCheck.includes('error')) {
    log('MongoDB not running - trying to start...', 'warn');
    execSafe('docker run -d --name mongo -p 27017:27017 mongo:6.0 2>/dev/null');
    await sleep(3000);
  }

  // Fix 3: Set environment variables
  log('Verifying environment variables...', 'fix');
  if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';
    log('Set MONGODB_URI', 'success');
  }
  if (!process.env.MONGO_URL) {
    process.env.MONGO_URL = 'mongodb://localhost:27017/test_db';
    log('Set MONGO_URL', 'success');
  }

  // Fix 4: Build
  log('Running build...', 'fix');
  const buildResult = execSafe('yarn build 2>&1 | tail -30');
  if (buildResult && buildResult.includes('error')) {
    log('Build failed:', 'error');
    console.log(buildResult);
    return false;
  }
  log('Build successful', 'success');

  // Fix 5: Run local tests
  log('Running integration tests locally...', 'fix');
  console.log('');
  
  const testCmd = 'MONGODB_URI=mongodb://localhost:27017/test_db MONGO_URL=mongodb://localhost:27017/test_db timeout 180 yarn test:api 2>&1 | tail -50';
  const testResult = execSafe(testCmd);
  
  if (testResult) {
    if (testResult.includes('passed')) {
      log('Tests PASSED locally!', 'success');
      return true;
    }
    if (testResult.includes('failed') || testResult.includes('error')) {
      log('Tests still failing:', 'error');
      console.log(testResult.substring(Math.max(0, testResult.length - 1000)));
      return false;
    }
  }

  return false;
}

async function main() {
  console.clear();
  console.log(colors.bold + '\n🚀 DEPLOYMENT MONITOR - Continuous Testing Loop\n' + colors.reset);
  
  const startTime = new Date();
  let attempt = 1;

  log(`Started: ${startTime.toLocaleString()}`, 'info');
  log(`Checking for failures every ${CHECK_INTERVAL/1000}s`, 'info');
  console.log('');

  while (attempt <= MAX_ATTEMPTS) {
    log(`\n[${new Date().toLocaleTimeString()}] Check #${attempt}`, 'check');

    // Check for failures
    const failure = checkFailureContext();
    
    if (!failure.exists) {
      log('No failure context found - waiting...', 'waiting');
      await sleep(CHECK_INTERVAL);
      attempt++;
      continue;
    }

    if (!failure.hasFailures) {
      log('✅ TESTS PASSED - No failures detected!', 'success');
      const elapsed = Math.round((Date.now() - startTime.getTime()) / 1000);
      console.log(`\nDeployment successful in ${elapsed}s`);
      log(`Completed: ${new Date().toLocaleString()}`, 'info');
      console.log('');
      log('Monitor complete.', 'success');
      break;
    }

    // Failures detected - try to fix
    log('❌ FAILURES DETECTED', 'error');
    const canFix = await fixAndRetry(attempt);

    if (canFix) {
      log('✅ Tests now passing!', 'success');
      const elapsed = Math.round((Date.now() - startTime.getTime()) / 1000);
      console.log(`\nDeployment successful in ${elapsed}s (attempt #${attempt})`);
      log(`Completed: ${new Date().toLocaleString()}`, 'info');
      console.log('');
      break;
    }

    // Try again
    if (attempt < MAX_ATTEMPTS) {
      log(`Waiting ${CHECK_INTERVAL/1000}s before next attempt...`, 'waiting');
      await sleep(CHECK_INTERVAL);
      attempt++;
    }
  }

  if (attempt > MAX_ATTEMPTS) {
    log('\n⚠️  Max attempts reached', 'error');
    console.log('');
    console.log('Manual investigation needed:');
    console.log('');
    console.log('1. Check failure context:');
    console.log('   cat FAILURE_CONTEXT.md');
    console.log('');
    console.log('2. Run full diagnostics:');
    console.log('   npm run diagnose');
    console.log('');
    console.log('3. View failure reports:');
    console.log('   ls -la .failure-reports/');
    console.log('');
    console.log('4. Check GitHub Actions:');
    console.log('   https://github.com/wizelements/Gratog/actions');
    console.log('');
  }
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'error');
  process.exit(1);
});
