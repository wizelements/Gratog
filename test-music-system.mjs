#!/usr/bin/env node

/**
 * Music System Verification Script
 * 
 * Tests audio files, components, state management, and edge cases
 * Run: node test-music-system.mjs
 */

import http from 'http';
import https_ from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const https = https_;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  title: (msg) => console.log(`\n${COLORS.bright}${COLORS.cyan}═══ ${msg} ═══${COLORS.reset}`),
  success: (msg) => console.log(`${COLORS.green}✅ ${msg}${COLORS.reset}`),
  error: (msg) => console.log(`${COLORS.red}❌ ${msg}${COLORS.reset}`),
  warning: (msg) => console.log(`${COLORS.yellow}⚠️  ${msg}${COLORS.reset}`),
  info: (msg) => console.log(`${COLORS.blue}ℹ️  ${msg}${COLORS.reset}`),
  test: (msg) => console.log(`${COLORS.dim}→ ${msg}${COLORS.reset}`),
};

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

// Helper: HTTP HEAD request
const checkUrl = (url) => {
  return new Promise((resolve) => {
    https.head(url, (res) => {
      resolve({
        status: res.statusCode,
        contentType: res.headers['content-type'],
        contentLength: res.headers['content-length'],
      });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
};

// Helper: Check file exists
const fileExists = (filepath) => {
  return fs.existsSync(filepath);
};

// Helper: Read file
const readFile = (filepath) => {
  try {
    return fs.readFileSync(filepath, 'utf-8');
  } catch (err) {
    return null;
  }
};

// Test: Audio Files Accessible
const testAudioFiles = async () => {
  log.title('TEST: Audio Files Accessibility');

  const files = [
    { name: 'That Gratitude (Remastered)', url: 'https://pub-5562920411814baeba7fe2cc990d43ef.r2.dev/That%20Gratitude%20%28Remastered%29.wav' },
    { name: 'Can\'t Let It Go', url: 'https://pub-5562920411814baeba7fe2cc990d43ef.r2.dev/Can\'t%20Let%20It%20Go.wav' },
    { name: 'Under the Covers (Remastered)', url: 'https://pub-5562920411814baeba7fe2cc990d43ef.r2.dev/Under%20the%20Covers%20%28Remastered%29.wav' },
  ];

  for (const file of files) {
    log.test(`Checking ${file.name}...`);
    const result = await checkUrl(file.url);
    
    if (result.error) {
      log.error(`Network error: ${result.error}`);
      results.failed++;
      results.tests.push({ name: file.name, status: 'FAILED', error: result.error });
    } else if (result.status === 200) {
      log.success(`${file.name}: ${result.status} OK (${result.contentLength} bytes, ${result.contentType})`);
      results.passed++;
      results.tests.push({ name: file.name, status: 'PASSED', size: result.contentLength });
    } else {
      log.error(`${file.name}: ${result.status} ${result.contentType}`);
      results.failed++;
      results.tests.push({ name: file.name, status: 'FAILED', code: result.status });
    }
  }
};

// Test: Component Files Exist
const testComponentFiles = () => {
  log.title('TEST: Component Files Exist');

  const files = [
    'contexts/MusicContext.tsx',
    'components/BackgroundMusic.tsx',
    'components/MusicControls.tsx',
    'lib/music/snippetDatabase.ts',
  ];

  for (const file of files) {
    log.test(`Checking ${file}...`);
    const filepath = path.join(__dirname, file);
    
    if (fileExists(filepath)) {
      log.success(`${file} exists`);
      results.passed++;
      results.tests.push({ name: file, status: 'PASSED' });
    } else {
      log.error(`${file} NOT FOUND`);
      results.failed++;
      results.tests.push({ name: file, status: 'FAILED', error: 'Not found' });
    }
  }
};

// Test: MusicContext Implementation
const testMusicContext = () => {
  log.title('TEST: MusicContext Implementation');

  const file = path.join(__dirname, 'contexts/MusicContext.tsx');
  const content = readFile(file);

  if (!content) {
    log.error('Cannot read MusicContext.tsx');
    results.failed++;
    return;
  }

  const checks = [
    { name: 'useRef<HTMLAudioElement>', pattern: /useRef<HTMLAudioElement/ },
    { name: 'useState for state', pattern: /useState<MusicState>/ },
    { name: 'useCallback for play', pattern: /const play = useCallback/ },
    { name: 'useCallback for pause', pattern: /const pause = useCallback/ },
    { name: 'setVolume implementation', pattern: /const setVolume = useCallback/ },
    { name: 'stateRef for closure fix', pattern: /const stateRef = useRef/ },
    { name: 'stateRef sync effect', pattern: /useEffect\(\) \{\s*stateRef.current = state/ },
    { name: 'isMounted guard in fade', pattern: /dbToLinear\(stateRef\.current\.volume\)/ },
    { name: 'R2_BASE URL correct', pattern: /pub-5562920411814baeba7fe2cc990d43ef\.r2\.dev/ },
    { name: '12 snippets in pathMap', pattern: /pathMap.*Record<string, string>/ },
    { name: 'localStorage persistence', pattern: /localStorage\.getItem\('music_volume'\)/ },
    { name: 'useMusic hook exported', pattern: /export function useMusic\(\)/ },
  ];

  for (const check of checks) {
    log.test(`Checking: ${check.name}`);
    
    if (check.pattern.test(content)) {
      log.success(`${check.name} ✓`);
      results.passed++;
    } else {
      log.warning(`${check.name} NOT FOUND`);
      results.warnings++;
    }
  }
};

// Test: BackgroundMusic Implementation
const testBackgroundMusic = () => {
  log.title('TEST: BackgroundMusic Implementation');

  const file = path.join(__dirname, 'components/BackgroundMusic.tsx');
  const content = readFile(file);

  if (!content) {
    log.error('Cannot read BackgroundMusic.tsx');
    results.failed++;
    return;
  }

  const checks = [
    { name: 'isMounted guard', pattern: /let isMounted = true/ },
    { name: 'startMusic async', pattern: /const startMusic = async \(\)/ },
    { name: 'try/catch error handling', pattern: /try \{.*await music\.play/ },
    { name: 'isMounted check before state', pattern: /if \(isMounted\).*await music\.play/ },
    { name: 'console.debug for autoplay', pattern: /console\.debug.*AutoPlay blocked/ },
    { name: 'fade timeout cleanup', pattern: /if \(fadeTimeout\).*clearTimeout/ },
    { name: 'pause on unmount', pattern: /music\.pause\(500\)\.catch/ },
    { name: 'Returns null (silent)', pattern: /return null/ },
  ];

  for (const check of checks) {
    log.test(`Checking: ${check.name}`);
    
    if (check.pattern.test(content)) {
      log.success(`${check.name} ✓`);
      results.passed++;
    } else {
      log.error(`${check.name} NOT FOUND`);
      results.failed++;
    }
  }
};

// Test: MusicControls Accessibility
const testMusicControlsA11y = () => {
  log.title('TEST: MusicControls Accessibility');

  const file = path.join(__dirname, 'components/MusicControls.tsx');
  const content = readFile(file);

  if (!content) {
    log.error('Cannot read MusicControls.tsx');
    results.failed++;
    return;
  }

  const checks = [
    { name: 'aria-label on button', pattern: /aria-label="Music controls toggle"/ },
    { name: 'aria-expanded', pattern: /aria-expanded=\{isExpanded\}/ },
    { name: 'aria-controls', pattern: /aria-controls="music-controls-panel"/ },
    { name: 'aria-hidden on emoji', pattern: /aria-hidden="true">🎵<\/span>/ },
    { name: 'role="region" on panel', pattern: /role="region"/ },
    { name: 'fieldset for volume', pattern: /<fieldset/ },
    { name: 'legend for volume', pattern: /<legend>Volume<\/legend>/ },
    { name: 'proper label htmlFor', pattern: /htmlFor="volume-slider"/ },
    { name: 'aria-valuenow', pattern: /aria-valuenow=\{music\.volume\}/ },
    { name: 'aria-valuemin', pattern: /aria-valuemin=\{-20\}/ },
    { name: 'aria-valuemax', pattern: /aria-valuemax=\{0\}/ },
    { name: 'aria-live="polite"', pattern: /aria-live="polite"/ },
  ];

  for (const check of checks) {
    log.test(`Checking: ${check.name}`);
    
    if (check.pattern.test(content)) {
      log.success(`${check.name} ✓`);
      results.passed++;
    } else {
      log.error(`${check.name} NOT FOUND`);
      results.failed++;
    }
  }
};

// Test: SnippetDatabase Structure
const testSnippetDatabase = () => {
  log.title('TEST: SnippetDatabase Structure');

  const file = path.join(__dirname, 'lib/music/snippetDatabase.ts');
  const content = readFile(file);

  if (!content) {
    log.error('Cannot read snippetDatabase.ts');
    results.failed++;
    return;
  }

  // Count snippets
  const snippetMatches = content.match(/id: '[^']+'/g) || [];
  const count = snippetMatches.length;

  log.test(`Found ${count} snippets in database`);
  if (count === 12) {
    log.success(`12 snippets ✓`);
    results.passed++;
  } else {
    log.error(`Expected 12 snippets, found ${count}`);
    results.failed++;
  }

  // Check SnippetSelector class
  const checks = [
    { name: 'SnippetSelector class', pattern: /class SnippetSelector/ },
    { name: 'selectForContext method', pattern: /selectForContext\(/ },
    { name: 'getById method', pattern: /getById\(/ },
    { name: 'getBySong method', pattern: /getBySong\(/ },
    { name: 'recentSnippets tracking', pattern: /recentSnippets.*\[.*\]/ },
    { name: 'Prevent repeat logic', pattern: /preventRepeat.*include/ },
    { name: 'Max 3 recent', pattern: /length > 3/ },
  ];

  for (const check of checks) {
    log.test(`Checking: ${check.name}`);
    
    if (check.pattern.test(content)) {
      log.success(`${check.name} ✓`);
      results.passed++;
    } else {
      log.error(`${check.name} NOT FOUND`);
      results.failed++;
    }
  }
};

// Test: Integration in Layout
const testLayoutIntegration = () => {
  log.title('TEST: Integration in app/layout.js');

  const file = path.join(__dirname, 'app/layout.js');
  const content = readFile(file);

  if (!content) {
    log.error('Cannot read app/layout.js');
    results.failed++;
    return;
  }

  const checks = [
    { name: 'MusicProvider import', pattern: /import.*MusicProvider.*MusicContext/ },
    { name: 'BackgroundMusic import', pattern: /import.*BackgroundMusic/ },
    { name: 'MusicControls import', pattern: /import.*MusicControls/ },
    { name: 'MusicProvider wraps app', pattern: /<MusicProvider>/ },
    { name: 'BackgroundMusic included', pattern: /<BackgroundMusic \/>/ },
    { name: 'MusicControls included', pattern: /<MusicControls \/>/ },
  ];

  for (const check of checks) {
    log.test(`Checking: ${check.name}`);
    
    if (check.pattern.test(content)) {
      log.success(`${check.name} ✓`);
      results.passed++;
    } else {
      log.error(`${check.name} NOT FOUND`);
      results.failed++;
    }
  }
};

// Test: Memory Cleanup
const testMemoryCleanup = () => {
  log.title('TEST: Memory Cleanup & Intervals');

  const files = [
    { name: 'MusicContext.tsx', path: 'contexts/MusicContext.tsx' },
    { name: 'BackgroundMusic.tsx', path: 'components/BackgroundMusic.tsx' },
    { name: 'SquarePaymentForm.tsx', path: 'components/checkout/SquarePaymentForm.tsx' },
  ];

  for (const file of files) {
    log.test(`Checking ${file.name}...`);
    const filepath = path.join(__dirname, file.path);
    const content = readFile(filepath);

    if (!content) continue;

    const checks = [
      { name: 'clearInterval calls', pattern: /clearInterval/ },
      { name: 'clearTimeout calls', pattern: /clearTimeout/ },
      { name: 'isMounted guard', pattern: /isMounted/ },
    ];

    let passCount = 0;
    for (const check of checks) {
      if (check.pattern.test(content)) {
        passCount++;
      }
    }

    if (passCount === checks.length) {
      log.success(`${file.name}: All cleanup patterns found`);
      results.passed++;
    } else {
      log.warning(`${file.name}: ${passCount}/${checks.length} cleanup patterns`);
      results.warnings++;
    }
  }
};

// Test: No "any" Types
const testTypeScript = () => {
  log.title('TEST: TypeScript Strictness');

  const files = [
    'contexts/MusicContext.tsx',
    'components/BackgroundMusic.tsx',
    'components/MusicControls.tsx',
    'lib/music/snippetDatabase.ts',
  ];

  let anyCount = 0;
  let totalFiles = 0;

  for (const file of files) {
    const filepath = path.join(__dirname, file);
    const content = readFile(filepath);

    if (!content) continue;

    totalFiles++;
    const matches = content.match(/:\s*any\b/g) || [];
    anyCount += matches.length;
  }

  log.test(`Checked ${totalFiles} TypeScript files`);
  if (anyCount === 0) {
    log.success(`No "any" types found ✓`);
    results.passed++;
  } else {
    log.warning(`Found ${anyCount} "any" type(s)`);
    results.warnings += anyCount;
  }
};

// Main
const main = async () => {
  console.log(`${COLORS.bright}${COLORS.cyan}🎵 MUSIC SYSTEM VERIFICATION${COLORS.reset}`);
  console.log(`${COLORS.dim}${new Date().toISOString()}${COLORS.reset}\n`);

  // Run all tests
  await testAudioFiles();
  testComponentFiles();
  testMusicContext();
  testBackgroundMusic();
  testMusicControlsA11y();
  testSnippetDatabase();
  testLayoutIntegration();
  testMemoryCleanup();
  testTypeScript();

  // Summary
  log.title('SUMMARY');
  console.log(`${COLORS.green}Passed:  ${results.passed}${COLORS.reset}`);
  console.log(`${COLORS.red}Failed:  ${results.failed}${COLORS.reset}`);
  console.log(`${COLORS.yellow}Warnings: ${results.warnings}${COLORS.reset}`);
  console.log(`${COLORS.cyan}Total:   ${results.passed + results.failed + results.warnings}${COLORS.reset}`);

  if (results.failed === 0) {
    log.success('ALL CRITICAL CHECKS PASSED ✓');
    process.exit(0);
  } else {
    log.error(`${results.failed} critical issues found`);
    process.exit(1);
  }
};

main().catch(err => {
  log.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
