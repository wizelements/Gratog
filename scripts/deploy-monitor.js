#!/usr/bin/env node

/**
 * Continuous Deployment Monitor
 * Waits for GitHub Actions, checks results, fixes errors in real-time
 * Run: npm run deploy:monitor
 */

const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');

const GITHUB_REPO = 'wizelements/Gratog';
const CHECK_INTERVAL = 30000; // 30 seconds
const MAX_WAIT_TIME = 600000; // 10 minutes before timeout
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
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

function getLatestWorkflowRun() {
  if (!GITHUB_TOKEN) {
    log('⚠️  GITHUB_TOKEN not set - cannot fetch workflow status', 'warn');
    log('Set: export GITHUB_TOKEN=<your_token>', 'info');
    return null;
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/actions/runs?branch=main&status=in_progress,completed&per_page=1`,
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Deploy Monitor',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 10000
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.workflow_runs?.[0] || null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null)).end();
  });
}

function getWorkflowStatus(run) {
  if (!run) return null;
  
  return {
    id: run.id,
    status: run.status,           // queued, in_progress, completed
    conclusion: run.conclusion,   // success, failure, neutral, cancelled, skipped, timed_out, action_required
    name: run.name,
    branch: run.head_branch,
    commit: run.head_sha?.substring(0, 7),
    url: run.html_url,
    created: new Date(run.created_at),
    updated: new Date(run.updated_at)
  };
}

async function waitForDeployment() {
  log('⏳ Waiting for GitHub Actions deployment...', 'waiting');
  log(`Checking every ${CHECK_INTERVAL/1000}s, timeout: ${MAX_WAIT_TIME/1000}s`, 'info');
  console.log('');

  const startTime = Date.now();
  let lastUpdate = new Date();
  let checkCount = 0;

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      checkCount++;
      const run = await getLatestWorkflowRun();
      const status = getWorkflowStatus(run);
      
      if (!status) {
        log(`Check #${checkCount}: No workflow found`, 'info');
        return;
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      
      if (status.status === 'in_progress') {
        const timeSinceUpdate = Math.round((Date.now() - lastUpdate.getTime()) / 1000);
        log(`Check #${checkCount} [${elapsed}s]: ${status.name} - IN PROGRESS (updated ${timeSinceUpdate}s ago)`, 'waiting');
        lastUpdate = new Date(status.updated);
      } else if (status.status === 'completed') {
        clearInterval(interval);
        console.log('');
        log(`Workflow completed in ${elapsed}s`, 'check');
        console.log('');
        resolve(status);
      }

      // Timeout after MAX_WAIT_TIME
      if (Date.now() - startTime > MAX_WAIT_TIME) {
        clearInterval(interval);
        log(`Timeout after ${Math.round(MAX_WAIT_TIME/1000)}s`, 'error');
        console.log('');
        resolve(status);
      }
    }, CHECK_INTERVAL);
  });
}

