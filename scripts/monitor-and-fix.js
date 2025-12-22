#!/usr/bin/env node

/**
 * Real-time Deployment Monitor & Auto-Fix
 * Catches failures locally and in GitHub Actions, fixes them
 * Run: npm run monitor
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
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️', waiting: '⏳', check: '🔍', fix: '🔧' };
  const colorMap = { info: colors.cyan, success: colors.green, error: colors.red, warn: colors.yellow, waiting: colors.yellow, check: colors.cyan, fix: colors.yellow };
  console.log(`${colorMap[type]}${icons[type]} ${msg}${colors.reset}`);
}

function exec(cmd, silent = false) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
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

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function diagnose() {
  log('Running diagnostics...', 'check');
  const result = execQuiet('node scripts/diagnose-integration-tests.js 2>&1');
  
  const issues = {
    mongoDown: result.includes('NOT accessible'),
    missingEnv: result.includes('Missing 4 environment variables') || result.includes('MONGODB_URI') || result.includes('MONGO_URL'),
    squareMissing: result.includes('missing or incomplete'),
    testsFailing: false
  };
  
  return issues;
}

async function fixMongoDB() {
  log('Starting MongoDB...', 'fix');
  execQuiet('docker rm mongo -f 2>/dev/null');
  execQuiet('docker run -d --name mongo -p 27017:27017 mongo:6.0');
  await sleep(3000);
  
  const check = execQuiet('mongosh --eval "db.adminCommand({ping: 1})" --quiet mongodb://localhost:27017 2>&1');
  if (!check || check.includes('error')) {
    log('MongoDB startup failed', 'error');
    return false;
  }
  log('MongoDB started successfully', 'success');
  return true;
}

async function fixEnvironment() {
  log('Setting environment variables...', 'fix');
  
  const envVars = {
    MONGODB_URI: 'mongodb://localhost:27017/test_db',
    MONGO_URL: 'mongodb://localhost:27017/test_db',
    JWT_SECRET: 'test-jwt-secret-key-for-local-dev-minimum-32-chars',
    NEXT_PUBLIC_BASE_URL: 'http://localhost:3000'
  };
  
  for (const [key, val] of Object.entries(envVars)) {
    process.env[key] = val;
    log(`Set ${key}`, 'success');
  }
  
  return true;
}

async function fixBuild() {
  log('Cleaning and rebuilding...', 'fix');
  execQuiet('rm -rf .next');
  const result = exec('yarn build', false);
  
  if (!result || execQuiet('yarn build 2>&1').includes('error')) {
    log('Build failed', 'error');
    return false;
  }
  
  log('Build successful', 'success');
  return true;
}

async function fixTests() {
  log('Running integration tests...', 'check');
  console.log('');
  
  const cmd = 'MONGODB_URI=mongodb://localhost:27017/test_db MONGO_URL=mongodb://localhost:27017/test_db timeout 300 yarn test:api 2>&1';
  const result = exec(cmd, false);
  
  console.log('');
  
  if (!result) {
    log('Tests timed out', 'error');
    return false;
  }
  
  if (result.includes('passed') && !result.includes('failed')) {
    log('All tests PASSED', 'success');
    return true;
  }
  
  if (result.includes('FAIL') || result.includes('failed')) {
    log('Tests still failing - showing last errors:', 'error');
    console.log(result.split('\n').slice(-30).join('\n'));
    return false;
  }
  
  return true;
}

async function main() {
  console.clear();
  console.log(colors.bold + '\n🚀 REAL-TIME DEPLOYMENT MONITOR & AUTO-FIX\n' + colors.reset);
  
  const startTime = new Date();
  let attempt = 1;
  
  while (attempt <= 5) {
    console.log(`\n${'='.repeat(60)}`);
    log(`ATTEMPT #${attempt}`, 'check');
    console.log(`${'='.repeat(60)}\n`);
    
    // Diagnose
    const issues = await diagnose();
    console.log('');
    
    if (!issues.mongoDown && !issues.missingEnv && !issues.squareMissing) {
      log('All prerequisites met - running tests', 'success');
      const testsPassed = await fixTests();
      
      if (testsPassed) {
        const elapsed = Math.round((Date.now() - startTime.getTime()) / 1000);
        console.log('');
        log('✅ DEPLOYMENT SUCCESSFUL', 'success');
        log(`Time: ${elapsed}s (attempt #${attempt})`, 'info');
        log(`Started: ${startTime.toLocaleString()}`, 'info');
        log(`Completed: ${new Date().toLocaleString()}`, 'info');
        console.log('');
        break;
      }
    }
    
    // Fix issues in order
    if (issues.mongoDown) {
      const fixed = await fixMongoDB();
      if (!fixed) {
        log('Could not fix MongoDB', 'error');
        attempt++;
        await sleep(5000);
        continue;
      }
    }
    
    if (issues.missingEnv) {
      await fixEnvironment();
    }
    
    if (issues.squareMissing) {
      log('Square credentials missing - some tests may be skipped', 'warn');
    }
    
    // Rebuild
    const buildOk = await fixBuild();
    if (!buildOk) {
      log('Build failed - stopping', 'error');
      break;
    }
    
    console.log('');
    log('Waiting 10s before next attempt...', 'waiting');
    await sleep(10000);
    attempt++;
  }
  
  if (attempt > 5) {
    log('\n⚠️  Max attempts reached without full success', 'error');
    log('Check logs above for specific failures', 'info');
  }
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'error');
  process.exit(1);
});
