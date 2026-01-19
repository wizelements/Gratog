#!/usr/bin/env node
/**
 * Validates the deep fixes for the music system
 */

const fs = require('fs');
const path = require('path');

const GRATOG_PATH = '/data/data/com.termux/files/home/projects/apps/gratog';

const tests = [
  {
    name: 'play() returns Promise',
    check: () => {
      const content = fs.readFileSync(path.join(GRATOG_PATH, 'contexts/MusicContext.tsx'), 'utf-8');
      return content.includes('const play = useCallback((snippetId: string, fadeInDuration = 1000): Promise<void>');
    }
  },
  {
    name: 'pause() returns Promise', 
    check: () => {
      const content = fs.readFileSync(path.join(GRATOG_PATH, 'contexts/MusicContext.tsx'), 'utf-8');
      return content.includes('const pause = useCallback((fadeOutDuration = 1000): Promise<void>');
    }
  },
  {
    name: 'isMountedRef exists for unmount safety',
    check: () => {
      const content = fs.readFileSync(path.join(GRATOG_PATH, 'contexts/MusicContext.tsx'), 'utf-8');
      return content.includes('isMountedRef') && content.includes('isMountedRef.current = false');
    }
  },
  {
    name: 'clearFade helper exists',
    check: () => {
      const content = fs.readFileSync(path.join(GRATOG_PATH, 'contexts/MusicContext.tsx'), 'utf-8');
      return content.includes('const clearFade = useCallback(');
    }
  },
  {
    name: 'play() uses stateRef (stable callback)',
    check: () => {
      const content = fs.readFileSync(path.join(GRATOG_PATH, 'contexts/MusicContext.tsx'), 'utf-8');
      return content.includes('stateRef.current.enabled') && !content.includes('[state.enabled,');
    }
  },
  {
    name: 'Default enabled is false',
    check: () => {
      const content = fs.readFileSync(path.join(GRATOG_PATH, 'contexts/MusicContext.tsx'), 'utf-8');
      return content.includes('enabled: false, // Default to false');
    }
  },
  {
    name: 'setEnabled clears fade on disable',
    check: () => {
      const content = fs.readFileSync(path.join(GRATOG_PATH, 'contexts/MusicContext.tsx'), 'utf-8');
      const setEnabledMatch = content.match(/const setEnabled[\s\S]*?\}, \[clearFade\]\)/);
      return setEnabledMatch && setEnabledMatch[0].includes('clearFade()');
    }
  },
  {
    name: 'Provider cleanup on unmount',
    check: () => {
      const content = fs.readFileSync(path.join(GRATOG_PATH, 'contexts/MusicContext.tsx'), 'utf-8');
      return content.includes('isMountedRef.current = false') && 
             content.includes('audioRef.current.src = \'\'');
    }
  },
  {
    name: 'BackgroundMusic no longer auto-starts',
    check: () => {
      const content = fs.readFileSync(path.join(GRATOG_PATH, 'components/BackgroundMusic.tsx'), 'utf-8');
      return !content.includes('startMusic()') && !content.includes('snippetSelector');
    }
  },
  {
    name: 'play() sets isPlaying only after audio.play() succeeds',
    check: () => {
      const content = fs.readFileSync(path.join(GRATOG_PATH, 'contexts/MusicContext.tsx'), 'utf-8');
      const playMatch = content.match(/audio\.play\(\)[\s\S]*?\.then\(\(\) => \{[\s\S]*?setState/);
      return !!playMatch;
    }
  },
  {
    name: 'play() sets isPlaying=false on autoplay rejection',
    check: () => {
      const content = fs.readFileSync(path.join(GRATOG_PATH, 'contexts/MusicContext.tsx'), 'utf-8');
      return content.includes('.catch((e) =>') && 
             content.includes("setState(p => ({ ...p, isPlaying: false }))");
    }
  }
];

console.log('🔍 Validating Deep Fixes for Music System\n');
console.log('='.repeat(50));

let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    const result = test.check();
    if (result) {
      console.log(`✅ ${test.name}`);
      passed++;
    } else {
      console.log(`❌ ${test.name}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ${test.name} - Error: ${err.message}`);
    failed++;
  }
}

console.log('='.repeat(50));
console.log(`\n📊 Results: ${passed}/${tests.length} passed`);

if (failed === 0) {
  console.log('\n🎉 All deep fixes verified!\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} check(s) failed\n`);
  process.exit(1);
}
