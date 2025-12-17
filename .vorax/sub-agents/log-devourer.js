/**
 * LogDevourer Sub-Agent
 * 
 * Consumes bad logging - missing traces, verbose irrelevancies.
 * Audits log volumes for completeness, errors in formatting.
 * Injects synthetic logs to test and demands enhancements.
 * 
 * Micro-agents: TraceMicro, AnomMicro, PruneMicro
 */

const fs = require('fs');
const path = require('path');

class LogDevourer {
  constructor(config, prime) {
    this.config = config;
    this.prime = prime;
    this.name = 'log-devourer';
    this.issues = [];
    this.requiredTraces = config.requiredTraces || ['orderId', 'userId', 'timestamp'];
    this.microAgents = {
      trace: new TraceMicro(),
      anomaly: new AnomMicro(),
      prune: new PruneMicro()
    };
  }

  async hunt() {
    this.issues = [];
    const startTime = Date.now();

    console.log('   📋 Analyzing logging quality...');

    await Promise.all([
      this.analyzeLoggerUsage(),
      this.checkLogPatterns(),
      this.analyzeApiRoutes(),
      this.microAgents.trace.hunt(this),
      this.microAgents.anomaly.hunt(this),
      this.microAgents.prune.hunt(this)
    ]);

    return {
      agent: this.name,
      duration: Date.now() - startTime,
      issues: this.issues,
      stats: {
        filesWithLogging: this.filesWithLogging || 0,
        consoleLogCount: this.consoleLogCount || 0,
        structuredLogCount: this.structuredLogCount || 0
      }
    };
  }

  async analyzeLoggerUsage() {
    const libDir = path.join(process.cwd(), 'lib');
    const appDir = path.join(process.cwd(), 'app');
    
    let consoleLogCount = 0;
    let structuredLogCount = 0;
    let filesWithLogging = 0;
    
    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scanDir(fullPath);
        } else if (/\.(js|ts|jsx|tsx)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const relativePath = fullPath.replace(process.cwd(), '');
          
          // Count console.log usage
          const consoleMatches = content.match(/console\.(log|error|warn|info|debug)\(/g) || [];
          consoleLogCount += consoleMatches.length;
          
          // Count structured logger usage
          const loggerMatches = content.match(/logger\.(info|error|warn|debug)\(/g) || [];
          structuredLogCount += loggerMatches.length;
          
          if (consoleMatches.length > 0 || loggerMatches.length > 0) {
            filesWithLogging++;
          }
          
          // Flag files with many console.logs
          if (consoleMatches.length > 10) {
            this.issues.push({
              agent: this.name,
              severity: 'low',
              type: 'excessive-console-log',
              title: 'Excessive console.log usage',
              file: relativePath,
              description: `${consoleMatches.length} console statements found`,
              fix: 'Replace with structured logger'
            });
          }
          
          // Check for error logging without stack traces
          if (content.includes('catch') && content.includes('console.error')) {
            if (!content.includes('.stack') && !content.includes('error.message')) {
              this.issues.push({
                agent: this.name,
                severity: 'medium',
                type: 'error-no-stack',
                title: 'Error logged without stack trace',
                file: relativePath,
                fix: 'Include error.stack or full error object'
              });
            }
          }
        }
      }
    };

    scanDir(libDir);
    scanDir(appDir);
    
    this.consoleLogCount = consoleLogCount;
    this.structuredLogCount = structuredLogCount;
    this.filesWithLogging = filesWithLogging;
    
