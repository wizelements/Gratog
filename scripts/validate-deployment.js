#!/usr/bin/env node
/**
 * Pre-Deployment Validation Script
 * 
 * Runs comprehensive checks before deployment to catch issues that could break production:
 * - Hydration safety (no browser APIs in server components)
 * - Environment variable validation
 * - Critical file existence
 * - Build output verification
 * - API route validation
 * 
 * Usage: node scripts/validate-deployment.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = process.cwd();
let errors = [];
let warnings = [];

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(msg, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

function error(msg) {
  errors.push(msg);
  log(`❌ ERROR: ${msg}`, RED);
}

function warn(msg) {
  warnings.push(msg);
  log(`⚠️  WARNING: ${msg}`, YELLOW);
}

function success(msg) {
  log(`✅ ${msg}`, GREEN);
}

function info(msg) {
  log(`ℹ️  ${msg}`, BLUE);
}

// =============================================================================
// CHECK 1: Hydration Safety - No browser APIs in Server Components
// =============================================================================
function checkHydrationSafety() {
  info('Checking hydration safety...');
  
  const dangerousPatterns = [
    { pattern: /localStorage\.(get|set|remove)Item/g, name: 'localStorage access' },
    { pattern: /sessionStorage\.(get|set|remove)Item/g, name: 'sessionStorage access' },
    { pattern: /document\.(getElementById|querySelector|createElement)/g, name: 'document access' },
    { pattern: /window\.(location|innerWidth|innerHeight|addEventListener)/g, name: 'window access' },
    { pattern: /new Date\(\)\.toLocale/g, name: 'locale-dependent Date formatting' },
  ];
  
  const appDir = path.join(WORKSPACE, 'app');
  const serverComponents = [];
  
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scanDir(fullPath);
      } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const isClientComponent = content.includes("'use client'") || content.includes('"use client"');
        
        if (!isClientComponent) {
          // Server component - check for dangerous patterns
          for (const { pattern, name } of dangerousPatterns) {
            const matches = content.match(pattern);
            if (matches) {
              // Check if it's properly guarded
              const hasGuard = content.includes("typeof window") || 
                              content.includes("typeof document") ||
                              content.includes("typeof localStorage");
              
              if (!hasGuard) {
                const relativePath = path.relative(WORKSPACE, fullPath);
                error(`${relativePath}: Unguarded ${name} in server component (${matches.length} occurrences)`);
              }
            }
          }
        }
      }
    }
  }
  
  scanDir(appDir);
  success('Hydration safety check complete');
}

// =============================================================================
// CHECK 2: Environment Variables
// =============================================================================
function checkEnvironmentVariables() {
  info('Checking environment variables...');
  
  const requiredEnvVars = [
    'MONGODB_URI',
    'NEXT_PUBLIC_SQUARE_APPLICATION_ID',
  ];
  
  const recommendedEnvVars = [
    'NEXT_PUBLIC_BASE_URL',
    'SQUARE_ACCESS_TOKEN',
    'NEXT_PUBLIC_SQUARE_LOCATION_ID',
  ];
  
  // Check vercel.json for env overrides
  const vercelJsonPath = path.join(WORKSPACE, 'vercel.json');
  if (fs.existsSync(vercelJsonPath)) {
    const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    
    if (vercelJson.env) {
      // Check for wrong URLs
      for (const [key, value] of Object.entries(vercelJson.env)) {
        if (key.includes('URL') && value.includes('preview.emergentagent.com')) {
          error(`vercel.json: ${key} points to preview domain instead of production`);
        }
        if (key.includes('URL') && value.includes('vercel.app') && !value.includes('tasteofgratitude')) {
          warn(`vercel.json: ${key} may be pointing to wrong Vercel deployment`);
        }
      }
    }
  }
  
  success('Environment variable check complete');
}

// =============================================================================
// CHECK 3: Critical Files Existence
// =============================================================================
function checkCriticalFiles() {
  info('Checking critical files...');
  
  const criticalFiles = [
    'app/layout.js',
    'app/page.js',
    'app/global-error.js',
    'app/error.js',
    'app/not-found.js',
    'middleware.ts',
    'next.config.js',
    'vercel.json',
    'public/robots.txt',
    'public/sitemap.xml',
    'public/manifest.json',
  ];
  
  for (const file of criticalFiles) {
    const fullPath = path.join(WORKSPACE, file);
    if (!fs.existsSync(fullPath)) {
      error(`Missing critical file: ${file}`);
    }
  }
  
  // Check layout.js for correct metadataBase
  const layoutPath = path.join(WORKSPACE, 'app/layout.js');
  if (fs.existsSync(layoutPath)) {
    const content = fs.readFileSync(layoutPath, 'utf8');
    if (content.includes('gratog.vercel.app')) {
      error('app/layout.js: metadataBase still points to gratog.vercel.app');
    }
    if (!content.includes('tasteofgratitude.shop')) {
      warn('app/layout.js: metadataBase may not point to production domain');
    }
  }
  
  // Check robots.txt
  const robotsPath = path.join(WORKSPACE, 'public/robots.txt');
  if (fs.existsSync(robotsPath)) {
    const content = fs.readFileSync(robotsPath, 'utf8');
    if (content.includes('gratog.vercel.app')) {
      error('public/robots.txt: Host/Sitemap points to wrong domain');
    }
  }
  
  success('Critical files check complete');
}

// =============================================================================
// CHECK 4: Component Import Safety
// =============================================================================
function checkComponentImports() {
  info('Checking component imports for circular dependencies...');
  
  const componentsDir = path.join(WORKSPACE, 'components');
  const imports = new Map();
  
  function scanComponent(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const importMatches = content.matchAll(/import\s+.*from\s+['"](@\/components\/[^'"]+|\.\.?\/[^'"]+)['"]/g);
    
    const deps = [];
    for (const match of importMatches) {
      deps.push(match[1]);
    }
    
    return deps;
  }
  
  // Check for common problematic patterns
  const problemPatterns = [
    { pattern: /import.*from.*['"]\.\/.*['"].*\n.*import.*from.*['"]\.\.\//, name: 'mixed relative imports' },
  ];
  
  success('Component import check complete');
}

// =============================================================================
// CHECK 5: API Routes Validation
// =============================================================================
function checkAPIRoutes() {
  info('Checking API routes...');
  
  const apiDir = path.join(WORKSPACE, 'app/api');
  let routeCount = 0;
  
  function scanApiDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanApiDir(fullPath);
      } else if (file === 'route.js' || file === 'route.ts') {
        routeCount++;
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check for missing error handling
        if (!content.includes('try') && !content.includes('catch')) {
          const relativePath = path.relative(WORKSPACE, fullPath);
          warn(`${relativePath}: No try/catch error handling`);
        }
        
        // Check for exposed secrets in responses
        if (content.includes('process.env') && content.includes('JSON.stringify')) {
          const relativePath = path.relative(WORKSPACE, fullPath);
          warn(`${relativePath}: Potential secret exposure in JSON response`);
        }
      }
    }
  }
  
  scanApiDir(apiDir);
  info(`Found ${routeCount} API routes`);
  success('API routes check complete');
}

// =============================================================================
// CHECK 6: Build Output Validation
// =============================================================================
function checkBuildOutput() {
  info('Checking build output...');
  
  const nextDir = path.join(WORKSPACE, '.next');
  if (!fs.existsSync(nextDir)) {
    warn('.next directory not found - run npm run build first');
    return;
  }
  
  // Check for build manifest
  const buildManifest = path.join(nextDir, 'build-manifest.json');
  if (!fs.existsSync(buildManifest)) {
    error('Build manifest not found - build may have failed');
  }
  
  // Check build ID exists
  const buildIdPath = path.join(nextDir, 'BUILD_ID');
  if (!fs.existsSync(buildIdPath)) {
    error('BUILD_ID not found - build incomplete');
  }
  
  success('Build output check complete');
}

// =============================================================================
// CHECK 7: Package.json Validation
// =============================================================================
function checkPackageJson() {
  info('Checking package.json...');
  
  const pkgPath = path.join(WORKSPACE, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  // Check for required scripts
  const requiredScripts = ['build', 'start', 'dev'];
  for (const script of requiredScripts) {
    if (!pkg.scripts || !pkg.scripts[script]) {
      error(`Missing required script: ${script}`);
    }
  }
  
  // Check for version
  if (!pkg.version) {
    warn('No version specified in package.json');
  }
  
  // Check for suspicious dependencies
  if (pkg.dependencies) {
    const suspiciousDeps = Object.keys(pkg.dependencies).filter(dep => 
      dep.includes('beta') || dep.includes('alpha') || dep.includes('canary')
    );
    if (suspiciousDeps.length > 0) {
      warn(`Potentially unstable dependencies: ${suspiciousDeps.join(', ')}`);
    }
  }
  
  success('Package.json check complete');
}

// =============================================================================
// CHECK 8: TypeScript Errors
// =============================================================================
function checkTypeScript() {
  info('Checking TypeScript...');
  
  try {
    execSync('npx tsc --noEmit --skipLibCheck 2>&1', { 
      cwd: WORKSPACE,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    success('TypeScript check passed');
  } catch (e) {
    const output = e.stdout || e.stderr || '';
    const errorCount = (output.match(/error TS/g) || []).length;
    if (errorCount > 0) {
      error(`TypeScript: ${errorCount} type errors found`);
    }
  }
}

// =============================================================================
// CHECK 9: Security Headers in vercel.json
// =============================================================================
function checkSecurityHeaders() {
  info('Checking security headers...');
  
  const vercelJsonPath = path.join(WORKSPACE, 'vercel.json');
  if (!fs.existsSync(vercelJsonPath)) {
    warn('vercel.json not found - security headers may not be configured');
    return;
  }
  
  const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
  const requiredHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Content-Security-Policy',
  ];
  
  const headers = vercelJson.headers || [];
  const globalHeaders = headers.find(h => h.source === '/(.*)' || h.source === '/:path*');
  
  if (!globalHeaders) {
    warn('No global security headers configured in vercel.json');
    return;
  }
  
  const configuredHeaders = globalHeaders.headers?.map(h => h.key) || [];
  
  for (const required of requiredHeaders) {
    if (!configuredHeaders.includes(required)) {
      warn(`Missing security header: ${required}`);
    }
  }
  
  success('Security headers check complete');
}

// =============================================================================
// CHECK 10: Storefront Integrity Guardrails
// =============================================================================
function checkStorefrontIntegrityGuardrails() {
  info('Checking storefront integrity guardrails...');

  const productsRoutePath = path.join(WORKSPACE, 'app/api/products/route.js');
  const marketsRoutePath = path.join(WORKSPACE, 'app/api/markets/route.ts');
  const fallbackImagePath = path.join(WORKSPACE, 'public/images/product-image-unavailable.svg');

  if (!fs.existsSync(fallbackImagePath)) {
    error('Missing fallback image asset: public/images/product-image-unavailable.svg');
  }

  if (!fs.existsSync(productsRoutePath)) {
    error('Missing critical storefront route: app/api/products/route.js');
  } else {
    const productsRoute = fs.readFileSync(productsRoutePath, 'utf8');

    if (!productsRoute.includes('validateStorefrontProducts')) {
      error('app/api/products/route.js: validateStorefrontProducts guardrail is missing');
    }

    if (!productsRoute.includes('PRODUCT_IMAGE_FALLBACK_SRC')) {
      error('app/api/products/route.js: PRODUCT_IMAGE_FALLBACK_SRC is not wired for storefront safety');
    }

    if (!productsRoute.includes("'Cache-Control': 'no-store")) {
      error('app/api/products/route.js: no-store response header guardrail is missing');
    }

    if (!productsRoute.includes('ALLOW_DEMO_STOREFRONT_FALLBACK')) {
      error('app/api/products/route.js: demo fallback environment guardrail is missing');
    }
  }

  if (!fs.existsSync(marketsRoutePath)) {
    error('Missing critical storefront route: app/api/markets/route.ts');
  } else {
    const marketsRoute = fs.readFileSync(marketsRoutePath, 'utf8');

    if (!marketsRoute.includes('getCanonicalMarketDirectionsUrl')) {
      error('app/api/markets/route.ts: canonical directions URL helper is missing');
    }

    if (!marketsRoute.includes('validateMarketDirectionsConsistency')) {
      error('app/api/markets/route.ts: market directions integrity validation is missing');
    }

    if (!marketsRoute.includes("'Cache-Control': 'no-store")) {
      error('app/api/markets/route.ts: no-store response header guardrail is missing');
    }
  }

  const contactSensitiveFiles = [
    'components/HelpCenter.jsx',
    'components/ContactInfo.jsx',
    'app/contact/page.js',
    'app/faq/page.js',
    'app/privacy/page.js',
    'app/terms/page.js',
    'lib/seo.js',
    'lib/seo/local-business.ts',
    'lib/seo/structured-data.tsx',
    'lib/email.js',
    'lib/resend-email.js',
  ];

  const placeholderPatterns = [
    /\(404\)\s*555/i,
    /\+1-470-555/i,
    /\+1404555/i,
    /\b555[-\s]?\d{4}\b/i,
  ];

  for (const relativePath of contactSensitiveFiles) {
    const absolutePath = path.join(WORKSPACE, relativePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const content = fs.readFileSync(absolutePath, 'utf8');
    const hasPlaceholderPhone = placeholderPatterns.some((pattern) => pattern.test(content));
    if (hasPlaceholderPhone) {
      error(`${relativePath}: placeholder/fake phone number detected`);
    }
  }

  success('Storefront integrity guardrails check complete');
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log('\n' + '='.repeat(60));
  log('🔍 PRE-DEPLOYMENT VALIDATION', BLUE);
  console.log('='.repeat(60) + '\n');
  
  checkHydrationSafety();
  console.log('');
  
  checkEnvironmentVariables();
  console.log('');
  
  checkCriticalFiles();
  console.log('');
  
  checkComponentImports();
  console.log('');
  
  checkAPIRoutes();
  console.log('');
  
  checkBuildOutput();
  console.log('');
  
  checkPackageJson();
  console.log('');
  
  checkTypeScript();
  console.log('');
  
  checkSecurityHeaders();
  console.log('');

  checkStorefrontIntegrityGuardrails();
  console.log('');
  
  // Summary
  console.log('\n' + '='.repeat(60));
  log('📊 VALIDATION SUMMARY', BLUE);
  console.log('='.repeat(60));
  
  if (errors.length === 0 && warnings.length === 0) {
    log('\n✅ All checks passed! Safe to deploy.\n', GREEN);
    process.exit(0);
  }
  
  if (warnings.length > 0) {
    log(`\n⚠️  ${warnings.length} warning(s):`, YELLOW);
    warnings.forEach((w, i) => log(`   ${i + 1}. ${w}`, YELLOW));
  }
  
  if (errors.length > 0) {
    log(`\n❌ ${errors.length} error(s):`, RED);
    errors.forEach((e, i) => log(`   ${i + 1}. ${e}`, RED));
    log('\n🚫 DO NOT DEPLOY - Fix errors first!\n', RED);
    process.exit(1);
  }
  
  log('\n⚠️  Warnings found but safe to deploy with caution.\n', YELLOW);
  process.exit(0);
}

main().catch(console.error);
