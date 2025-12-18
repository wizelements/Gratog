#!/usr/bin/env node
/**
 * VORAX CLI - Command Line Interface
 * 
 * Run quality scans, view reports, manage the system.
 * 
 * Usage:
 *   node .vorax/vorax-cli.js hunt        # Run a single scan
 *   node .vorax/vorax-cli.js watch       # Continuous monitoring
 *   node .vorax/vorax-cli.js status      # Show current status
 *   node .vorax/vorax-cli.js report      # Show latest report
 *   node .vorax/vorax-cli.js nano        # Run nano-agents only
 */

const fs = require('fs');
const path = require('path');

// ASCII Art Banner
const BANNER = `
██╗   ██╗ ██████╗ ██████╗  █████╗ ██╗  ██╗
██║   ██║██╔═══██╗██╔══██╗██╔══██╗╚██╗██╔╝
██║   ██║██║   ██║██████╔╝███████║ ╚███╔╝ 
╚██╗ ██╔╝██║   ██║██╔══██╗██╔══██║ ██╔██╗ 
 ╚████╔╝ ╚██████╔╝██║  ██║██║  ██║██╔╝ ██╗
  ╚═══╝   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
       THE APEX PREDATOR OF QUALITY
`;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  console.log(BANNER);
  
  switch (command) {
    case 'hunt':
      await runHunt();
      break;
    case 'watch':
      await runWatch();
      break;
    case 'status':
      await showStatus();
      break;
    case 'report':
      await showReport();
      break;
    case 'nano':
      await runNanoOnly();
      break;
    case 'quick':
      await runQuickScan();
      break;
    case 'next':
      await runNextSteps(args.slice(1));
      break;
    case 'help':
    default:
      showHelp();
  }
}

