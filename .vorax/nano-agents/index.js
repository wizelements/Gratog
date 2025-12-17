/**
 * Nano-Agents - Atomic Nitpickers
 * 
 * Lightweight, hyper-focused scripts that execute millions of times per scan.
 * They feed data upward, triggering micro-agents only on hits.
 */

const fs = require('fs');
const path = require('path');

/**
 * SyntaxNano - Checks individual lines for code issues
 */
class SyntaxNano {
  constructor() {
    this.name = 'syntax';
    this.patterns = [
      { regex: /console\.(log|error|warn|info)\(/, severity: 'low', msg: 'Console statement' },
      { regex: /debugger/, severity: 'high', msg: 'Debugger statement' },
      { regex: /eslint-disable/, severity: 'low', msg: 'ESLint disabled' },
      { regex: /@ts-ignore/, severity: 'medium', msg: 'TS ignore' },
      { regex: /TODO:|FIXME:|HACK:|XXX:/, severity: 'low', msg: 'TODO marker' },
      { regex: /^\s*\/\/.*password|secret|key\s*=/i, severity: 'critical', msg: 'Potential secret in comment' }
    ];
  }

  scan(line, lineNumber) {
    const hits = [];
    for (const pattern of this.patterns) {
      if (pattern.regex.test(line)) {
        hits.push({
          nano: this.name,
          line: lineNumber,
          severity: pattern.severity,
          message: pattern.msg,
          snippet: line.trim().substring(0, 60)
        });
      }
    }
    return hits;
  }
}

/**
 * ColorNano - Verifies UI color contrasts for readability
 */
class ColorNano {
  constructor() {
    this.name = 'color';
    this.minContrastRatio = 4.5; // WCAG AA
    this.colorPatterns = [
      { regex: /#([0-9a-fA-F]{3}){1,2}/, type: 'hex' },
      { regex: /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/, type: 'rgb' },
      { regex: /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/, type: 'rgba' }
    ];
    // Common problematic color combinations
    this.badCombos = [
      { fg: /text-(gray-[34]00|zinc-[34]00)/, bg: /bg-(gray-[34]00|zinc-[34]00)/ },
      { fg: /text-white/, bg: /bg-(yellow|lime|cyan)-[1-3]00/ }
    ];
  }

  scan(line, lineNumber) {
    const hits = [];
    
    // Check for light text on light background
    for (const combo of this.badCombos) {
      if (combo.fg.test(line) && combo.bg.test(line)) {
        hits.push({
          nano: this.name,
          line: lineNumber,
          severity: 'medium',
          message: 'Potential low contrast color combination',
          snippet: line.trim().substring(0, 60)
        });
      }
    }
    
    // Flag very light text colors
    if (/text-(gray|zinc|slate)-[1-2]00/.test(line)) {
      hits.push({
        nano: this.name,
        line: lineNumber,
        severity: 'low',
        message: 'Very light text color may have contrast issues',
        snippet: line.trim().substring(0, 60)
      });
    }
    
    return hits;
  }
}

/**
 * WordNano - Flags inconsistent terminology
 */
class WordNano {
  constructor() {
    this.name = 'word';
    this.inconsistencies = [
      { variants: ['log in', 'login', 'sign in', 'signin'], preferred: 'Sign in' },
      { variants: ['log out', 'logout', 'sign out', 'signout'], preferred: 'Sign out' },
      { variants: ['e-mail', 'email', 'E-mail'], preferred: 'email' },
      { variants: ['web site', 'website', 'web-site'], preferred: 'website' },
      { variants: ['check out', 'checkout', 'check-out'], preferred: 'checkout' },
      { variants: ['add to cart', 'add-to-cart', 'addtocart'], preferred: 'Add to cart' },
      { variants: ['sea moss', 'seamoss', 'sea-moss'], preferred: 'sea moss' }
    ];
  }

