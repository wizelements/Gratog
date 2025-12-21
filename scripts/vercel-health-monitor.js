#!/usr/bin/env node
/**
 * Vercel Health Monitor & Auto-Recovery
 * 
 * Monitors production health and triggers recovery actions:
 * - Health endpoint checks every 5 minutes
 * - Auto-rollback on repeated failures
 * - Slack/webhook notifications
 * 
 * Usage:
 *   node scripts/vercel-health-monitor.js
 *   VERCEL_TOKEN=xxx node scripts/vercel-health-monitor.js
 */

const https = require('https');

const CONFIG = {
  productionUrl: process.env.PRODUCTION_URL || 'https://tasteofgratitude.shop',
  healthEndpoint: '/api/health',
  checkIntervalMs: 5 * 60 * 1000, // 5 minutes
  failureThreshold: 3, // Consecutive failures before action
  vercelToken: process.env.VERCEL_TOKEN,
  slackWebhook: process.env.SLACK_WEBHOOK,
  projectId: process.env.VERCEL_PROJECT_ID,
};

let consecutiveFailures = 0;
let lastSuccessTime = Date.now();

async function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function checkHealth() {
  const url = `${CONFIG.productionUrl}${CONFIG.healthEndpoint}`;
  const startTime = Date.now();
  
  try {
    const response = await fetch(url);
    const latency = Date.now() - startTime;
    
    if (response.status === 200) {
      consecutiveFailures = 0;
      lastSuccessTime = Date.now();
      console.log(`✅ [${new Date().toISOString()}] Health OK (${latency}ms)`);
      return { success: true, latency };
    } else {
      throw new Error(`Status ${response.status}`);
    }
  } catch (error) {
    consecutiveFailures++;
    console.error(`❌ [${new Date().toISOString()}] Health FAILED: ${error.message} (failures: ${consecutiveFailures})`);
    
    if (consecutiveFailures >= CONFIG.failureThreshold) {
      await handleCriticalFailure();
    }
    
    return { success: false, error: error.message };
  }
}

async function handleCriticalFailure() {
  console.error('🚨 CRITICAL: Multiple consecutive failures detected!');
  
  // Send alert
  await sendAlert(`🚨 Production Down!\n\nURL: ${CONFIG.productionUrl}\nFailures: ${consecutiveFailures}\nLast success: ${new Date(lastSuccessTime).toISOString()}`);
  
  // Attempt auto-recovery if Vercel token available
  if (CONFIG.vercelToken && CONFIG.projectId) {
    console.log('🔄 Attempting auto-recovery via Vercel redeploy...');
    await triggerRedeploy();
  }
}

async function sendAlert(message) {
  if (!CONFIG.slackWebhook) {
    console.log('Alert (no webhook configured):', message);
    return;
  }
  
  try {
    await fetch(CONFIG.slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    console.log('📢 Alert sent');
  } catch (error) {
    console.error('Failed to send alert:', error.message);
  }
}

async function triggerRedeploy() {
  if (!CONFIG.vercelToken) {
    console.log('No Vercel token - manual intervention required');
    return;
  }
  
  try {
    const response = await fetch(`https://api.vercel.com/v13/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: CONFIG.projectId,
        target: 'production',
      }),
    });
    
    console.log('🚀 Redeploy triggered:', response.status);
  } catch (error) {
    console.error('Redeploy failed:', error.message);
  }
}

async function runDiagnostics() {
  console.log('\n📊 Running diagnostics...\n');
  
  const endpoints = [
    '/api/health',
    '/',
    '/api/products',
    '/api/square/test-rest',
  ];
  
  for (const endpoint of endpoints) {
    const url = `${CONFIG.productionUrl}${endpoint}`;
    const start = Date.now();
    
    try {
      const response = await fetch(url);
      const latency = Date.now() - start;
      const status = response.status === 200 ? '✅' : '⚠️';
      console.log(`${status} ${endpoint}: ${response.status} (${latency}ms)`);
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         VERCEL HEALTH MONITOR & AUTO-RECOVERY              ║
╠════════════════════════════════════════════════════════════╣
║  Target: ${CONFIG.productionUrl.padEnd(45)}  ║
║  Interval: ${(CONFIG.checkIntervalMs / 1000 / 60).toFixed(0)} minutes                                       ║
║  Threshold: ${CONFIG.failureThreshold} failures                                   ║
╚════════════════════════════════════════════════════════════╝
`);
  
  // Initial diagnostics
  await runDiagnostics();
  
  // Start monitoring loop
  console.log('\n🔄 Starting continuous monitoring...\n');
  
  while (true) {
    await checkHealth();
    await new Promise(resolve => setTimeout(resolve, CONFIG.checkIntervalMs));
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Monitor stopped');
  process.exit(0);
});

main().catch(console.error);