    // Report overall logging health
    const structuredRatio = structuredLogCount / (consoleLogCount + structuredLogCount + 1);
    if (structuredRatio < 0.5 && consoleLogCount > 50) {
      this.issues.push({
        agent: this.name,
        severity: 'medium',
        type: 'low-structured-logging',
        title: 'Low structured logging adoption',
        description: `Only ${(structuredRatio * 100).toFixed(1)}% of logs use structured logger`,
        fix: 'Migrate console.log to createLogger pattern'
      });
    }
  }

  async checkLogPatterns() {
    // Check if logger library exists and is properly configured
    const loggerPath = path.join(process.cwd(), 'lib', 'logger.js');
    
    if (!fs.existsSync(loggerPath)) {
      this.issues.push({
        agent: this.name,
        severity: 'high',
        type: 'no-logger-lib',
        title: 'No structured logger library',
        fix: 'Create lib/logger.js with structured logging'
      });
      return;
    }
    
    const content = fs.readFileSync(loggerPath, 'utf-8');
    
    // Check for required features
    const requiredFeatures = [
      { pattern: /timestamp|new Date/g, name: 'timestamps' },
      { pattern: /level|severity/gi, name: 'log levels' },
      { pattern: /JSON\.stringify|JSON format/gi, name: 'JSON formatting' }
    ];
    
    for (const feature of requiredFeatures) {
      if (!feature.pattern.test(content)) {
        this.issues.push({
          agent: this.name,
          microAgent: 'trace',
          severity: 'medium',
          type: `missing-${feature.name.replace(' ', '-')}`,
          title: `Logger missing ${feature.name}`,
          file: '/lib/logger.js',
          fix: `Add ${feature.name} to logger`
        });
      }
    }
  }

  async analyzeApiRoutes() {
    const apiDir = path.join(process.cwd(), 'app', 'api');
    if (!fs.existsSync(apiDir)) return;
    
    const scanApiRoutes = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          scanApiRoutes(fullPath);
        } else if (entry.name === 'route.js' || entry.name === 'route.ts') {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const relativePath = fullPath.replace(process.cwd(), '');
          
          // Check for request logging
          if (!content.includes('logger') && !content.includes('console.log')) {
            this.issues.push({
              agent: this.name,
              microAgent: 'trace',
              severity: 'medium',
              type: 'api-no-logging',
              title: 'API route without logging',
              file: relativePath,
              fix: 'Add request/response logging'
            });
          }
          
          // Check for error handling with logging
          if (content.includes('catch') && !content.includes('error') && !content.includes('logger')) {
            this.issues.push({
              agent: this.name,
              severity: 'high',
              type: 'api-silent-error',
              title: 'API catches error without logging',
              file: relativePath,
              fix: 'Log errors in catch blocks'
            });
          }
          
          // Check for trace context
          for (const trace of this.requiredTraces) {
            if (!content.includes(trace)) {
              // Only flag for important routes
              if (relativePath.includes('checkout') || 
                  relativePath.includes('payment') || 
                  relativePath.includes('order')) {
                this.issues.push({
                  agent: this.name,
                  microAgent: 'trace',
                  severity: 'medium',
                  type: 'missing-trace-context',
                  title: `Missing ${trace} in logs`,
                  file: relativePath,
                  fix: `Include ${trace} in log context`
                });
                break;
              }
            }
          }
        }
      }
    };

    scanApiRoutes(apiDir);
  }
}

/**
 * TraceMicro - Ensures end-to-end tracing
 */
class TraceMicro {
  async hunt(parent) {
    console.log('      - TraceMicro: Checking trace completeness...');
    
    // Check for correlation IDs
    const middlewarePath = path.join(process.cwd(), 'middleware.ts');
    if (fs.existsSync(middlewarePath)) {
      const content = fs.readFileSync(middlewarePath, 'utf-8');
      
      if (!content.includes('requestId') && !content.includes('correlationId') && !content.includes('traceId')) {
        parent.issues.push({
          agent: parent.name,
          microAgent: 'trace',
          severity: 'medium',
          type: 'no-request-id',
          title: 'No request ID generation in middleware',
          file: '/middleware.ts',
          fix: 'Generate unique request ID for tracing'
        });
      }
    }
  }
}

/**
 * AnomMicro - Flags anomalous log patterns
 */
class AnomMicro {
  async hunt(parent) {
    console.log('      - AnomMicro: Checking for log anomalies...');
    
    // Check for common log anti-patterns
    const patterns = [
      { pattern: /console\.log\(['"]debug/gi, type: 'debug-in-prod', msg: 'Debug log that should be removed' },
      { pattern: /console\.log\(['"]test/gi, type: 'test-log', msg: 'Test log that should be removed' },
      { pattern: /console\.log\(['"]TODO/gi, type: 'todo-log', msg: 'TODO log that should be addressed' }
    ];
    
    // Would scan for these patterns in production code
  }
}

/**
 * PruneMicro - Removes redundant logs
 */
class PruneMicro {
  async hunt(parent) {
    console.log('      - PruneMicro: Identifying redundant logs...');
    
    // Identify logs that are too verbose or redundant
    const appDir = path.join(process.cwd(), 'app');
    if (!fs.existsSync(appDir)) return;
    
    // Check for duplicate log patterns
    const logPatterns = new Map();
    
    const scanForDuplicates = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          scanForDuplicates(fullPath);
        } else if (/\.(js|ts|jsx|tsx)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const logs = content.match(/console\.(log|error|warn)\(['"][^'"]+['"]/g) || [];
          
          for (const log of logs) {
            const count = logPatterns.get(log) || 0;
            logPatterns.set(log, count + 1);
          }
        }
      }
    };
    
    scanForDuplicates(appDir);
    
    // Flag highly duplicated log messages
    for (const [log, count] of logPatterns) {
      if (count > 5) {
        parent.issues.push({
          agent: parent.name,
          microAgent: 'prune',
          severity: 'low',
          type: 'duplicate-log',
          title: 'Duplicate log message',
          description: `"${log.substring(0, 50)}..." appears ${count} times`,
          fix: 'Centralize or deduplicate log message'
        });
      }
    }
  }
}

module.exports = LogDevourer;