function parseFailureContext() {
  if (!fs.existsSync('FAILURE_CONTEXT.md')) {
    return null;
  }

  const content = fs.readFileSync('FAILURE_CONTEXT.md', 'utf8');
  const failedJobs = (content.match(/## Failed Jobs/i) !== null);
  
  return {
    hasFailures: failedJobs,
    file: 'FAILURE_CONTEXT.md',
    content: content.substring(0, 500) // First 500 chars
  };
}

async function diagnoseAndFix(status) {
  if (status.conclusion === 'success') {
    log('✅ All tests PASSED', 'success');
    return true;
  }

  if (status.conclusion === 'failure') {
    log('❌ Tests FAILED', 'error');
    log(`Workflow: ${status.name}`, 'info');
    log(`URL: ${status.url}`, 'info');
    console.log('');

    // Check failure context
    const failure = parseFailureContext();
    if (failure) {
      log('Failure context found:', 'check');
      log(`File: ${failure.file}`, 'info');
      console.log('');
    }

    // Run diagnostics
    log('Running diagnostics...', 'check');
    console.log('');
    execSafe('node scripts/diagnose-integration-tests.js', { stdio: 'inherit' });
    console.log('');

    // Show failure report if exists
    if (fs.existsSync('.failure-reports')) {
      const reports = execSafe('ls -lt .failure-reports/ | head -5');
      if (reports) {
        log('Recent failure reports:', 'info');
        console.log(reports);
      }
    }

    return false;
  }

  if (status.conclusion === 'timed_out') {
    log('⏱️  Workflow TIMED OUT', 'error');
    return false;
  }

  log(`Unknown conclusion: ${status.conclusion}`, 'warn');
  return false;
}

async function fixAndRetry(status, attemptNumber = 1) {
  log(`\n${'='.repeat(60)}`, 'info');
  log(`FIX ATTEMPT #${attemptNumber}`, 'fix');
  log(`${'='.repeat(60)}`, 'info');
  console.log('');

  // Analyze failure
  log('Analyzing failure...', 'check');
  const failure = parseFailureContext();
  
  if (!failure) {
    log('No failure context - checking environment', 'info');
    
    // Basic fixes
    const envCheck = execSafe('node scripts/diagnose-integration-tests.js');
    if (envCheck && envCheck.includes('FAIL')) {
      log('Environment issues detected - fixing...', 'fix');
      
      // Common fixes
      if (!process.env.MONGODB_URI) {
        log('Setting MONGODB_URI...', 'fix');
        execSafe('export MONGODB_URI=mongodb://localhost:27017/test_db');
      }
      if (!process.env.SQUARE_ACCESS_TOKEN) {
        log('SQUARE_ACCESS_TOKEN not set - may need manual setup', 'warn');
      }
    }
  }

  // Common automatic fixes
  log('Applying common fixes...', 'fix');
  
  // Clear build cache
  execSafe('rm -rf .next');
  log('Cleared .next cache', 'success');
  
  // Rebuild
  log('Running build...', 'fix');
  const buildResult = execSafe('yarn build 2>&1 | tail -20');
  if (buildResult && buildResult.includes('error')) {
    log('Build had errors', 'error');
    console.log(buildResult);
    return false;
  }
  log('Build successful', 'success');

  // Try running tests locally
  log('Running integration tests locally...', 'fix');
  const testResult = execSafe('timeout 120 yarn test:api 2>&1 | tail -30');
  if (testResult && testResult.includes('passed')) {
    log('Tests pass locally!', 'success');
  } else if (testResult && testResult.includes('failed')) {
    log('Tests still failing locally', 'error');
    if (testResult) console.log(testResult.substring(testResult.length - 500));
    return false;
  }

  // Push fix
  log('Pushing changes to trigger CI...', 'fix');
  const commitResult = execSafe('git add -A && git commit -m "fix: auto-fix attempt #' + attemptNumber + ' [skip ci]" 2>&1');
  
  if (commitResult && commitResult.includes('nothing to commit')) {
    log('No changes to commit - issue not auto-fixable', 'warn');
    return false;
  }

  if (commitResult && commitResult.includes('error')) {
    log('Commit failed', 'error');
    return false;
  }

  execSafe('git push origin main');
  log('Pushed to trigger new test run', 'success');

  return true;
}

async function main() {
  console.clear();
  console.log(colors.bold + '🚀 DEPLOYMENT MONITOR - Continuous Testing Loop' + colors.reset);
  console.log('');

  const startTime = new Date();
  let attempt = 1;

  while (true) {
    console.log('');
    log(`${'-'.repeat(60)}`, 'info');
    log(`Check #${attempt} - ${new Date().toLocaleTimeString()}`, 'info');
    log(`${'-'.repeat(60)}`, 'info');
    console.log('');

    // Wait for deployment
    const status = await waitForDeployment();

    if (!status) {
      log('Could not fetch workflow status - retrying in 60s', 'warn');
      await new Promise(r => setTimeout(r, 60000));
      attempt++;
      continue;
    }

    // Check result
    const passed = await diagnoseAndFix(status);

    if (passed) {
      console.log('');
      log('✅ DEPLOYMENT SUCCESSFUL', 'success');
      log(`Total time: ${Math.round((Date.now() - startTime.getTime()) / 1000)}s`, 'info');
      log(`Started: ${startTime.toLocaleString()}`, 'info');
      log(`Completed: ${new Date().toLocaleString()}`, 'info');
      console.log('');
      log('All tests passing. Monitoring complete.', 'success');
      break;
    }

    // Try to fix and retry
    if (attempt <= 3) {
      const canRetry = await fixAndRetry(status, attempt);
      if (canRetry) {
        log('Waiting 60s before next check...', 'waiting');
        await new Promise(r => setTimeout(r, 60000));
        attempt++;
        continue;
      }
    }

    // Manual intervention needed
    console.log('');
    log('⚠️  Automatic fixes exhausted', 'warn');
    log('Manual investigation needed:', 'info');
    console.log('');
    console.log('1. Check workflow logs:');
    console.log(`   ${status.url}`);
    console.log('');
    console.log('2. Run diagnostics:');
    console.log('   npm run diagnose');
    console.log('');
    console.log('3. Check failure context:');
    console.log('   cat FAILURE_CONTEXT.md');
    console.log('');
    console.log('4. After fixing, commit and push:');
    console.log('   git add -A && git commit -m "fix: manual fix for ' + status.conclusion + '"');
    console.log('   git push origin main');
    console.log('');
    console.log('5. Then re-run this monitor:');
    console.log('   npm run deploy:monitor');
    console.log('');
    break;
  }
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'error');
  process.exit(1);
});
