#!/usr/bin/env node

/**
 * Music Button Pre-Deployment Validation Script
 * 
 * This script validates that all the fixes for the music button rendering issue
 * are in place before deploying to production.
 * 
 * Run this during CI/CD pipeline to catch regressions.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
let allChecksPassed = true;
let checkResults = [];

function check(name, condition, details = '') {
  const passed = Boolean(condition);
  allChecksPassed = allChecksPassed && passed;
  
  const status = passed ? '✅' : '❌';
  checkResults.push({
    name,
    passed,
    details,
    status
  });
  
  console.log(`${status} ${name}`);
  if (details && !passed) {
    console.log(`   └─ ${details}`);
  }
}

console.log('\n🎵 Music Button Pre-Deployment Validation\n');
console.log('=' .repeat(60));

// ==================== CHECK 1: File Structure ====================
console.log('\n📁 File Structure Checks');
console.log('-' .repeat(60));

const musicProviderWrapperExists = fs.existsSync(
  path.join(projectRoot, 'components/MusicProviderWrapper.tsx')
);
check(
  'MusicProviderWrapper.tsx exists',
  musicProviderWrapperExists,
  'Create components/MusicProviderWrapper.tsx'
);

// ==================== CHECK 2: Layout.js ====================
console.log('\n⚙️  Layout.js Checks');
console.log('-' .repeat(60));

const layoutPath = path.join(projectRoot, 'app/layout.js');
const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
const hasLegacyFallbackPosition = layoutContent.match(/fallback\s*=\s*{[^}]*bottom-4.*right-4.*z-50/);
const hasSafeAreaFallbackPosition =
  layoutContent.includes('bottom-[calc(1rem+env(safe-area-inset-bottom))]') &&
  layoutContent.includes('left-4') &&
  (layoutContent.includes('z-[9999]') || layoutContent.includes('z-50'));

check(
  'MusicProvider is NOT directly imported',
  !layoutContent.match(/import\s*{\s*MusicProvider\s*}\s*from/),
  'Remove: import { MusicProvider } from @/contexts/MusicContext'
);

check(
  'MusicProviderWrapper IS imported',
  layoutContent.includes('MusicProviderWrapper'),
  'Add: import MusicProviderWrapper from @/components/MusicProviderWrapper'
);

check(
  'Suspense has a fallback prop',
  layoutContent.match(/Suspense\s+fallback\s*=/),
  'Add fallback={...} to Suspense component'
);

check(
  'Suspense fallback contains visible content',
  layoutContent.match(/fallback\s*=\s*{[^}]*className="fixed/),
  'Fallback should have visible className with "fixed" positioning'
);

check(
  'Suspense fallback has anchored positioning + z-index',
  hasLegacyFallbackPosition || hasSafeAreaFallbackPosition,
  'Fallback should use either legacy bottom-4/right-4/z-50 or safe-area left anchor + high z-index classes'
);

check(
  'MusicProviderWrapper used instead of MusicProvider',
  layoutContent.match(/<MusicProviderWrapper>/),
  'Use <MusicProviderWrapper> tags in layout'
);

// ==================== CHECK 3: MusicControls.tsx ====================
console.log('\n🎛️  MusicControls.tsx Checks');
console.log('-' .repeat(60));

const musicControlsPath = path.join(projectRoot, 'components/MusicControls.tsx');
const musicControlsContent = fs.readFileSync(musicControlsPath, 'utf-8');

check(
  'MusicControls has "use client" directive',
  musicControlsContent.match(/^['"]use client['"]/),
  'First line should be: \'use client\''
);

check(
  'MusicControls does NOT import Suspense',
  !musicControlsContent.includes('import { useState, useEffect, Suspense }') &&
  !musicControlsContent.match(/import.*Suspense/),
  'Remove Suspense from imports - layout handles it'
);

check(
  'MusicControls export is simple',
  musicControlsContent.match(/export function MusicControls\(\)\s*{\s*return\s*<MusicControlsContent/),
  'Export should be: export function MusicControls() { return <MusicControlsContent /> }'
);

check(
  'No inner Suspense in MusicControls',
  !musicControlsContent.includes('MusicFallback') &&
  musicControlsContent.match(/return\s*<MusicControlsContent/) &&
  !musicControlsContent.match(/<Suspense[\s\S]*MusicControlsContent[\s\S]*<\/Suspense>/),
  'Remove inner Suspense wrapper - use layout boundary instead'
);

// ==================== CHECK 4: MusicProviderWrapper.tsx ====================
console.log('\n🔗 MusicProviderWrapper.tsx Checks');
console.log('-' .repeat(60));

if (fs.existsSync(musicProviderWrapperPath = path.join(projectRoot, 'components/MusicProviderWrapper.tsx'))) {
  const wrapperContent = fs.readFileSync(musicProviderWrapperPath, 'utf-8');
  
  check(
    'MusicProviderWrapper has "use client"',
    wrapperContent.match(/^['"]use client['"]/),
    'First line should be: \'use client\''
  );
  
  check(
    'MusicProviderWrapper imports MusicProvider',
    wrapperContent.includes('MusicProvider'),
    'Should import { MusicProvider } from @/contexts/MusicContext'
  );
  
  check(
    'MusicProviderWrapper is default export',
    wrapperContent.includes('export default function'),
    'Should be: export default function MusicProviderWrapper(...)'
  );
  
  check(
    'MusicProviderWrapper wraps children with MusicProvider',
    wrapperContent.match(/<MusicProvider>[\s\S]*children[\s\S]*<\/MusicProvider>/),
    'Should wrap: <MusicProvider>{children}</MusicProvider>'
  );
} else {
  check(
    'MusicProviderWrapper exists and is valid',
    false,
    'File not found: components/MusicProviderWrapper.tsx'
  );
}

// ==================== CHECK 5: Component Nesting ====================
console.log('\n🏗️  Component Hierarchy Checks');
console.log('-' .repeat(60));

const hasProperNesting = layoutContent.match(
  /<MusicProviderWrapper>[\s\S]*<Suspense[\s\S]*<MusicControls[\s\S]*<\/Suspense>[\s\S]*<\/MusicProviderWrapper>/
);

check(
  'Proper nesting: MusicProviderWrapper > Suspense > MusicControls',
  hasProperNesting,
  'Hierarchy should be: <MusicProviderWrapper> > <Suspense> > <MusicControls />'
);

// ==================== CHECK 6: Button Styling ====================
console.log('\n🎨 Button Styling Checks');
console.log('-' .repeat(60));

const hasLegacyFixedPositioning = musicControlsContent.includes('fixed bottom-4 right-4 z-50');
const hasSafeAreaFixedPositioning =
  musicControlsContent.includes('className="fixed') &&
  musicControlsContent.includes('bottom-[calc(1rem+env(safe-area-inset-bottom))]') &&
  musicControlsContent.includes('left-4') &&
  (musicControlsContent.includes('z-[9999]') || musicControlsContent.includes('z-50'));
const hasHighZIndex = musicControlsContent.includes('z-[9999]') || musicControlsContent.includes('z-50');
const hasLegacyColorStyling =
  musicControlsContent.includes('bg-green-500') || musicControlsContent.includes('bg-blue-500');
const hasGradientColorStyling =
  musicControlsContent.includes('currentTrack.gradient') &&
  musicControlsContent.includes('from-gray-800 to-gray-900');

check(
  'Music button has fixed positioning',
  hasLegacyFixedPositioning || hasSafeAreaFixedPositioning,
  'Main button should be fixed with anchored positioning (legacy right anchor or safe-area left anchor)'
);

check(
  'Button has high z-index to avoid overlap',
  hasHighZIndex,
  'Music controls should include z-50 or z-[9999] to stay above page content'
);

check(
  'Button has state-based colors',
  hasLegacyColorStyling || hasGradientColorStyling,
  'Should have distinct visual states for playing/idle (legacy solid colors or gradient track theme + idle gradient)'
);

// ==================== CHECK 7: Accessibility ====================
console.log('\n♿ Accessibility Checks');
console.log('-' .repeat(60));

check(
  'Button has aria-label',
  musicControlsContent.includes('aria-label'),
  'Main button should have aria-label="Play music" or aria-label="Pause music"'
);

check(
  'Button uses proper semantic HTML',
  musicControlsContent.includes('<button'),
  'Should use <button> element, not <div>'
);

// ==================== CHECK 8: Tests ====================
console.log('\n🧪 Test Files Checks');
console.log('-' .repeat(60));

const unitTestExists = fs.existsSync(
  path.join(projectRoot, 'tests/music-button-render.test.ts')
);
check(
  'Unit tests exist',
  unitTestExists,
  'Create tests/music-button-render.test.ts'
);

const e2eTestExists = fs.existsSync(
  path.join(projectRoot, 'e2e/music-button.spec.ts')
);
check(
  'E2E tests exist',
  e2eTestExists,
  'Create e2e/music-button.spec.ts'
);

// ==================== CHECK 9: Documentation ====================
console.log('\n📚 Documentation Checks');
console.log('-' .repeat(60));

const rootCauseDocExists = fs.existsSync(
  path.join(projectRoot, 'MUSIC_BUTTON_ROOT_CAUSE.md')
);
check(
  'Root cause documentation exists',
  rootCauseDocExists,
  'Create MUSIC_BUTTON_ROOT_CAUSE.md'
);

// ==================== SUMMARY ====================
console.log('\n' + '='.repeat(60));
console.log('\n📊 Validation Summary\n');

const passed = checkResults.filter(r => r.passed).length;
const total = checkResults.length;

console.log(`Checks Passed: ${passed}/${total}`);
console.log(`Pass Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

if (!allChecksPassed) {
  console.log('❌ Validation FAILED - Please fix the issues above');
  console.log('\n💡 Common fixes:');
  console.log('   1. Ensure MusicProviderWrapper.tsx exists and has "use client"');
  console.log('   2. Verify Suspense has fallback prop with visible content');
  console.log('   3. Remove direct import of MusicProvider in layout.js');
  console.log('   4. Remove inner Suspense from MusicControls.tsx');
  console.log('   5. Verify component nesting order in layout.js');
  console.log('\n📖 Read MUSIC_BUTTON_ROOT_CAUSE.md for detailed explanations\n');
  
  process.exit(1);
} else {
  console.log('✅ All validations PASSED! 🎉');
  console.log('\nThe music button should now render correctly on deployment.\n');
  
  process.exit(0);
}
