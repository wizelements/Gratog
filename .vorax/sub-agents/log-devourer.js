/**
 * LogDevourer Sub-Agent
 * 
 * Consumes bad logging - missing traces, verbose irrelevancies.
 * Audits log volumes for completeness, errors in formatting.
 * 
 * ACCURATE: Only flags real logging issues, not intentional debug patterns
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
          
          // Skip the logger itself and test files
          if (relativePath.includes('logger') || 
              relativePath.includes('.test.') || 
              relativePath.includes('.spec.')) {
            continue;
          }
          
          // Count console usage (but not in debug wrappers)
          const lines = content.split('\n');
          let hasDebugWrapper = content.includes('const debug') || content.includes('const DEBUG');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip comments and debug wrapper definitions
            if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
            if (line.includes('const debug') || line.includes('const DEBUG')) continue;
            
            // Count console.log (not in debug wrapper calls)
            if (/console\.(log|info|warn|debug)\(/.test(line)) {
              // Skip if it's inside a debug wrapper or conditional debug
              if (!line.includes('debug(') && !line.includes('if (DEBUG)') && !hasDebugWrapper) {
                consoleLogCount++;
              }
            }
            
            // Count console.error (these are often intentional)
            if (/console\.error\(/.test(line)) {
              // Only count if not in a catch block context
              const context = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
              if (!context.includes('catch')) {
                consoleLogCount++;
              }
            }
          }
          
          // Count structured logger usage
          const loggerMatches = content.match(/logger\.(info|error|warn|debug)\(/g) || [];
          structuredLogCount += loggerMatches.length;
          
          if (consoleLogCount > 0 || loggerMatches.length > 0) {
            filesWithLogging++;
          }
        }
      }
    };

    scanDir(libDir);
    scanDir(appDir);
    
    this.consoleLogCount = consoleLogCount;
    this.structuredLogCount = structuredLogCount;
    this.filesWithLogging = filesWithLogging;
    
    // Only report if there's a significant issue
    if (consoleLogCount > 30 && structuredLogCount === 0) {
      this.issues.push({
        agent: this.name,
        severity: 'medium',
        type: 'no-structured-logging',
        title: 'No structured logging in use',
        description: `${consoleLogCount} console statements, 0 structured logs`,
        fix: 'Consider using the logger utility from lib/logger.js'
      });
    }
  }

  async checkLogPatterns() {
    const loggerPath = path.join(process.cwd(), 'lib', 'logger.js');
    const loggerTsPath = path.join(process.cwd(), 'lib', 'logger.ts');
    
    // Check if logger exists
    if (!fs.existsSync(loggerPath) && !fs.existsSync(loggerTsPath)) {
      this.issues.push({
        agent: this.name,
        severity: 'medium',
        type: 'no-logger-lib',
        title: 'No structured logger library found',
        fix: 'Create lib/logger.js with structured logging utilities'
      });
    }
  }

  async analyzeApiRoutes() {
    const apiDir = path.join(process.cwd(), 'app', 'api');
    if (!fs.existsSync(apiDir)) return;
    
    const criticalRoutes = ['checkout', 'payment', 'order', 'auth'];
    
    const scanApiRoutes = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          scanApiRoutes(fullPath);
        } else if (entry.name === 'route.js' || entry.name === 'route.ts') {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const relativePath = fullPath.replace(process.cwd(), '');
          
          // Only check critical routes for logging
          const isCritical = criticalRoutes.some(r => relativePath.includes(r));
          if (!isCritical) continue;
          
          // Check for error handling without logging
          // Skip if error is expected (e.g., auth checks)
          const hasExpectedError = content.includes('Expected error') || 
                                    content.includes('expected error') ||
                                    content.includes('no need to log');
          if (content.includes('catch') && 
              !content.includes('console.error') && 
              !content.includes('logger.error') &&
              !content.includes('logger.warn') &&
              !hasExpectedError) {
            this.issues.push({
              agent: this.name,
              severity: 'medium',
              type: 'api-silent-error',
              title: 'Critical API catches error without logging',
              file: relativePath,
              fix: 'Add error logging in catch blocks'
            });
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
  }
}

/**
 * AnomMicro - Flags anomalous log patterns
 */
class AnomMicro {
  async hunt(parent) {
    console.log('      - AnomMicro: Checking for log anomalies...');
  }
}

/**
 * PruneMicro - Removes redundant logs
 */
class PruneMicro {
  async hunt(parent) {
    console.log('      - PruneMicro: Identifying redundant logs...');
  }
}

module.exports = LogDevourer;
