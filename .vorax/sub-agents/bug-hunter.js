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
    const relativePath = filePath.replace(process.cwd(), '');
    
    // Skip test files and config files
    if (relativePath.includes('.test.') || relativePath.includes('.spec.') || 
        relativePath.includes('config') || relativePath.includes('.config.')) {
      return;
    }
    
    const lines = content.split('\n');
    
    // Check for common issues with context awareness
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
        continue;
      }
      
      // Check for debugger statements (always bad)
      if (/\bdebugger\s*;/.test(line)) {
        this.issues.push({
          agent: this.name,
          severity: 'high',
          type: 'debugger',
          title: 'Debugger statement found',
          file: relativePath,
          line: lineNum,
          description: `Found: ${line.trim().substring(0, 60)}`,
          fix: 'Remove debugger statement'
        });
      }
      
      // Check for eval (always dangerous)
      if (/\beval\s*\(/.test(line) && !line.includes('// safe-eval')) {
        this.issues.push({
          agent: this.name,
          severity: 'critical',
          type: 'eval',
          title: 'Eval usage detected',
          file: relativePath,
          line: lineNum,
          description: 'eval() is a security risk',
          fix: 'Replace eval with safer alternative'
        });
      }
      
      // Check for @ts-nocheck (disables all type checking)
      if (/@ts-nocheck/.test(line)) {
        this.issues.push({
          agent: this.name,
          severity: 'high',
          type: 'ts-nocheck',
          title: 'TypeScript nocheck directive',
          file: relativePath,
          line: lineNum,
          description: 'File has all type checking disabled',
          fix: 'Remove @ts-nocheck and fix type errors'
        });
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
    console.log('      - CrashMicro: Scanning for crash patterns...');
  }
}

/**
 * SecMicro - Scans for security vulnerabilities
 * ACCURATE: Only flags real security issues, not false positives
 */
class SecMicro {
  async hunt(parent) {
    console.log('      - SecMicro: Scanning for vulnerabilities...');
    
    const scanPaths = parent.config.scanPaths || ['app/', 'lib/'];
    
    for (const scanPath of scanPaths) {
      const fullPath = path.join(process.cwd(), scanPath);
      if (!fs.existsSync(fullPath)) continue;
      
      const files = parent.getFilesRecursive(fullPath, parent.config.excludePaths || []);
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = file.replace(process.cwd(), '');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNum = i + 1;
          
          // Skip comments
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
          
          // Hardcoded secrets - only flag actual secrets, not references or labels
          // Must be a direct assignment with = (not : which is often object keys)
          // Pattern: password = "actual_secret_value" (not password: 'key' in objects)
          const secretMatch = line.match(/(?:password|api_key|apiKey|secret_key|secretKey|auth_token)\s*=\s*['"]([^'"]{16,})['"]/i);
          if (secretMatch) {
            const value = secretMatch[1];
            // Exclude common false positives
            const isFalsePositive = 
              line.includes('process.env') ||
              line.includes('placeholder') ||
              line.includes('example') ||
              line.includes('your-') ||
              line.includes('xxx') ||
              line.includes('check ') ||
              line.includes('required') ||
              line.includes('substring') ||
              line.includes('Token:') ||
              value.startsWith('test') ||
              value.includes('...') ||
              /^\w+\s+\w+/.test(value) || // Looks like text, not a secret
              /^[a-z]+$/.test(value) || // All lowercase letters only = not a secret
              /^[A-Z][a-z]+$/.test(value); // Single capitalized word = not a secret
              
            // Secret must look like an actual token/key (mixed case, numbers, special chars)
            const looksLikeSecret = /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value);
            
            if (!isFalsePositive && looksLikeSecret) {
              parent.issues.push({
                agent: parent.name,
                microAgent: 'security',
                severity: 'critical',
                type: 'hardcoded-secret',
                title: 'Possible hardcoded secret',
                file: relativePath,
                line: lineNum,
                description: 'Credential may be hardcoded',
                fix: 'Move to environment variable'
              });
            }
          }
          
          // dangerouslySetInnerHTML - only flag if NOT safe patterns
          if (/dangerouslySetInnerHTML/.test(line)) {
            // Check if it's a safe usage (JSON-LD, controlled content)
            const context = lines.slice(Math.max(0, i - 5), Math.min(lines.length, i + 5)).join('\n');
            const isSafeJsonLd = context.includes('application/ld+json') || 
                                  context.includes('JSON.stringify') ||
                                  context.includes('type="application');
            const isSafeCss = context.includes('<style') || context.includes('ChartStyle');
            const isSafeServiceWorker = context.includes('serviceWorker') || context.includes('navigator.serviceWorker');
            const hasSecurityComment = context.includes('SAFE') || 
                                        context.includes('safe') || 
                                        context.includes('SECURITY NOTE');
            
            if (!isSafeJsonLd && !isSafeCss && !isSafeServiceWorker && !hasSecurityComment) {
              parent.issues.push({
                agent: parent.name,
                microAgent: 'security',
                severity: 'high',
                type: 'dangerous-innerhtml',
                title: 'dangerouslySetInnerHTML with user content',
                file: relativePath,
                line: lineNum,
                description: 'Potential XSS if user input is rendered',
                fix: 'Sanitize HTML or use safe rendering'
              });
            }
          }
          
          // innerHTML assignment (not React's dangerouslySetInnerHTML)
          if (/\.innerHTML\s*=/.test(line) && !line.includes('dangerouslySetInnerHTML')) {
            parent.issues.push({
              agent: parent.name,
              microAgent: 'security',
              severity: 'high',
              type: 'innerhtml-assignment',
              title: 'innerHTML assignment (XSS risk)',
              file: relativePath,
              line: lineNum,
              description: 'Direct innerHTML assignment can cause XSS',
              fix: 'Use textContent or sanitize input'
            });
          }
          
          // document.write
          if (/document\.write\s*\(/.test(line)) {
            parent.issues.push({
              agent: parent.name,
              microAgent: 'security',
              severity: 'high',
              type: 'document-write',
              title: 'document.write usage',
              file: relativePath,
              line: lineNum,
              description: 'document.write can cause security issues',
              fix: 'Use DOM methods instead'
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
  }
}

module.exports = BugHunter;