  scan(line, lineNumber) {
    const hits = [];
    const lineLower = line.toLowerCase();
    
    for (const group of this.inconsistencies) {
      const foundVariants = [];
      for (const variant of group.variants) {
        if (lineLower.includes(variant.toLowerCase())) {
          foundVariants.push(variant);
        }
      }
      
      // Flag if using non-preferred variant
      if (foundVariants.length > 0 && !line.includes(group.preferred)) {
        hits.push({
          nano: this.name,
          line: lineNumber,
          severity: 'low',
          message: `Consider using "${group.preferred}" instead of "${foundVariants[0]}"`,
          snippet: line.trim().substring(0, 60)
        });
      }
    }
    
    return hits;
  }
}

/**
 * QueryNano - Optimizes database queries in logs
 */
class QueryNano {
  constructor() {
    this.name = 'query';
    this.patterns = [
      { regex: /SELECT\s+\*\s+FROM/i, severity: 'medium', msg: 'SELECT * can be inefficient' },
      { regex: /\.find\(\s*\{\s*\}\s*\)/, severity: 'medium', msg: 'Empty find query (full collection scan)' },
      { regex: /\.updateMany\(\s*\{\s*\}\s*,/, severity: 'high', msg: 'updateMany with empty filter' },
      { regex: /\.deleteMany\(\s*\{\s*\}\s*\)/, severity: 'critical', msg: 'deleteMany with empty filter (dangerous!)' },
      { regex: /N\+1|n\+1/i, severity: 'high', msg: 'Potential N+1 query issue' }
    ];
  }

  scan(line, lineNumber) {
    const hits = [];
    for (const pattern of this.patterns) {
      if (pattern.regex.test(line)) {
        hits.push({
          nano: this.name,
          line: lineNumber,
          severity: pattern.severity,
          message: pattern.msg,
          snippet: line.trim().substring(0, 60)
        });
      }
    }
    return hits;
  }
}

/**
 * ByteNano - Hunts single-byte inefficiencies
 */
class ByteNano {
  constructor() {
    this.name = 'byte';
    this.maxLineLength = 200;
    this.patterns = [
      { regex: /import\s+\*\s+as/, severity: 'low', msg: 'Wildcard import increases bundle' },
      { regex: /require\(['"]\w+\/.*\/.*\/.*['"]\)/, severity: 'low', msg: 'Deep import path' },
      { regex: /JSON\.stringify.*JSON\.parse/, severity: 'low', msg: 'JSON round-trip (clone instead?)' },
      { regex: /\.map\(.*\)\.filter\(.*\)\.map\(/, severity: 'low', msg: 'Multiple array passes (consider reduce)' }
    ];
  }

  scan(line, lineNumber) {
    const hits = [];
    
    // Check line length
    if (line.length > this.maxLineLength) {
      hits.push({
        nano: this.name,
        line: lineNumber,
        severity: 'low',
        message: `Line exceeds ${this.maxLineLength} characters (${line.length})`,
        snippet: line.substring(0, 60) + '...'
      });
    }
    
    for (const pattern of this.patterns) {
      if (pattern.regex.test(line)) {
        hits.push({
          nano: this.name,
          line: lineNumber,
          severity: pattern.severity,
          message: pattern.msg,
          snippet: line.trim().substring(0, 60)
        });
      }
    }
    
    return hits;
  }
}

/**
 * TrustNano - Scores content elements for credibility
 */
class TrustNano {
  constructor() {
    this.name = 'trust';
    this.minScore = 0.8;
    
    // Trust-reducing patterns
    this.redFlags = [
      { regex: /100%\s*(guaranteed|success|effective)/i, weight: -0.2 },
      { regex: /miracle|magic|instant\s+result/i, weight: -0.3 },
      { regex: /doctors?\s+hate|they\s+don't\s+want/i, weight: -0.4 },
      { regex: /act\s+now|limited\s+time|hurry/i, weight: -0.1 },
      { regex: /\$\d+[,\d]*\s*value.*free/i, weight: -0.15 }
    ];
    
    // Trust-building patterns
    this.greenFlags = [
      { regex: /studies?\s+show|research\s+indicates/i, weight: 0.1 },
      { regex: /certified|verified|tested/i, weight: 0.1 },
      { regex: /30.day|money.back|full\s+refund/i, weight: 0.1 },
      { regex: /customer\s+service|support\s+team/i, weight: 0.05 }
    ];
  }

  scan(line, lineNumber) {
    const hits = [];
    let score = 1.0;
    
    for (const flag of this.redFlags) {
      if (flag.regex.test(line)) {
        score += flag.weight;
        hits.push({
          nano: this.name,
          line: lineNumber,
          severity: Math.abs(flag.weight) > 0.25 ? 'high' : 'medium',
          message: 'Trust-reducing language detected',
          snippet: line.trim().substring(0, 60),
          trustImpact: flag.weight
        });
      }
    }
    
    for (const flag of this.greenFlags) {
      if (flag.regex.test(line)) {
        score += flag.weight;
      }
    }
    
    return hits;
  }

  scoreContent(content) {
    let score = 1.0;
    
    for (const flag of this.redFlags) {
      const matches = content.match(flag.regex) || [];
      score += flag.weight * matches.length;
    }
    
    for (const flag of this.greenFlags) {
      const matches = content.match(flag.regex) || [];
      score += flag.weight * matches.length;
    }
    
    return Math.max(0, Math.min(1, score));
  }
}

/**
 * SecurityNano - Atomic security checks
 */
class SecurityNano {
  constructor() {
    this.name = 'security';
    this.patterns = [
      { regex: /eval\s*\(/, severity: 'critical', msg: 'eval() is dangerous' },
      { regex: /innerHTML\s*=/, severity: 'high', msg: 'innerHTML can lead to XSS' },
      { regex: /document\.write/, severity: 'high', msg: 'document.write is dangerous' },
      { regex: /new\s+Function\s*\(/, severity: 'high', msg: 'new Function() is like eval' },
      { regex: /\$\{.*\}.*sql|query/i, severity: 'high', msg: 'Potential SQL injection' },
      { regex: /password\s*[:=]\s*['"][^'"]+['"]/, severity: 'critical', msg: 'Hardcoded password' },
      { regex: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/, severity: 'critical', msg: 'Hardcoded API key' },
      { regex: /Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/, severity: 'critical', msg: 'Hardcoded JWT token' }
    ];
  }

  scan(line, lineNumber) {
    const hits = [];
    for (const pattern of this.patterns) {
      if (pattern.regex.test(line)) {
        hits.push({
          nano: this.name,
          line: lineNumber,
          severity: pattern.severity,
          message: pattern.msg,
          snippet: line.trim().substring(0, 60)
        });
      }
    }
    return hits;
  }
}

/**
 * NanoRunner - Orchestrates all nano-agents
 */
class NanoRunner {
  constructor() {
    this.nanos = [
      new SyntaxNano(),
      new ColorNano(),
      new WordNano(),
      new QueryNano(),
      new ByteNano(),
      new TrustNano(),
      new SecurityNano()
    ];
  }

  /**
   * Scan a single file with all nano-agents
   */
  scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const hits = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      for (const nano of this.nanos) {
        const nanoHits = nano.scan(line, lineNumber);
        hits.push(...nanoHits.map(h => ({
          ...h,
          file: filePath.replace(process.cwd(), '')
        })));
      }
    }
    
    return hits;
  }

  /**
   * Scan directory with all nano-agents
   */
  scanDirectory(dir, excludes = ['node_modules', '.next', '.git', 'coverage']) {
    const allHits = [];
    
    const scan = (currentDir) => {
      if (!fs.existsSync(currentDir)) return;
      
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (excludes.includes(entry.name)) continue;
        
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
          const hits = this.scanFile(fullPath);
          allHits.push(...hits);
        }
      }
    };
    
    scan(dir);
    return allHits;
  }

  /**
   * Get summary of all hits by severity
   */
  summarize(hits) {
    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      byNano: {}
    };
    
    for (const hit of hits) {
      summary[hit.severity]++;
      summary.byNano[hit.nano] = (summary.byNano[hit.nano] || 0) + 1;
    }
    
    return summary;
  }
}

module.exports = {
  SyntaxNano,
  ColorNano,
  WordNano,
  QueryNano,
  ByteNano,
  TrustNano,
  SecurityNano,
  NanoRunner
};
