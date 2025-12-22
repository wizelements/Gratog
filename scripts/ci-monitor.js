#!/usr/bin/env node

/**
 * CI Monitor - Waits for GitHub Actions, captures detailed failures
 * Creates markdown context documents when tests fail
 * Run: npm run ci:monitor
 */

const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const REPO = 'wizelements/Gratog';
const CHECK_INTERVAL = 20000; // 20 seconds
const MAX_WAIT = 3600000; // 1 hour

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, type = 'info') {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️', waiting: '⏳', check: '🔍' };
  const colorMap = { info: colors.cyan, success: colors.green, error: colors.red, warn: colors.yellow, waiting: colors.yellow, check: colors.cyan };
  console.log(`${colorMap[type]}${icons[type]} ${msg}${colors.reset}`);
}

function getGitHub(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'CI-Monitor',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 10000
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null)).end();
  });
}

async function getLatestRun() {
  const data = await getGitHub(`/repos/${REPO}/actions/runs?branch=main&per_page=1`);
  return data?.workflow_runs?.[0] || null;
}

async function getRunJobs(runId) {
  const data = await getGitHub(`/repos/${REPO}/actions/runs/${runId}/jobs`);
  return data?.jobs || [];
}

function createFailureContext(run, jobs) {
  const failedJobs = jobs.filter(j => j.conclusion === 'failure' || j.status === 'failed');
  
  let md = `# CI Failure Context Report\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Workflow:** ${run.name}\n`;
  md += `**Branch:** ${run.head_branch}\n`;
  md += `**Commit:** ${run.head_sha.substring(0, 7)}\n`;
  md += `**URL:** ${run.html_url}\n`;
  md += `**Status:** ${run.status} / ${run.conclusion}\n\n`;

  md += `## Failed Jobs (${failedJobs.length})\n\n`;
  
  failedJobs.forEach(job => {
    md += `### ${job.name}\n`;
    md += `- **Status:** ${job.status} / ${job.conclusion}\n`;
    md += `- **Started:** ${job.started_at}\n`;
    md += `- **Completed:** ${job.completed_at}\n`;
    md += `- **Logs:** ${job.logs_url}\n`;
    md += `- **HTML:** ${job.html_url}\n\n`;

    if (job.steps) {
      const failedSteps = job.steps.filter(s => s.conclusion === 'failure');
      if (failedSteps.length > 0) {
        md += `**Failed Steps:**\n`;
        failedSteps.forEach(step => {
          md += `- Step ${step.number}: ${step.name} (${step.conclusion})\n`;
        });
        md += '\n';
      }
    }
  });

  md += `## Workflow Summary\n\n`;
  md += `- **Total Jobs:** ${jobs.length}\n`;
  md += `- **Failed Jobs:** ${failedJobs.length}\n`;
  md += `- **Passed Jobs:** ${jobs.filter(j => j.conclusion === 'success').length}\n`;
  md += `- **Duration:** ${Math.round((new Date(run.updated_at) - new Date(run.created_at)) / 1000)}s\n\n`;

  md += `## Next Steps\n\n`;
  md += `1. **Review Failures:** Check logs above\n`;
  md += `2. **Identify Root Cause:** Look at step outputs\n`;
  md += `3. **Analyze Patterns:** Multiple failures? Same root cause?\n`;
  md += `4. **Create Fix:** Based on failure analysis\n`;
  md += `5. **Push Changes:** To trigger new CI run\n`;
  md += `6. **Monitor:** Use \`npm run ci:monitor\` again\n`;

  return md;
}

async function main() {
  console.clear();
  console.log(colors.bold + '\n⏳ CI MONITOR - Waiting for GitHub Actions\n' + colors.reset);
  
  const startTime = Date.now();
  let checkCount = 0;
  let lastRunId = null;

  while (Date.now() - startTime < MAX_WAIT) {
    checkCount++;
    const now = new Date().toLocaleTimeString();
    
    const run = await getLatestRun();
    
    if (!run) {
      log(`[${now}] Check #${checkCount}: No workflow found`, 'waiting');
      await new Promise(r => setTimeout(r, CHECK_INTERVAL));
      continue;
    }

    // New run detected
    if (!lastRunId || run.id !== lastRunId) {
      lastRunId = run.id;
      console.log('');
      log(`Workflow detected: ${run.name}`, 'check');
      log(`Branch: ${run.head_branch}`, 'info');
      log(`Commit: ${run.head_sha.substring(0, 7)}`, 'info');
      console.log('');
    }

    // Check status
    if (run.status === 'in_progress') {
      const elapsed = Math.round((Date.now() - new Date(run.created_at).getTime()) / 1000);
      log(`[${now}] Status: IN PROGRESS (${elapsed}s elapsed)`, 'waiting');
    } else if (run.status === 'completed') {
      console.log('');
      const elapsed = Math.round((new Date(run.updated_at) - new Date(run.created_at)) / 1000);
      
      if (run.conclusion === 'success') {
        log('✅ WORKFLOW PASSED', 'success');
        log(`Duration: ${elapsed}s`, 'info');
        break;
      } else {
        log('❌ WORKFLOW FAILED', 'error');
        log(`Conclusion: ${run.conclusion}`, 'error');
        console.log('');
        
        // Get job details
        log('Fetching detailed job information...', 'check');
        const jobs = await getRunJobs(run.id);
        
        // Create context document
        const context = createFailureContext(run, jobs);
        const filename = `CI_FAILURE_${Date.now()}.md`;
        fs.writeFileSync(filename, context);
        
        log(`Failure context saved to: ${filename}`, 'success');
        console.log('');
        log('Detailed failure report:', 'info');
        console.log(context);
        console.log('');
        
        // Summary
        log(`Total jobs: ${jobs.length}`, 'info');
        log(`Failed: ${jobs.filter(j => j.conclusion === 'failure').length}`, 'error');
        log(`Passed: ${jobs.filter(j => j.conclusion === 'success').length}`, 'success');
        console.log('');
        
        // Next steps
        console.log(colors.yellow + '⚠️  Analyze the failure report above' + colors.reset);
        console.log('');
        console.log('Actions:');
        console.log(`1. Review: ${colors.cyan}cat ${filename}${colors.reset}`);
        console.log(`2. Fix issues locally`);
        console.log(`3. Commit and push: ${colors.cyan}git add -A && git commit -m "fix: ..." && git push${colors.reset}`);
        console.log(`4. Re-monitor: ${colors.cyan}npm run ci:monitor${colors.reset}`);
        console.log('');
        break;
      }
    }

    await new Promise(r => setTimeout(r, CHECK_INTERVAL));
  }

  if (Date.now() - startTime >= MAX_WAIT) {
    log('⏱️  Timeout waiting for workflow', 'error');
  }
}

main().catch(err => {
  log(`Error: ${err.message}`, 'error');
  process.exit(1);
});
