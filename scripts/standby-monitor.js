#!/usr/bin/env node

/**
 * Standby Monitor
 * Checks for deployment failures and prepares context for fixes
 * Run: node scripts/standby-monitor.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FAILURE_REPORTS_DIR = '.failure-reports';
const CONTEXT_FILE = 'FAILURE_CONTEXT.md';

function log(msg, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // cyan
    success: '\x1b[32m', // green
    warn: '\x1b[33m',    // yellow
    error: '\x1b[31m',   // red
    reset: '\x1b[0m'
  };
  
  const color = colors[type] || colors.info;
  console.log(`${color}[${type.toUpperCase()}]${colors.reset} ${msg}`);
}

function getLatestFailureContext() {
  if (!fs.existsSync(FAILURE_REPORTS_DIR)) {
    return null;
  }
  
  const files = fs.readdirSync(FAILURE_REPORTS_DIR)
    .filter(f => f.startsWith('context-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) return null;
  
  const contextFile = path.join(FAILURE_REPORTS_DIR, files[0]);
  return {
    file: contextFile,
    data: JSON.parse(fs.readFileSync(contextFile, 'utf8'))
  };
}

function analyzeFailures(context) {
  const analysis = {
    timestamp: new Date().toISOString(),
    failureCount: context.totalFailedJobs,
    failedJobs: context.failedJobs.map(j => j.name),
    types: [],
    recommendations: []
  };
  
  context.failedJobs.forEach(job => {
    if (job.name.includes('Database') || job.name.includes('database')) {
      analysis.types.push('DATABASE_INTEGRATION_TESTS');
      analysis.recommendations.push('Check MongoDB connectivity and integration test config');
    }
    if (job.name.includes('API') || job.name.includes('Integration')) {
      analysis.types.push('API_INTEGRATION_TESTS');
      analysis.recommendations.push('Check server startup and health check endpoint');
    }
    if (job.name.includes('Build')) {
      analysis.types.push('BUILD_FAILURE');
      analysis.recommendations.push('Check build output and TypeScript errors');
    }
  });
  
  return analysis;
}

function generateStandbyReport(context, analysis) {
  let report = `# 🔴 STANDBY REPORT - Ready for Fix\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Status:** Waiting for developer action\n\n`;
  
  report += `## Failure Summary\n`;
  report += `- **Total Failed Jobs:** ${analysis.failureCount}\n`;
  report += `- **Failed Components:** ${analysis.types.join(', ')}\n`;
  report += `- **Workflow ID:** ${context.workflowName}\n`;
  report += `- **Branch:** ${context.branch}\n`;
  report += `- **Commit:** ${context.commit}\n\n`;
  
  report += `## Failed Jobs\n`;
  context.failedJobs.forEach(job => {
    report += `\n### ${job.name}\n`;
    report += `- Status: ${job.status}\n`;
    report += `- Conclusion: ${job.conclusion}\n`;
    if (job.stepFailures.length > 0) {
      report += `- Failed Steps: ${job.stepFailures.map(s => s.name).join(', ')}\n`;
    }
  });
  
  report += `\n## Analysis & Recommendations\n`;
  analysis.recommendations.forEach((rec, i) => {
    report += `${i + 1}. ${rec}\n`;
  });
  
  report += `\n## Standby System Status\n`;
  report += `✅ Failure context captured\n`;
  report += `✅ Analysis complete\n`;
  report += `⏳ Awaiting developer fix\n`;
  report += `📍 Ready to assist next iteration\n`;
  
  return report;
}

function main() {
  console.clear();
  log('🔍 STANDBY MONITOR - Checking for failures...', 'info');
  console.log('');
  
  const latest = getLatestFailureContext();
  
  if (!latest) {
    log('✅ No failures detected', 'success');
    console.log('System is operating normally.\n');
    return;
  }
  
  log('⚠️  FAILURE DETECTED', 'warn');
  console.log('');
  
  const analysis = analyzeFailures(latest.data);
  const report = generateStandbyReport(latest.data, analysis);
  
  console.log(report);
  console.log('');
  
  // Save report
  const reportFile = `STANDBY_REPORT_${Date.now()}.md`;
  fs.writeFileSync(reportFile, report);
  log(`Report saved to: ${reportFile}`, 'success');
  
  // Show quick commands
  console.log('\n📋 QUICK COMMANDS FOR DEVELOPER:\n');
  console.log('# View full workflow logs');
  log(`open https://github.com/wizelements/Gratog/actions/runs/${latest.data.workflowName || 'WORKFLOW_ID'}`, 'info');
  
  console.log('\n# Run tests locally');
  console.log('  yarn test:unit        # Unit tests');
  console.log('  yarn test:smoke       # Smoke tests');
  console.log('  yarn test:api         # API integration tests');
  
  console.log('\n# Database tests');
  console.log('  yarn vitest run --config vitest.db.config.ts');
  
  console.log('\n# Start server + database for testing');
  console.log('  docker run -d --name mongo -p 27017:27017 mongo:6.0');
  console.log('  yarn dev              # in another terminal');
  console.log('  yarn test:api         # in another terminal');
  
  console.log('\n🎯 Next: Fix the issues and push to trigger new test run\n');
}

main();
