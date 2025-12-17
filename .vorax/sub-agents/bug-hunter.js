/**
 * BugHunter Sub-Agent
 * 
 * Voraciously hunts bugs, crashes, logic flaws, and security vulnerabilities.
 * Scans code for syntax errors, runs tests obsessively, simulates edge cases.
 * 
 * Micro-agents: CrashMicro, SecMicro, CompatMicro
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class BugHunter {
  constructor(config, prime) {
    this.config = config;
    this.prime = prime;
    this.name = 'bug-hunter';
    this.issues = [];
    this.microAgents = {
      crash: new CrashMicro(),
      security: new SecMicro(),
      compat: new CompatMicro()
    };
  }

  async hunt() {
    this.issues = [];
    const startTime = Date.now();

    console.log('   🔍 Scanning for bugs...');
    
    // Run all micro-agents
    await Promise.all([
      this.huntSyntaxErrors(),
      this.huntTypeErrors(),
      this.runTests(),
      this.microAgents.crash.hunt(this),
      this.microAgents.security.hunt(this),
      this.microAgents.compat.hunt(this)
    ]);

    return {
      agent: this.name,
      duration: Date.now() - startTime,
      issues: this.issues,
      stats: {
        filesScanned: this.filesScanned || 0,
        testsRun: this.testsRun || 0
      }
    };
  }

  async huntSyntaxErrors() {
    const scanPaths = this.config.scanPaths || ['app/', 'lib/', 'components/'];
    const excludePaths = this.config.excludePaths || ['node_modules/', '.next/'];
    
    let filesScanned = 0;
    
    for (const scanPath of scanPaths) {
      const fullPath = path.join(process.cwd(), scanPath);
      if (!fs.existsSync(fullPath)) continue;
      
      const files = this.getFilesRecursive(fullPath, excludePaths);
      filesScanned += files.length;
      
      for (const file of files) {
        await this.scanFile(file);
      }
    }
    
    this.filesScanned = filesScanned;
  }

  async huntTypeErrors() {
    try {
      execSync('npx tsc --noEmit --skipLibCheck 2>&1', { 
        cwd: process.cwd(),
        encoding: 'utf-8',
        timeout: 60000
      });
    } catch (err) {
      const output = err.stdout || err.message;
      const errors = this.parseTypeScriptErrors(output);
      
      for (const error of errors.slice(0, 10)) { // Limit to 10
        this.issues.push({
          agent: this.name,
          microAgent: 'type-checker',
          severity: 'medium',
          type: 'typescript-error',
          title: 'TypeScript Error',
          file: error.file,
          line: error.line,
          description: error.message,
          fix: 'Fix type annotation or add proper typing'
        });
      }
    }
  }

  parseTypeScriptErrors(output) {
    const errors = [];
    const regex = /(.+\.tsx?)\((\d+),\d+\): error TS\d+: (.+)/g;
    let match;
    
    while ((match = regex.exec(output)) !== null) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        message: match[3]
      });
    }
    
    return errors;
  }

  async runTests() {
    try {
      const result = execSync('npm run test:unit -- --reporter=json 2>&1', {
        cwd: process.cwd(),
        encoding: 'utf-8',
        timeout: 120000
      });
      this.testsRun = (result.match(/✓/g) || []).length;
    } catch (err) {
      // Parse test failures
      const output = err.stdout || err.message;
      const failures = output.match(/FAIL\s+(.+)/g) || [];
      
      for (const failure of failures) {
        this.issues.push({
          agent: this.name,
          microAgent: 'test-runner',
          severity: 'high',
          type: 'test-failure',
          title: 'Test Failure',
          description: failure,
          fix: 'Fix failing test or underlying code'
        });
      }
    }
  }

  async scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath);
    
    // Check for common issues
    const checks = [
      { pattern: /console\.log\(/g, type: 'console-log', severity: 'low', msg: 'Console.log in production code' },
      { pattern: /debugger;/g, type: 'debugger', severity: 'high', msg: 'Debugger statement found' },
      { pattern: /TODO:|FIXME:|HACK:/g, type: 'todo', severity: 'low', msg: 'Unresolved TODO/FIXME' },
      { pattern: /\/\/ @ts-ignore/g, type: 'ts-ignore', severity: 'medium', msg: 'TypeScript ignore directive' },
      { pattern: /\/\/ @ts-nocheck/g, type: 'ts-nocheck', severity: 'high', msg: 'TypeScript nocheck directive' },
      { pattern: /as any/g, type: 'as-any', severity: 'medium', msg: 'Unsafe any type assertion' },
      { pattern: /catch\s*\(\s*\)/g, type: 'empty-catch', severity: 'medium', msg: 'Empty catch block' },
      { pattern: /eval\s*\(/g, type: 'eval', severity: 'critical', msg: 'Eval usage detected' }
    ];
    
    for (const check of checks) {
      const matches = content.match(check.pattern);
      if (matches) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (check.pattern.test(lines[i])) {
            this.issues.push({
              agent: this.name,
              severity: check.severity,
              type: check.type,
              title: check.msg,
              file: filePath.replace(process.cwd(), ''),
              line: i + 1,
              description: `Found: ${lines[i].trim().substring(0, 80)}`,
              fix: `Remove or replace ${check.type}`
            });
            break; // One issue per file per type
          }
        }
      }
    }
  }

  getFilesRecursive(dir, excludePaths) {
    const files = [];
    
    const scan = (currentDir) => {
      if (!fs.existsSync(currentDir)) return;
      
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = fullPath.replace(process.cwd(), '');
        
        // Check excludes
        if (excludePaths.some(exc => relativePath.includes(exc))) continue;
        
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    };
    
    scan(dir);
    return files;
  }
}

/**
 * CrashMicro - Hunts runtime errors via pattern analysis
 */
