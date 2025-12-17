/**
 * Vorax Prime Configuration
 * The Apex Predator of Quality Assurance
 */

module.exports = {
  // Core settings
  name: 'Vorax Prime',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  
  // Appetite mechanism - reinforcement learning thresholds
  appetite: {
    baseHungerLevel: 50,           // Starting hunger (0-100)
    hungerIncreaseRate: 5,         // Per unresolved issue
    hungerDecreaseRate: 10,        // Per resolved issue
    aggressiveThreshold: 80,       // When to increase scan frequency
    starvingThreshold: 20,         // When to run stress tests
    scanFrequency: {
      normal: 3600000,             // 1 hour in ms
      aggressive: 900000,          // 15 minutes
      starving: 300000             // 5 minutes (hunting mode)
    }
  },
  
  // Escalation thresholds
  escalation: {
    criticalRevenueImpact: 0.05,   // 5% potential revenue loss
    highBounceRate: 0.20,          // 20% bounce rate
    trustScoreMinimum: 0.90,       // 90% consistency required
    deploymentHalt: true,          // Auto-halt on critical
    notifyStakeholders: ['admin@tasteofgratitude.shop']
  },
  
  // Sub-agent configurations
  subAgents: {
    bugHunter: {
      enabled: true,
      priority: 1,
      scanPaths: ['app/', 'lib/', 'components/', 'utils/'],
      excludePaths: ['node_modules/', '.next/', 'coverage/'],
      testCommand: 'npm run test:unit',
      microAgents: ['crash', 'security', 'compat']
    },
    psychoMarketer: {
      enabled: true,
      priority: 2,
      contentPaths: ['app/(site)/', 'components/'],
      sentimentThreshold: 0.7,
      microAgents: ['bias', 'tone', 'engage']
    },
    uiuxPredator: {
      enabled: true,
      priority: 2,
      targetUrls: ['/', '/catalog', '/checkout', '/product'],
      wcagLevel: 'AA',
      maxBounceRate: 0.20,
      microAgents: ['flow', 'access', 'mobile']
    },
    logDevourer: {
      enabled: true,
      priority: 3,
      logPaths: ['lib/logger.js'],
      requiredTraces: ['orderId', 'userId', 'timestamp'],
      microAgents: ['trace', 'anomaly', 'prune']
    },
    optiBeast: {
      enabled: true,
      priority: 1,
      targetLoadTime: 1000,        // Sub-1-second goal
      lighthouseThresholds: {
        performance: 90,
        accessibility: 95,
        bestPractices: 90,
        seo: 90
      },
      microAgents: ['asset', 'cache', 'energy']
    },
    trustGuardian: {
      enabled: true,
      priority: 1,
      revenueAlertThreshold: 0.10, // 10% potential loss (more realistic threshold)
      contentDriftTolerance: 0.05,
      microAgents: ['content', 'review', 'risk']
    }
  },
  
  // Nano-agent patterns
  nanoAgents: {
    syntax: { pattern: /console\.(log|error|warn)\(/, severity: 'low' },
    color: { contrastRatio: 4.5, severity: 'medium' },
    word: { inconsistencies: ['fast/quick', 'buy/purchase'], severity: 'low' },
    trust: { minScore: 0.8, severity: 'high' },
    byte: { maxLineLength: 200, severity: 'low' }
  },
  
  // Reporting
  reporting: {
    outputDir: '.vorax/reports',
    formats: ['json', 'html', 'markdown'],
    retentionDays: 30,
    dashboardPort: 3333
  },
  
  // CI/CD Integration
  cicd: {
    blockOnCritical: true,
    blockOnHigh: false,
    prComments: true,
    slackWebhook: process.env.VORAX_SLACK_WEBHOOK,
    githubToken: process.env.GITHUB_TOKEN
  }
};
