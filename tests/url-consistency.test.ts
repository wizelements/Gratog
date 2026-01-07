/**
 * URL Consistency Tests
 * 
 * Ensures all URLs in the codebase point to the correct production domain.
 * Wrong URLs cause redirect loops, hydration errors, and SEO issues.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE = process.cwd();
const PRODUCTION_DOMAIN = 'tasteofgratitude.shop';

// Domains that should NOT appear in production code
const FORBIDDEN_DOMAINS = [
  'taste-interactive.preview.emergentagent.com',
  'preview.emergentagent.com',
  'loading-fix-taste.preview.emergentagent.com',
  'gratitude-ecom.preview.emergentagent.com',
];

// Files/directories to check (source code only, not docs)
const SOURCE_DIRS = [
  'app',
  'components', 
  'lib',
  'services',
  'stores',
  'contexts',
  'hooks',
  'utils',
];

// Files/dirs to skip
const SKIP_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  'coverage',
  'test-results',
  '.test.',
  '.spec.',
];

function shouldSkip(filePath: string): boolean {
  return SKIP_PATTERNS.some(pattern => filePath.includes(pattern));
}

function scanFile(filePath: string): { domain: string; line: number; context: string }[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues: { domain: string; line: number; context: string }[] = [];
  
  lines.forEach((line, index) => {
    for (const domain of FORBIDDEN_DOMAINS) {
      if (line.includes(domain)) {
        issues.push({
          domain,
          line: index + 1,
          context: line.trim().substring(0, 100)
        });
      }
    }
  });
  
  return issues;
}

function scanDirectory(dir: string): { file: string; issues: { domain: string; line: number; context: string }[] }[] {
  const results: { file: string; issues: { domain: string; line: number; context: string }[] }[] = [];
  
  if (!fs.existsSync(dir)) return results;
  
  function scan(currentDir: string) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      
      if (shouldSkip(fullPath)) continue;
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (/\.(js|jsx|ts|tsx|json)$/.test(file)) {
        const issues = scanFile(fullPath);
        if (issues.length > 0) {
          results.push({
            file: path.relative(WORKSPACE, fullPath),
            issues
          });
        }
      }
    }
  }
  
  scan(dir);
  return results;
}

describe('URL Consistency - No Forbidden Domains in Source Code', () => {
  for (const dir of SOURCE_DIRS) {
    const fullDir = path.join(WORKSPACE, dir);
    if (fs.existsSync(fullDir)) {
      const results = scanDirectory(fullDir);
      
      if (results.length === 0) {
        it(`${dir}/ should have no forbidden domain references`, () => {
          expect(results).toHaveLength(0);
        });
      } else {
        describe(`${dir}/`, () => {
          results.forEach(({ file, issues }) => {
            issues.forEach((issue, index) => {
              it(`${file}:${issue.line} - should not reference ${issue.domain}`, () => {
                expect(issue.context).not.toContain(issue.domain);
              });
            });
          });
        });
      }
    }
  }
});

describe('URL Consistency - vercel.json', () => {
  it('env section should not have preview domains', () => {
    const vercelJsonPath = path.join(WORKSPACE, 'vercel.json');
    const content = fs.readFileSync(vercelJsonPath, 'utf8');
    const parsed = JSON.parse(content);
    
    if (parsed.env) {
      const envStr = JSON.stringify(parsed.env);
      for (const domain of FORBIDDEN_DOMAINS) {
        expect(envStr).not.toContain(domain);
      }
    }
  });
  
  it('env.NEXT_PUBLIC_APP_URL should point to production', () => {
    const vercelJsonPath = path.join(WORKSPACE, 'vercel.json');
    const parsed = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    
    if (parsed.env?.NEXT_PUBLIC_APP_URL) {
      expect(parsed.env.NEXT_PUBLIC_APP_URL).toContain(PRODUCTION_DOMAIN);
    }
  });
  
  it('redirects can reference gratog.vercel.app (for redirect source)', () => {
    const vercelJsonPath = path.join(WORKSPACE, 'vercel.json');
    const parsed = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    
    // gratog.vercel.app is OK in redirects.has (it's the source to redirect FROM)
    // but should NOT be in destination
    if (parsed.redirects) {
      for (const redirect of parsed.redirects) {
        if (redirect.destination) {
          expect(redirect.destination).not.toContain('gratog.vercel.app');
          expect(redirect.destination).not.toContain('emergentagent.com');
        }
      }
    }
  });
});

describe('URL Consistency - Critical Config Files', () => {
  it('app/layout.js metadataBase should use production domain', () => {
    const layoutPath = path.join(WORKSPACE, 'app/layout.js');
    const content = fs.readFileSync(layoutPath, 'utf8');
    
    expect(content).toContain(PRODUCTION_DOMAIN);
    expect(content).not.toContain('gratog.vercel.app');
    for (const domain of FORBIDDEN_DOMAINS) {
      expect(content).not.toContain(domain);
    }
  });
  
  it('public/robots.txt should use production domain', () => {
    const robotsPath = path.join(WORKSPACE, 'public/robots.txt');
    const content = fs.readFileSync(robotsPath, 'utf8');
    
    expect(content).toContain(PRODUCTION_DOMAIN);
    expect(content).not.toContain('gratog.vercel.app');
  });
  
  it('next-sitemap.config.js should use production domain', () => {
    const configPath = path.join(WORKSPACE, 'next-sitemap.config.js');
    const content = fs.readFileSync(configPath, 'utf8');
    
    expect(content).toContain(PRODUCTION_DOMAIN);
  });
});

describe('URL Consistency - Email Templates', () => {
  it('lib/resend-email.js should use production URLs', () => {
    const resendPath = path.join(WORKSPACE, 'lib/resend-email.js');
    const content = fs.readFileSync(resendPath, 'utf8');
    
    for (const domain of FORBIDDEN_DOMAINS) {
      expect(content).not.toContain(domain);
    }
  });
  
  it('lib/quiz-emails.js BASE_URL fallback should be production', () => {
    const quizPath = path.join(WORKSPACE, 'lib/quiz-emails.js');
    const content = fs.readFileSync(quizPath, 'utf8');
    
    expect(content).toContain(PRODUCTION_DOMAIN);
    for (const domain of FORBIDDEN_DOMAINS) {
      expect(content).not.toContain(domain);
    }
  });
});

describe('URL Consistency - API Routes', () => {
  const apiFiles = [
    'app/api/stripe/create-checkout/route.js',
    'app/api/checkout/route.ts',
    'app/api/create-checkout/route.ts',
  ];
  
  apiFiles.forEach(file => {
    const fullPath = path.join(WORKSPACE, file);
    if (fs.existsSync(fullPath)) {
      it(`${file} should not hardcode wrong domains`, () => {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        for (const domain of FORBIDDEN_DOMAINS) {
          expect(content).not.toContain(domain);
        }
        
        // localhost is OK as last fallback but should prefer production
        if (content.includes('localhost')) {
          // Verify there's a proper fallback chain
          expect(content).toMatch(/process\.env\.(NEXT_PUBLIC_BASE_URL|VERCEL_URL)/);
        }
      });
    }
  });
});

describe('Summary - All Source Files', () => {
  it('should have no forbidden domains in any source code', () => {
    const allIssues: string[] = [];
    
    for (const dir of SOURCE_DIRS) {
      const fullDir = path.join(WORKSPACE, dir);
      if (fs.existsSync(fullDir)) {
        const results = scanDirectory(fullDir);
        results.forEach(({ file, issues }) => {
          issues.forEach(issue => {
            allIssues.push(`${file}:${issue.line} - ${issue.domain}`);
          });
        });
      }
    }
    
    if (allIssues.length > 0) {
      console.log('\n❌ Found forbidden domains in source code:');
      allIssues.forEach(issue => console.log(`   ${issue}`));
    }
    
    expect(allIssues).toHaveLength(0);
  });
});
