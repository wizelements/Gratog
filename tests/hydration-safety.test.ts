/**
 * Hydration Safety Tests
 * 
 * Comprehensive tests to catch hydration mismatches that cause
 * "Something went wrong" errors in production.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE = process.cwd();

// Patterns that cause hydration issues when used in server components
const DANGEROUS_PATTERNS = [
  {
    regex: /localStorage\.(getItem|setItem|removeItem|clear)/g,
    name: 'localStorage access',
    fix: 'Add typeof window !== "undefined" check or move to useEffect'
  },
  {
    regex: /sessionStorage\.(getItem|setItem|removeItem|clear)/g,
    name: 'sessionStorage access',
    fix: 'Add typeof window !== "undefined" check or move to useEffect'
  },
  {
    regex: /document\.(getElementById|querySelector|querySelectorAll|createElement|body|head)/g,
    name: 'document access',
    fix: 'Add typeof document !== "undefined" check or move to useEffect'
  },
  {
    regex: /window\.(location|innerWidth|innerHeight|scrollY|scrollX|addEventListener|removeEventListener)/g,
    name: 'window access',
    fix: 'Add typeof window !== "undefined" check or move to useEffect'
  },
  {
    regex: /new Date\(\)\.toLocale(String|DateString|TimeString)/g,
    name: 'locale-dependent Date formatting',
    fix: 'Use toISOString() or static date strings for server components'
  },
  {
    regex: /navigator\.(userAgent|language|platform)/g,
    name: 'navigator access',
    fix: 'Add typeof navigator !== "undefined" check or move to useEffect'
  },
];

// Guard patterns that make browser API access safe
const GUARD_PATTERNS = [
  /typeof window\s*(!==|===)\s*['"]undefined['"]/,
  /typeof document\s*(!==|===)\s*['"]undefined['"]/,
  /typeof localStorage\s*(!==|===)\s*['"]undefined['"]/,
  /typeof sessionStorage\s*(!==|===)\s*['"]undefined['"]/,
  /typeof navigator\s*(!==|===)\s*['"]undefined['"]/,
];

function isGuarded(content: string, matchIndex: number): boolean {
  // Check if there's a guard pattern before the match
  const beforeMatch = content.substring(Math.max(0, matchIndex - 500), matchIndex);
  
  // Check for typeof guards
  for (const guard of GUARD_PATTERNS) {
    if (guard.test(beforeMatch)) {
      return true;
    }
  }
  
  // Check if it's inside a useEffect (safe)
  const useEffectBefore = beforeMatch.lastIndexOf('useEffect');
  const closingBraceBefore = beforeMatch.lastIndexOf('}');
  if (useEffectBefore > -1 && useEffectBefore > closingBraceBefore) {
    return true;
  }
  
  return false;
}

function scanFile(filePath: string): { file: string; issues: string[] } {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(WORKSPACE, filePath);
  const issues: string[] = [];
  
  // Skip files that are client components
  const isClientComponent = content.includes("'use client'") || content.includes('"use client"');
  
  // Skip API routes that return HTML strings (they use document in <script> tags which is fine)
  const isApiRoute = filePath.includes('/api/') && (filePath.endsWith('route.js') || filePath.endsWith('route.ts'));
  if (isApiRoute) {
    return { file: relativePath, issues: [] };
  }
  
  // For client components, we still check but less strictly
  // The main concern is accessing browser APIs during initial render (not in useEffect)
  
  for (const { regex, name, fix } of DANGEROUS_PATTERNS) {
    let match;
    regex.lastIndex = 0; // Reset regex state
    
    while ((match = regex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      // Skip if inside a template literal (HTML string)
      const before = content.substring(Math.max(0, match.index - 100), match.index);
      if (before.includes('<script>') || before.includes('`<')) {
        continue;
      }
      
      if (!isGuarded(content, match.index)) {
        if (isClientComponent) {
          // For client components, only warn if not in useEffect
          const context = content.substring(Math.max(0, match.index - 200), match.index);
          if (!context.includes('useEffect') && !context.includes('onClick') && !context.includes('onSubmit')) {
            issues.push(`Line ${lineNumber}: Unguarded ${name} - may cause hydration mismatch. ${fix}`);
          }
        } else {
          // Server components - always an error
          issues.push(`Line ${lineNumber}: ${name} in server component will crash in production! ${fix}`);
        }
      }
    }
  }
  
  return { file: relativePath, issues };
}

function scanDirectory(dir: string): { file: string; issues: string[] }[] {
  const results: { file: string; issues: string[] }[] = [];
  
  function scan(currentDir: string) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules' && file !== '.next') {
          scan(fullPath);
        }
      } else if (/\.(js|jsx|ts|tsx)$/.test(file) && !file.includes('.test.') && !file.includes('.spec.')) {
        const result = scanFile(fullPath);
        if (result.issues.length > 0) {
          results.push(result);
        }
      }
    }
  }
  
  scan(dir);
  return results;
}

describe('Hydration Safety - App Directory', () => {
  const appResults = scanDirectory(path.join(WORKSPACE, 'app'));
  
  // Filter to only show CRITICAL issues (server components that will crash)
  const criticalIssues = appResults.filter(r => 
    r.issues.some(i => i.includes('server component') && i.includes('will crash'))
  );
  
  if (criticalIssues.length === 0) {
    it('should have no CRITICAL hydration issues in app directory', () => {
      expect(criticalIssues).toHaveLength(0);
    });
  } else {
    criticalIssues.forEach(({ file, issues }) => {
      const critical = issues.filter(i => i.includes('will crash'));
      describe(file, () => {
        critical.forEach((issue, index) => {
          it(`CRITICAL ${index + 1}: ${issue.substring(0, 80)}...`, () => {
            expect(issue).toBe('');
          });
        });
      });
    });
  }
  
  // Report non-critical warnings but don't fail
  it('should report hydration warnings (informational)', () => {
    const warningCount = appResults.reduce((sum, r) => sum + r.issues.length, 0);
    if (warningCount > 0) {
      console.log(`\n⚠️  Found ${warningCount} hydration warnings in ${appResults.length} files (non-blocking)`);
    }
    expect(true).toBe(true); // Always pass - just informational
  });
});

describe('Hydration Safety - Components Directory', () => {
  const componentResults = scanDirectory(path.join(WORKSPACE, 'components'));
  
  // Filter to only show critical issues (server components or unguarded access)
  const criticalIssues = componentResults.filter(r => 
    r.issues.some(i => i.includes('server component') || i.includes('will crash'))
  );
  
  if (criticalIssues.length === 0) {
    it('should have no critical hydration issues in components', () => {
      expect(criticalIssues).toHaveLength(0);
    });
  } else {
    criticalIssues.forEach(({ file, issues }) => {
      describe(file, () => {
        issues.forEach((issue, index) => {
          it(`Issue ${index + 1}: ${issue.substring(0, 80)}...`, () => {
            expect(issue).toBe('');
          });
        });
      });
    });
  }
});

describe('Specific Hydration Checks', () => {
  it('WhatsNewModal should have window guards for localStorage', () => {
    const content = fs.readFileSync(
      path.join(WORKSPACE, 'components/WhatsNewModal.jsx'), 
      'utf8'
    );
    
    // Should have window check before localStorage access
    expect(content).toMatch(/typeof window\s*(!==|===)/);
  });
  
  it('ExitIntentPopup should have window guards for localStorage', () => {
    const content = fs.readFileSync(
      path.join(WORKSPACE, 'components/ExitIntentPopup.jsx'), 
      'utf8'
    );
    
    expect(content).toMatch(/typeof window\s*(!==|===)/);
  });
  
  it('AccessibilityControls should have window guards', () => {
    const content = fs.readFileSync(
      path.join(WORKSPACE, 'components/AccessibilityControls.jsx'), 
      'utf8'
    );
    
    expect(content).toMatch(/typeof window\s*(!==|===)/);
  });
  
  it('secure-storage should handle SSR', () => {
    const content = fs.readFileSync(
      path.join(WORKSPACE, 'lib/secure-storage.ts'), 
      'utf8'
    );
    
    // Should check for window/sessionStorage availability
    expect(content).toMatch(/typeof (window|sessionStorage)\s*(!==|===)/);
  });
});

describe('Server Component Safety', () => {
  const serverComponentPages = [
    'app/privacy/page.js',
    'app/terms/page.js', 
    'app/policies/page.js',
    'app/about/page.js',
  ];
  
  serverComponentPages.forEach(pagePath => {
    const fullPath = path.join(WORKSPACE, pagePath);
    if (fs.existsSync(fullPath)) {
      it(`${pagePath} should not have hydration-unsafe patterns`, () => {
        const content = fs.readFileSync(fullPath, 'utf8');
        const isClient = content.includes("'use client'");
        
        if (!isClient) {
          // Server component - should not have any browser API calls
          expect(content).not.toMatch(/localStorage\./);
          expect(content).not.toMatch(/sessionStorage\./);
          expect(content).not.toMatch(/new Date\(\)\.toLocale/);
        }
      });
    }
  });
});