async function runHunt() {
  console.log('🦖 Initiating full hunt...\n');
  
  try {
    const config = require('./configs/vorax.config.js');
    const VoraxPrime = require('./agents/vorax-prime.js');
    
    const vorax = new VoraxPrime(config);
    await vorax.initialize();
    const results = await vorax.hunt();
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 HUNT COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nReport saved to: .vorax/reports/LATEST_REPORT.md`);
    
    // Exit with error code if critical issues found
    if (results.summary.critical > 0) {
      console.log('\n⚠️  CRITICAL ISSUES FOUND - Blocking deployment');
      process.exit(1);
    }
    
  } catch (err) {
    console.error('Hunt failed:', err.message);
    process.exit(1);
  }
}

async function runWatch() {
  console.log('🦖 Starting continuous monitoring...\n');
  console.log('Press Ctrl+C to stop\n');
  
  try {
    const config = require('./configs/vorax.config.js');
    const VoraxPrime = require('./agents/vorax-prime.js');
    
    const vorax = new VoraxPrime(config);
    await vorax.initialize();
    await vorax.startContinuous();
    
  } catch (err) {
    console.error('Watch failed:', err.message);
    process.exit(1);
  }
}

async function showStatus() {
  console.log('📊 VORAX STATUS\n');
  
  const reportPath = path.join(process.cwd(), '.vorax/reports/latest.json');
  
  if (!fs.existsSync(reportPath)) {
    console.log('No previous scan found. Run `vorax hunt` first.');
    return;
  }
  
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  
  console.log(`Last Scan: ${report.timestamp}`);
  console.log(`Scan #${report.scanNumber}`);
  console.log(`Mode: ${report.mode}`);
  console.log(`Hunger Level: ${report.hungerLevel}/100`);
  console.log('');
  console.log('Issue Summary:');
  console.log(`  🔴 Critical: ${report.summary.critical}`);
  console.log(`  🟠 High:     ${report.summary.high}`);
  console.log(`  🟡 Medium:   ${report.summary.medium}`);
  console.log(`  🟢 Low:      ${report.summary.low}`);
  console.log(`  Total:       ${report.issues.length}`);
}

async function showReport() {
  const reportPath = path.join(process.cwd(), '.vorax/reports/LATEST_REPORT.md');
  
  if (!fs.existsSync(reportPath)) {
    console.log('No report found. Run `vorax hunt` first.');
    return;
  }
  
  const report = fs.readFileSync(reportPath, 'utf-8');
  console.log(report);
}

async function runNanoOnly() {
  console.log('🔬 Running nano-agents only...\n');
  
  try {
    const { NanoRunner } = require('./nano-agents/index.js');
    const runner = new NanoRunner();
    
    const appDir = path.join(process.cwd(), 'app');
    const libDir = path.join(process.cwd(), 'lib');
    const componentsDir = path.join(process.cwd(), 'components');
    
    let allHits = [];
    
    for (const dir of [appDir, libDir, componentsDir]) {
      if (fs.existsSync(dir)) {
        console.log(`Scanning ${dir.replace(process.cwd(), '')}...`);
        const hits = runner.scanDirectory(dir);
        allHits = allHits.concat(hits);
      }
    }
    
    const summary = runner.summarize(allHits);
    
    console.log('\n📊 NANO SCAN RESULTS\n');
    console.log(`Total hits: ${allHits.length}`);
    console.log(`  🔴 Critical: ${summary.critical}`);
    console.log(`  🟠 High:     ${summary.high}`);
    console.log(`  🟡 Medium:   ${summary.medium}`);
    console.log(`  🟢 Low:      ${summary.low}`);
    console.log('\nBy Agent:');
    for (const [nano, count] of Object.entries(summary.byNano)) {
      console.log(`  ${nano}: ${count}`);
    }
    
    // Show critical and high issues
    const criticalHits = allHits.filter(h => h.severity === 'critical' || h.severity === 'high');
    if (criticalHits.length > 0) {
      console.log('\n⚠️  Critical/High Issues:\n');
      for (const hit of criticalHits.slice(0, 20)) {
        console.log(`  ${hit.file}:${hit.line}`);
        console.log(`    [${hit.severity.toUpperCase()}] ${hit.message}`);
        console.log(`    ${hit.snippet}`);
        console.log('');
      }
    }
    
  } catch (err) {
    console.error('Nano scan failed:', err.message);
    process.exit(1);
  }
}

async function runNextSteps(args) {
  console.log('🎯 VORAX NextSteps Advisor\n');
  
  try {
    const NextStepsAdvisor = require('./agents/next-steps-advisor.js');
    const advisor = new NextStepsAdvisor();
    
    const analysis = await advisor.analyze();
    
    const subCommand = args[0];
    
    if (subCommand === 'detail' || subCommand === 'details') {
      // Show detailed view of all recommendations
      console.log(advisor.formatForCLI(analysis));
      console.log('\n📋 DETAILED RECOMMENDATIONS:\n');
      for (const rec of analysis.recommendations) {
        console.log(advisor.formatDetailedRecommendation(rec));
      }
    } else if (subCommand === 'category' && args[1]) {
      // Filter by category
      const category = args[1].toUpperCase().replace('-', '_');
      const filtered = analysis.recommendations.filter(r => r.category === category);
      if (filtered.length === 0) {
        console.log(`No recommendations found for category: ${args[1]}`);
        console.log('Available categories: REVENUE, SECURITY, CONVERSION, ACCESSIBILITY, PERFORMANCE, UX, SEO, CODE_QUALITY, CONTENT, TECH_DEBT');
      } else {
        console.log(`\n📂 ${category} Recommendations:\n`);
        for (const rec of filtered) {
          console.log(advisor.formatDetailedRecommendation(rec));
        }
      }
    } else if (subCommand === 'json') {
      // Output as JSON for integrations
      console.log(JSON.stringify(analysis, null, 2));
    } else if (subCommand === 'quick') {
      // Quick wins only
      const quickWins = analysis.recommendations.filter(r => r.effort === 'low' && r.impact === 'high');
      console.log('\n⚡ QUICK WINS (High Impact, Low Effort):\n');
      for (const win of quickWins) {
        console.log(advisor.formatDetailedRecommendation(win));
      }
    } else if (subCommand === 'top' && args[1]) {
      // Top N recommendations
      const n = parseInt(args[1]) || 5;
      console.log(`\n🏆 TOP ${n} RECOMMENDATIONS:\n`);
      for (const rec of analysis.topPicks.slice(0, n)) {
        console.log(advisor.formatDetailedRecommendation(rec));
      }
    } else {
      // Default: show summary with top picks
      console.log(advisor.formatForCLI(analysis));
    }
    
    // Save recommendations to file
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(process.cwd(), '.vorax/reports/next-steps.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📁 Full analysis saved to: .vorax/reports/next-steps.json`);
    
  } catch (err) {
    console.error('NextSteps analysis failed:', err.message);
    process.exit(1);
  }
}

async function runQuickScan() {
  console.log('⚡ Running quick scan...\n');
  
  const startTime = Date.now();
  const issues = [];
  
  // Quick checks without full agent load
  const checks = [
    {
      name: 'TypeScript errors',
      cmd: () => {
        try {
          require('child_process').execSync('npx tsc --noEmit --skipLibCheck 2>&1', {
            encoding: 'utf-8',
            timeout: 30000
          });
          return { pass: true };
        } catch (err) {
          const errors = (err.stdout || '').match(/error TS/g) || [];
          return { pass: errors.length === 0, count: errors.length };
        }
      }
    },
    {
      name: 'ESLint',
      cmd: () => {
        try {
          require('child_process').execSync('npx next lint --quiet 2>&1', {
            encoding: 'utf-8',
            timeout: 30000
          });
          return { pass: true };
        } catch (err) {
          return { pass: false, output: err.stdout };
        }
      }
    },
    {
      name: 'Unit tests',
      cmd: () => {
        try {
          require('child_process').execSync('npm run test:unit -- --reporter=dot 2>&1', {
            encoding: 'utf-8',
            timeout: 60000
          });
          return { pass: true };
        } catch (err) {
          return { pass: false };
        }
      }
    }
  ];
  
  for (const check of checks) {
    process.stdout.write(`  ${check.name}... `);
    const result = check.cmd();
    if (result.pass) {
      console.log('✅');
    } else {
      console.log(`❌ ${result.count ? `(${result.count} errors)` : ''}`);
      issues.push(check.name);
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`\nQuick scan completed in ${(duration / 1000).toFixed(1)}s`);
  
  if (issues.length > 0) {
    console.log(`\n⚠️  Issues found in: ${issues.join(', ')}`);
    process.exit(1);
  } else {
    console.log('\n✅ All quick checks passed!');
  }
}

function showHelp() {
  console.log(`
USAGE: node .vorax/vorax-cli.js <command>

COMMANDS:
  hunt     Run a full scan with all agents
  watch    Start continuous monitoring mode
  status   Show current status and last scan results
  report   Display the latest full report
  nano     Run only nano-agents (fast atomic checks)
  quick    Quick scan (TypeScript, ESLint, tests)
  next     🆕 Get best next enhancement steps for full site
  help     Show this help message

NEXT STEPS SUBCOMMANDS:
  next                       # Show top 5 recommendations
  next detail                # Show all recommendations with full details
  next quick                 # Show quick wins (high impact, low effort)
  next category <name>       # Filter by category (REVENUE, SEO, UX, etc.)
  next top <n>               # Show top N recommendations
  next json                  # Output as JSON for integrations

EXAMPLES:
  npm run vorax              # Run full hunt
  npm run vorax:quick        # Fast pre-commit check
  npm run vorax:watch        # Continuous monitoring
  node .vorax/vorax-cli.js next           # Get enhancement recommendations
  node .vorax/vorax-cli.js next quick     # Show quick wins only
  node .vorax/vorax-cli.js next category REVENUE  # Revenue-focused improvements

CONFIGURATION:
  Edit .vorax/configs/vorax.config.js to customize behavior.

REPORTS:
  Reports are saved to .vorax/reports/
  Latest report: .vorax/reports/LATEST_REPORT.md
  Enhancement recommendations: .vorax/reports/next-steps.json
`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🦖 VORAX shutting down...');
  process.exit(0);
});

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
