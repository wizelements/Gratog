#!/usr/bin/env node

/**
 * Gap Matrix Automated Test Suite
 * Tests all critical, major, and minor issues identified in the gap matrix
 * 
 * Usage: node test-gap-matrix.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for terminal output
const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
};

class GapMatrixTester {
  constructor() {
    this.results = {
      critical: [],
      major: [],
      minor: [],
      opportunities: []
    };
    this.totalTests = 0;
    this.passedTests = 0;
  }

  log(message, color = 'RESET') {
    console.log(`${COLORS[color]}${message}${COLORS.RESET}`);
  }

  section(title) {
    console.log(`\n${COLORS.CYAN}${'='.repeat(70)}${COLORS.RESET}`);
    this.log(`  ${title}`, 'CYAN');
    console.log(`${COLORS.CYAN}${'='.repeat(70)}${COLORS.RESET}\n`);
  }

  async runTest(name, fn) {
    this.totalTests++;
    try {
      const result = await fn();
      if (result.passed) {
        this.passedTests++;
        this.log(`✓ ${name}`, 'GREEN');
        if (result.message) this.log(`  → ${result.message}`, 'GREEN');
      } else {
        this.log(`✗ ${name}`, 'RED');
        if (result.message) this.log(`  → ${result.message}`, 'RED');
      }
      return result;
    } catch (error) {
      this.log(`✗ ${name}`, 'RED');
      this.log(`  → Error: ${error.message}`, 'RED');
      return { passed: false, message: error.message };
    }
  }

  fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  fileContains(filePath, pattern) {
    if (!this.fileExists(filePath)) return false;
    const content = fs.readFileSync(filePath, 'utf-8');
    return typeof pattern === 'string' 
      ? content.includes(pattern)
      : pattern.test(content);
  }

  // CRITICAL TESTS
  async testSSLConfiguration() {
    this.section('CRITICAL ISSUE #1: SSL Configuration & Domain Mismatch');
    
    const tests = [];
    
    tests.push(await this.runTest(
      'vercel.json exists',
      async () => ({
        passed: this.fileExists('vercel.json'),
        message: this.fileExists('vercel.json') ? 'Found vercel.json' : 'vercel.json not found'
      })
    ));

    tests.push(await this.runTest(
      'next-sitemap config uses custom domain',
      async () => {
        const config = this.fileExists('next-sitemap.config.js');
        if (!config) return { passed: false, message: 'next-sitemap.config.js not found' };
        
        const hasCustomDomain = this.fileContains(
          'next-sitemap.config.js',
          'tasteofgratitude.shop'
        );
        return { 
          passed: hasCustomDomain, 
          message: hasCustomDomain ? 'Custom domain found' : 'Using default domain' 
        };
      }
    ));

    tests.push(await this.runTest(
      'Redirect middleware configured',
      async () => {
        const middlewareExists = this.fileExists('middleware.ts') || this.fileExists('middleware.js');
        if (!middlewareExists) return { passed: false, message: 'No middleware found' };
        
        const hasRedirect = this.fileContains(
          'middleware.ts',
          /redirect|vercel\.app|tasteofgratitude/i
        );
        return { 
          passed: hasRedirect, 
          message: hasRedirect ? 'Domain redirects configured' : 'No domain redirects found' 
        };
      }
    ));

    return tests;
  }

  async testIngredientExplorer() {
    this.section('CRITICAL ISSUE #2: Ingredient Explorer Debug Error');

    const tests = [];

    tests.push(await this.runTest(
      'IngredientExplorer component exists',
      async () => ({
        passed: this.fileExists('components/explore/interactive/IngredientExplorer.jsx'),
        message: 'Component file exists'
      })
    ));

    tests.push(await this.runTest(
      'No "debug is not defined" references',
      async () => {
        const files = [
          'components/explore/interactive/IngredientExplorer.jsx',
          'app/explore/ingredients/page.js'
        ];
        
        let hasDebugError = false;
        for (const file of files) {
          if (this.fileExists(file)) {
            hasDebugError = this.fileContains(file, /\bdebug\b/) || hasDebugError;
          }
        }
        
        return {
          passed: !hasDebugError,
          message: hasDebugError ? 'Found debug references' : 'No debug references found'
        };
      }
    ));

    tests.push(await this.runTest(
      'Ingredient API endpoint exists',
      async () => ({
        passed: this.fileExists('app/api/ingredients/route.js'),
        message: 'API endpoint configured'
      })
    ));

    return tests;
  }

  async testInteractiveGames() {
    this.section('CRITICAL ISSUE #3: Interactive Games Disabled');

    const tests = [];

    tests.push(await this.runTest(
      'Games page exists',
      async () => ({
        passed: this.fileExists('app/explore/games/page.jsx'),
        message: 'Games index page found'
      })
    ));

    tests.push(await this.runTest(
      'Memory Match game disabled (coming: true)',
      async () => {
        const hasComingSoon = this.fileContains('app/explore/games/page.jsx', /'memory-match'[\s\S]*?coming: true/);
        return {
          passed: hasComingSoon,
          message: hasComingSoon ? 'Memory Match marked as "coming"' : 'Memory Match might be enabled'
        };
      }
    ));

    tests.push(await this.runTest(
      'Ingredient Quiz disabled (coming: true)',
      async () => {
        const hasComingSoon = this.fileContains('app/explore/games/page.jsx', /'ingredient-quiz'[\s\S]*?coming: true/);
        return {
          passed: hasComingSoon,
          message: hasComingSoon ? 'Ingredient Quiz marked as "coming"' : 'Ingredient Quiz might be enabled'
        };
      }
    ));

    tests.push(await this.runTest(
      'Memory Match component exists',
      async () => ({
        passed: this.fileExists('components/explore/games/MemoryMatch.jsx'),
        message: 'Component is implemented'
      })
    ));

    tests.push(await this.runTest(
      'Ingredient Quiz component exists',
      async () => ({
        passed: this.fileExists('components/explore/games/IngredientQuiz.jsx'),
        message: 'Component is implemented'
      })
    ));

    return tests;
  }

  async test3DShowcase() {
    this.section('CRITICAL ISSUE #4: 3D Product Showcase');

    const tests = [];

    tests.push(await this.runTest(
      'ModelViewer component exists',
      async () => ({
        passed: this.fileExists('components/explore/3d/ModelViewer.jsx'),
        message: 'Component found'
      })
    ));

    tests.push(await this.runTest(
      'AR Viewer component exists',
      async () => ({
        passed: this.fileExists('components/explore/3d/ARViewer.jsx'),
        message: 'AR component found'
      })
    ));

    tests.push(await this.runTest(
      '3D showcase page exists',
      async () => ({
        passed: this.fileExists('app/explore/showcase/page.jsx'),
        message: 'Showcase page found'
      })
    ));

    tests.push(await this.runTest(
      '@google/model-viewer dependency installed',
      async () => {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
        const hasModelViewer = packageJson.dependencies['@google/model-viewer'];
        return {
          passed: !!hasModelViewer,
          message: hasModelViewer ? `Version ${hasModelViewer}` : 'Not installed'
        };
      }
    ));

    tests.push(await this.runTest(
      'No 3D model files found in public/',
      async () => {
        const hasModels = fs.readdirSync('public', { recursive: true })
          .filter(f => /\.(glb|usdz|gltf)$/.test(f));
        return {
          passed: hasModels.length === 0,
          message: hasModels.length > 0 
            ? `Found models: ${hasModels.join(', ')}`
            : 'No model files provided'
        };
      }
    ));

    return tests;
  }

  async testLearningCenter() {
    this.section('CRITICAL ISSUE #5: Learning Center 404');

    const tests = [];

    tests.push(await this.runTest(
      'Learn page file exists',
      async () => ({
        passed: this.fileExists('app/explore/learn/page.jsx') || this.fileExists('app/explore/learn/page.js'),
        message: 'Page file found in filesystem'
      })
    ));

    tests.push(await this.runTest(
      'Learn page has content',
      async () => {
        const file = 'app/explore/learn/page.jsx';
        if (!this.fileExists(file)) return { passed: false, message: 'File not found' };
        
        const content = fs.readFileSync(file, 'utf-8');
        const hasExport = /export\s+(default|const)/i.test(content);
        return {
          passed: hasExport && content.length > 100,
          message: hasExport ? 'Has valid export' : 'Empty or invalid export'
        };
      }
    ));

    return tests;
  }

  async testWellnessQuiz() {
    this.section('CRITICAL ISSUE #6: Wellness Quiz Non-Functional');

    const tests = [];

    tests.push(await this.runTest(
      'Quiz component exists',
      async () => ({
        passed: this.fileExists('components/FitQuiz.jsx'),
        message: 'FitQuiz component found'
      })
    ));

    tests.push(await this.runTest(
      'Quiz page exists',
      async () => ({
        passed: this.fileExists('app/quiz/page.js'),
        message: 'Quiz page found'
      })
    ));

    tests.push(await this.runTest(
      'Quiz results page exists',
      async () => ({
        passed: this.fileExists('app/quiz/results/[id]/page.js'),
        message: 'Results page found'
      })
    ));

    tests.push(await this.runTest(
      'Quiz API endpoints exist',
      async () => {
        const endpoints = [
          'app/api/quiz/submit/route.js',
          'app/api/quiz/recommendations/route.js',
          'app/api/quiz/results/[id]/route.js'
        ];
        
        const allExist = endpoints.every(ep => this.fileExists(ep));
        return {
          passed: allExist,
          message: allExist ? 'All endpoints found' : 'Some endpoints missing'
        };
      }
    ));

    return tests;
  }

  async testWishlist() {
    this.section('CRITICAL ISSUE #7: Wishlist Not Persisting');

    const tests = [];

    tests.push(await this.runTest(
      'Wishlist store exists',
      async () => ({
        passed: this.fileExists('stores/wishlist.ts'),
        message: 'Zustand store found'
      })
    ));

    tests.push(await this.runTest(
      'WishlistButton component exists',
      async () => ({
        passed: this.fileExists('components/WishlistButton.jsx'),
        message: 'Button component found'
      })
    ));

    tests.push(await this.runTest(
      'Wishlist page exists',
      async () => ({
        passed: this.fileExists('app/wishlist/page.js'),
        message: 'Wishlist page found'
      })
    ));

    tests.push(await this.runTest(
      'localStorage persistence configured',
      async () => {
        const hasLocalStorage = this.fileContains('stores/wishlist.ts', 'localStorage');
        return {
          passed: hasLocalStorage,
          message: hasLocalStorage ? 'localStorage sync enabled' : 'No localStorage found'
        };
      }
    ));

    tests.push(await this.runTest(
      'Authenticated wishlist API (missing)',
      async () => {
        const exists = this.fileExists('app/api/user/wishlist/route.js');
        return {
          passed: !exists,
          message: !exists ? 'Missing - needs implementation' : 'Already implemented'
        };
      }
    ));

    return tests;
  }

  async testSitemap() {
    this.section('CRITICAL ISSUE #8: Sitemap 404');

    const tests = [];

    tests.push(await this.runTest(
      'next-sitemap config exists',
      async () => ({
        passed: this.fileExists('next-sitemap.config.js'),
        message: 'Config file found'
      })
    ));

    tests.push(await this.runTest(
      'Sitemap uses custom domain',
      async () => {
        const hasDomain = this.fileContains('next-sitemap.config.js', 'tasteofgratitude.shop');
        return {
          passed: hasDomain,
          message: hasDomain ? 'Custom domain configured' : 'Default domain used'
        };
      }
    ));

    tests.push(await this.runTest(
      'Robots.txt generation enabled',
      async () => {
        const hasRobots = this.fileContains('next-sitemap.config.js', 'generateRobotsTxt');
        return {
          passed: hasRobots,
          message: hasRobots ? 'robots.txt generation enabled' : 'Not configured'
        };
      }
    ));

    return tests;
  }

  // MAJOR TESTS
  async testAccessibility() {
    this.section('MAJOR ISSUE #2: Accessibility Gaps');

    const tests = [];

    tests.push(await this.runTest(
      'Find missing alt text on images',
      async () => {
        let missingAlt = 0;
        const jsxFiles = this.findFiles('components', /\.jsx?$/);
        
        for (const file of jsxFiles.slice(0, 10)) {
          const content = fs.readFileSync(file, 'utf-8');
          const imageMatches = content.match(/<Image[^>]*>/g) || [];
          imageMatches.forEach(match => {
            if (!match.includes('alt=')) missingAlt++;
          });
        }
        
        return {
          passed: missingAlt === 0,
          message: missingAlt > 0 ? `Found ${missingAlt} images without alt text` : 'Sample check passed'
        };
      }
    ));

    tests.push(await this.runTest(
      'Check for ARIA labels on icon buttons',
      async () => {
        const buttonFiles = this.findFiles('components', /Button|Icon/i, /\.jsx?$/);
        let missing = 0;
        
        for (const file of buttonFiles.slice(0, 5)) {
          const content = fs.readFileSync(file, 'utf-8');
          const buttonMatches = content.match(/<button[^>]*icon[^>]*>/gi) || [];
          buttonMatches.forEach(match => {
            if (!match.includes('aria-label') && !match.includes('aria-labelledby')) {
              missing++;
            }
          });
        }
        
        return {
          passed: missing === 0,
          message: missing > 0 ? `Found ${missing} buttons without ARIA labels` : 'Sample check passed'
        };
      }
    ));

    return tests;
  }

  async testPerformance() {
    this.section('MAJOR ISSUE #3: Performance - Image Optimization');

    const tests = [];

    tests.push(await this.runTest(
      'next.config.js has image optimization',
      async () => {
        const config = fs.readFileSync('next.config.js', 'utf-8');
        const hasImageConfig = /images\s*:\s*{/.test(config);
        const hasFormats = /formats.*webp|avif/i.test(config);
        return {
          passed: hasImageConfig && hasFormats,
          message: hasImageConfig ? 'Image optimization configured' : 'Not configured'
        };
      }
    ));

    tests.push(await this.runTest(
      'Images use proper Next.js Image component',
      async () => {
        const jsxFiles = this.findFiles('components', /\.jsx?$/);
        let properImages = 0;
        let improperImages = 0;
        
        for (const file of jsxFiles.slice(0, 10)) {
          const content = fs.readFileSync(file, 'utf-8');
          properImages += (content.match(/<Image[^>]*>/g) || []).length;
          improperImages += (content.match(/<img[^>]*>/g) || []).length;
        }
        
        return {
          passed: improperImages === 0,
          message: `Using Next.js Image: ${properImages}, raw img tags: ${improperImages}`
        };
      }
    ));

    return tests;
  }

  // UTILITY METHODS
  findFiles(dir, ...patterns) {
    const results = [];
    const walk = (filepath) => {
      try {
        const files = fs.readdirSync(filepath);
        files.forEach(file => {
          if (file.startsWith('.')) return;
          const fullPath = path.join(filepath, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory() && !file.includes('node_modules')) {
            walk(fullPath);
          } else if (stat.isFile()) {
            const match = patterns.every(p => 
              p instanceof RegExp ? p.test(fullPath) : fullPath.includes(p)
            );
            if (match) results.push(fullPath);
          }
        });
      } catch (e) {
        // Skip permission errors
      }
    };
    
    try {
      walk(dir);
    } catch (e) {
      // Skip if directory doesn't exist
    }
    return results;
  }

  async runAllTests() {
    this.log('\n╔════════════════════════════════════════════════════════════════╗', 'CYAN');
    this.log('║           GAP MATRIX AUTOMATED TEST SUITE                      ║', 'CYAN');
    this.log('║        Taste of Gratitude - tasteofgratitude.shop             ║', 'CYAN');
    this.log('╚════════════════════════════════════════════════════════════════╝', 'CYAN');

    // CRITICAL TESTS
    this.section('CRITICAL ISSUES (Impact: -40 points)');
    const critical = [
      ...await this.testSSLConfiguration(),
      ...await this.testIngredientExplorer(),
      ...await this.testInteractiveGames(),
      ...await this.test3DShowcase(),
      ...await this.testLearningCenter(),
      ...await this.testWellnessQuiz(),
      ...await this.testWishlist(),
      ...await this.testSitemap()
    ];

    // MAJOR TESTS
    this.section('MAJOR ISSUES (Impact: -20 points)');
    const major = [
      ...await this.testAccessibility(),
      ...await this.testPerformance()
    ];

    // SUMMARY
    this.section('TEST SUMMARY');
    
    const totalCritical = critical.length;
    const passedCritical = critical.filter(t => t.passed).length;
    const totalMajor = major.length;
    const passedMajor = major.filter(t => t.passed).length;
    
    this.log(`Critical Tests: ${passedCritical}/${totalCritical} passed`, passedCritical === totalCritical ? 'GREEN' : 'RED');
    this.log(`Major Tests:    ${passedMajor}/${totalMajor} passed`, passedMajor === totalMajor ? 'GREEN' : 'RED');
    this.log(`Total Tests:    ${passedCritical + passedMajor}/${totalCritical + totalMajor} passed\n`, passedCritical + passedMajor === totalCritical + totalMajor ? 'GREEN' : 'YELLOW');

    // Current score calculation
    const criticalScore = (passedCritical / totalCritical) * 40;
    const majorScore = (passedMajor / totalMajor) * 20;
    const currentScore = 10 - (40 - criticalScore) / 10 - (20 - majorScore) / 10;
    
    this.log(`Estimated Current Score: ${currentScore.toFixed(1)}/10`, 'YELLOW');
    this.log(`Potential Score (all fixed): 8.5/10\n`, 'GREEN');

    // Export detailed results
    const reportPath = 'test-results-gap-matrix.json';
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      critical: { passed: passedCritical, total: totalCritical, tests: critical },
      major: { passed: passedMajor, total: totalMajor, tests: major },
      estimatedScore: parseFloat(currentScore.toFixed(1))
    }, null, 2));

    this.log(`Detailed results saved to: ${reportPath}`, 'BLUE');
  }
}

// Run tests
const tester = new GapMatrixTester();
tester.runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