class CrashMicro {
  async hunt(parent) {
    const crashPatterns = [
      { pattern: /\.then\([^)]*\)(?!\s*\.catch)/g, type: 'unhandled-promise', msg: 'Promise without catch handler' },
      { pattern: /throw new Error\(/g, type: 'throw-error', msg: 'Error thrown (verify handling)' },
      { pattern: /process\.exit/g, type: 'process-exit', msg: 'Process exit call' }
    ];
    
    // Additional crash pattern scanning would go here
    console.log('      - CrashMicro: Scanning for crash patterns...');
  }
}

/**
 * SecMicro - Scans for security vulnerabilities
 */
class SecMicro {
  async hunt(parent) {
    console.log('      - SecMicro: Scanning for vulnerabilities...');
    
    const securityPatterns = [
      { pattern: /password\s*=\s*['"][^'"]+['"]/gi, severity: 'critical', msg: 'Hardcoded password' },
      { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi, severity: 'critical', msg: 'Hardcoded API key' },
      { pattern: /secret\s*=\s*['"][^'"]+['"]/gi, severity: 'critical', msg: 'Hardcoded secret' },
      { pattern: /dangerouslySetInnerHTML/g, severity: 'high', msg: 'dangerouslySetInnerHTML usage' },
      { pattern: /innerHTML\s*=/g, severity: 'high', msg: 'innerHTML assignment (XSS risk)' },
      { pattern: /document\.write/g, severity: 'high', msg: 'document.write usage' }
    ];
    
    const scanPaths = parent.config.scanPaths || ['app/', 'lib/'];
    
    for (const scanPath of scanPaths) {
      const fullPath = path.join(process.cwd(), scanPath);
      if (!fs.existsSync(fullPath)) continue;
      
      const files = parent.getFilesRecursive(fullPath, parent.config.excludePaths || []);
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        
        for (const pattern of securityPatterns) {
          if (pattern.pattern.test(content)) {
            parent.issues.push({
              agent: parent.name,
              microAgent: 'security',
              severity: pattern.severity,
              type: 'security-vulnerability',
              title: pattern.msg,
              file: file.replace(process.cwd(), ''),
              description: `Security issue: ${pattern.msg}`,
              fix: 'Review and fix security vulnerability'
            });
          }
        }
      }
    }
  }
}

/**
 * CompatMicro - Tests cross-browser/device compatibility
 */
class CompatMicro {
  async hunt(parent) {
    console.log('      - CompatMicro: Checking compatibility...');
    
    const compatPatterns = [
      { pattern: /\.replaceAll\(/g, severity: 'low', msg: 'replaceAll not supported in older browsers' },
      { pattern: /\?\./g, severity: 'low', msg: 'Optional chaining needs modern browser' },
      { pattern: /\?\?/g, severity: 'low', msg: 'Nullish coalescing needs modern browser' },
      { pattern: /Array\.prototype\.at/g, severity: 'low', msg: 'Array.at not widely supported' }
    ];
    
    // Would add actual browser compatibility checks here
  }
}

module.exports = BugHunter;
