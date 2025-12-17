#!/usr/bin/env node
/**
 * VORAX PRIME - The Apex Predator
 * 
 * Insatiably hungry for perfection. Coordinates all subordinate agents,
 * aggregates reports, prioritizes issues by severity, and triggers
 * automated fixes or escalations.
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class VoraxPrime extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.hungerLevel = config.appetite.baseHungerLevel;
    this.issues = [];
    this.resolvedCount = 0;
    this.scanCount = 0;
    this.lastScan = null;
    this.isRunning = false;
    this.subAgents = new Map();
    this.metrics = {
      totalIssuesFound: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      autoFixed: 0,
      escalated: 0
    };
  }

  /**
   * Initialize all sub-agents
   */
  async initialize() {
    console.log('🦖 VORAX PRIME AWAKENING...');
    console.log(`   Hunger Level: ${this.hungerLevel}/100`);
    console.log(`   Mode: ${this.getMode()}`);
    
    // Load sub-agents
    const subAgentNames = [
      'bug-hunter',
      'psycho-marketer', 
      'uiux-predator',
      'log-devourer',
      'opti-beast',
      'trust-guardian'
    ];
    
    for (const name of subAgentNames) {
      try {
        const SubAgent = require(`../sub-agents/${name}.js`);
        const configKey = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const agentConfig = this.config.subAgents[configKey] || {};
        
        if (agentConfig.enabled !== false) {
          const agent = new SubAgent(agentConfig, this);
          this.subAgents.set(name, agent);
          console.log(`   ✓ ${name} loaded`);
        }
      } catch (err) {
        console.log(`   ⚠ ${name} not available: ${err.message}`);
      }
    }
    
    this.emit('initialized');
    return this;
  }

  /**
   * Get current operating mode based on hunger level
   */
  getMode() {
    if (this.hungerLevel >= this.config.appetite.aggressiveThreshold) {
      return 'AGGRESSIVE';
    } else if (this.hungerLevel <= this.config.appetite.starvingThreshold) {
      return 'STARVING';
    }
    return 'NORMAL';
  }

  /**
   * Get current scan frequency based on mode
   */
  getScanFrequency() {
    const mode = this.getMode();
    return this.config.appetite.scanFrequency[mode.toLowerCase()];
  }

  /**
   * Feed the beast - called when issues are resolved
   */
  feed(resolvedIssues = 1) {
    this.resolvedCount += resolvedIssues;
    this.hungerLevel = Math.max(0, 
      this.hungerLevel - (resolvedIssues * this.config.appetite.hungerDecreaseRate)
    );
    console.log(`🍖 VORAX FED: +${resolvedIssues} resolved. Hunger: ${this.hungerLevel}/100`);
    this.emit('fed', { resolved: resolvedIssues, hunger: this.hungerLevel });
  }

  /**
   * Starve the beast - called when issues are found
   */
  starve(newIssues = 1) {
    this.hungerLevel = Math.min(100,
      this.hungerLevel + (newIssues * this.config.appetite.hungerIncreaseRate)
    );
    console.log(`😤 VORAX HUNGRY: +${newIssues} issues. Hunger: ${this.hungerLevel}/100`);
    this.emit('starved', { newIssues, hunger: this.hungerLevel });
  }

  /**
   * Execute a full scan with all sub-agents
   */
  async hunt() {
    this.scanCount++;
    this.lastScan = new Date();
    console.log('\n' + '='.repeat(60));
    console.log(`🔍 VORAX HUNT #${this.scanCount} - ${this.lastScan.toISOString()}`);
    console.log(`   Mode: ${this.getMode()} | Hunger: ${this.hungerLevel}/100`);
    console.log('='.repeat(60));

    const scanResults = {
      timestamp: this.lastScan,
      scanNumber: this.scanCount,
      mode: this.getMode(),
      hungerLevel: this.hungerLevel,
      agents: {},
      issues: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0 }
    };

    // Run all sub-agents in parallel
    const agentPromises = [];
    for (const [name, agent] of this.subAgents) {
      agentPromises.push(
        this.runSubAgent(name, agent).catch(err => ({
          agent: name,
          error: err.message,
          issues: []
        }))
      );
    }

    const results = await Promise.all(agentPromises);

    // Aggregate results
    for (const result of results) {
      scanResults.agents[result.agent] = result;
      
      if (result.issues) {
        for (const issue of result.issues) {
          scanResults.issues.push(issue);
          scanResults.summary[issue.severity]++;
          this.metrics[`${issue.severity}Issues`]++;
        }
      }
    }

    this.metrics.totalIssuesFound += scanResults.issues.length;
    this.issues = scanResults.issues;

    // Update hunger based on findings
    if (scanResults.issues.length > 0) {
      this.starve(scanResults.issues.length);
    } else if (this.getMode() === 'STARVING') {
      // No issues found while starving - run stress tests
      console.log('🧪 STARVING MODE: Running stress simulations...');
      await this.runStressSimulations();
    }

    // Check for escalations
    await this.checkEscalations(scanResults);

    // Generate report
    await this.generateReport(scanResults);

    console.log('\n📊 HUNT SUMMARY:');
    console.log(`   Critical: ${scanResults.summary.critical}`);
    console.log(`   High: ${scanResults.summary.high}`);
    console.log(`   Medium: ${scanResults.summary.medium}`);
    console.log(`   Low: ${scanResults.summary.low}`);
    console.log(`   Total: ${scanResults.issues.length}`);

    this.emit('huntComplete', scanResults);
    return scanResults;
  }

  /**
   * Run a single sub-agent
   */
  async runSubAgent(name, agent) {
    console.log(`\n🐺 Running ${name}...`);
    const startTime = Date.now();
    
    try {
      const result = await agent.hunt();
      const duration = Date.now() - startTime;
      
      console.log(`   ✓ ${name} completed in ${duration}ms`);
      console.log(`   Found ${result.issues?.length || 0} issues`);
      
      return {
        agent: name,
        duration,
        ...result
      };
    } catch (err) {
      console.log(`   ✗ ${name} failed: ${err.message}`);
      return {
        agent: name,
        error: err.message,
        issues: []
      };
    }
  }

  /**
   * Check if escalation is needed
   */
  async checkEscalations(scanResults) {
    const criticalCount = scanResults.summary.critical;
    const highCount = scanResults.summary.high;
    
    // Check for deployment halt conditions
    if (criticalCount > 0 && this.config.escalation.deploymentHalt) {
      console.log('\n🚨 CRITICAL ALERT: Deployment halt triggered!');
      this.metrics.escalated++;
      await this.escalate('CRITICAL', 'Critical issues found - deployment halted', scanResults);
    }
    
    // Check revenue impact
    const trustIssues = scanResults.issues.filter(i => i.agent === 'trust-guardian');
    const totalRevenueLoss = trustIssues.reduce((sum, i) => sum + (i.estimatedLoss || 0), 0);
    
    if (totalRevenueLoss > this.config.escalation.criticalRevenueImpact) {
      console.log(`\n💰 REVENUE ALERT: Potential ${(totalRevenueLoss * 100).toFixed(1)}% loss detected!`);
      await this.escalate('REVENUE', `Potential revenue loss: ${(totalRevenueLoss * 100).toFixed(1)}%`, scanResults);
    }
  }

  /**
   * Escalate issues to stakeholders
   */
  async escalate(type, message, data) {
    console.log(`📧 Escalating ${type}: ${message}`);
    
    // Log escalation
    const escalation = {
      timestamp: new Date(),
      type,
      message,
      data: {
        issueCount: data.issues?.length || 0,
        summary: data.summary
      }
    };
    
    const escalationPath = path.join(
      process.cwd(),
      '.vorax/reports',
      `escalation-${Date.now()}.json`
    );
    
    fs.writeFileSync(escalationPath, JSON.stringify(escalation, null, 2));
    
    this.emit('escalation', escalation);
  }

  /**
   * Run stress simulations when starving
   */
  async runStressSimulations() {
    console.log('   Simulating edge cases...');
    console.log('   Simulating high traffic...');
    console.log('   Simulating device variations...');
    // These would integrate with actual testing frameworks
    return [];
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(scanResults) {
    const reportDir = path.join(process.cwd(), this.config.reporting.outputDir);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // JSON Report
    const jsonPath = path.join(reportDir, `vorax-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(scanResults, null, 2));
    
    // Markdown Report
    const mdReport = this.generateMarkdownReport(scanResults);
    const mdPath = path.join(reportDir, `vorax-report-${timestamp}.md`);
    fs.writeFileSync(mdPath, mdReport);
    
    // Latest report symlink
    const latestJson = path.join(reportDir, 'latest.json');
    const latestMd = path.join(reportDir, 'LATEST_REPORT.md');
    fs.writeFileSync(latestJson, JSON.stringify(scanResults, null, 2));
    fs.writeFileSync(latestMd, mdReport);
    
    console.log(`\n📝 Report saved: ${mdPath}`);
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(scanResults) {
    const severityEmoji = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };

    let md = `# 🦖 VORAX PRIME REPORT

**Scan #${scanResults.scanNumber}** | ${scanResults.timestamp}
**Mode:** ${scanResults.mode} | **Hunger Level:** ${scanResults.hungerLevel}/100

---

## 📊 Summary

| Severity | Count |
|----------|-------|
| ${severityEmoji.critical} Critical | ${scanResults.summary.critical} |
| ${severityEmoji.high} High | ${scanResults.summary.high} |
| ${severityEmoji.medium} Medium | ${scanResults.summary.medium} |
| ${severityEmoji.low} Low | ${scanResults.summary.low} |
| **Total** | **${scanResults.issues.length}** |

---

## 🐺 Agent Reports

`;

    for (const [agentName, result] of Object.entries(scanResults.agents)) {
      md += `### ${agentName}\n`;
      md += `- Duration: ${result.duration}ms\n`;
      md += `- Issues Found: ${result.issues?.length || 0}\n`;
      
      if (result.error) {
        md += `- ⚠️ Error: ${result.error}\n`;
      }
      
      md += '\n';
    }

    if (scanResults.issues.length > 0) {
      md += `---\n\n## 🐛 Issues\n\n`;
      
      // Group by severity
      for (const severity of ['critical', 'high', 'medium', 'low']) {
        const issues = scanResults.issues.filter(i => i.severity === severity);
        if (issues.length > 0) {
          md += `### ${severityEmoji[severity]} ${severity.toUpperCase()} (${issues.length})\n\n`;
          
          for (const issue of issues) {
            md += `- **${issue.title || issue.type}**\n`;
            md += `  - Agent: ${issue.agent}\n`;
            md += `  - File: \`${issue.file || 'N/A'}\`\n`;
            if (issue.line) md += `  - Line: ${issue.line}\n`;
            if (issue.description) md += `  - ${issue.description}\n`;
            if (issue.fix) md += `  - 💡 Fix: ${issue.fix}\n`;
            md += '\n';
          }
        }
      }
    }

    md += `---\n\n## 📈 Metrics\n\n`;
    md += `- Total Issues Found (All Time): ${this.metrics.totalIssuesFound}\n`;
    md += `- Auto-Fixed: ${this.metrics.autoFixed}\n`;
    md += `- Escalated: ${this.metrics.escalated}\n`;
    md += `- Scans Run: ${this.scanCount}\n`;

    return md;
  }

  /**
   * Start continuous monitoring
   */
  async startContinuous() {
    this.isRunning = true;
    console.log('🦖 VORAX PRIME: Continuous monitoring started');
    
    while (this.isRunning) {
      await this.hunt();
      const frequency = this.getScanFrequency();
      console.log(`\n⏰ Next scan in ${frequency / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, frequency));
    }
  }

  /**
   * Stop continuous monitoring
   */
  stop() {
    this.isRunning = false;
    console.log('🦖 VORAX PRIME: Shutting down...');
    this.emit('stopped');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      hungerLevel: this.hungerLevel,
      mode: this.getMode(),
      scanCount: this.scanCount,
      lastScan: this.lastScan,
      isRunning: this.isRunning,
      issueCount: this.issues.length,
      metrics: this.metrics,
      subAgents: Array.from(this.subAgents.keys())
    };
  }
}

module.exports = VoraxPrime;
