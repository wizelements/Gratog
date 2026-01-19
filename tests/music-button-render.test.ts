import { describe, it, expect } from 'vitest';
import React from 'react';

const isBrowser = typeof document !== 'undefined';

type RenderResult = {
  container: HTMLElement;
};

const render = (element: React.ReactElement): RenderResult => {
  if (!isBrowser) {
    throw new Error('document is not defined - skipping DOM test');
  }
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  const ReactDOM = require('react-dom/client');
  const root = ReactDOM.createRoot(container);
  root.render(element);
  
  return { container };
};

/**
 * Music Button Rendering Test Suite
 * 
 * Critical tests to ensure the music button doesn't disappear in production.
 * These tests check for the exact failure modes that caused the button to be invisible.
 */

describe('Music Button Rendering - Root Cause Prevention', () => {
  
  // Test 1: Verify MusicControlsContent renders without errors (browser only)
  it.skipIf(!isBrowser)('should render MusicControlsContent component without throwing', async () => {
    const { MusicControls } = await import('@/components/MusicControls');
    const { MusicProvider } = await import('@/contexts/MusicContext');
    
    const TestComponent = () =>
      React.createElement(
        MusicProvider,
        null,
        React.createElement(MusicControls)
      );
    
    expect(() => render(React.createElement(TestComponent))).not.toThrow();
  });

  // Test 2: Verify MusicProviderWrapper exists and is a client component
  it('should have MusicProviderWrapper as a client component', async () => {
    const wrapper = await import('@/components/MusicProviderWrapper');
    
    expect(wrapper).toBeDefined();
    expect(wrapper.default).toBeDefined();
    expect(typeof wrapper.default).toBe('function');
    
    // Check that it's marked as client component (has the marker) using fs
    const fs = await import('fs').then(m => m.promises);
    const wrapperPath = '/data/data/com.termux/files/home/projects/apps/gratog/components/MusicProviderWrapper.tsx';
    const contentString = await fs.readFile(wrapperPath, 'utf-8');
    
    expect(contentString).toContain("'use client'");
  });

  // Test 3: Verify Suspense fallback exists in layout
  it('should have Suspense with fallback in layout.js', async () => {
    const fs = await import('fs').then(m => m.promises);
    const layoutPath = '/data/data/com.termux/files/home/projects/apps/gratog/app/layout.js';
    
    const content = await fs.readFile(layoutPath, 'utf-8');
    
    // Check that Suspense has a fallback prop
    expect(content).toMatch(/Suspense\s+fallback=/);
    
    // Check that the fallback contains visible content with fixed positioning
    expect(content).toMatch(/fallback\s*=\s*{/);
    expect(content).toMatch(/className="fixed.*z-50/);
  });

  // Test 4: Verify MusicControls doesn't have duplicate Suspense
  it('should not have redundant Suspense wrapper in MusicControls', async () => {
    const fs = await import('fs').then(m => m.promises);
    const componentPath = '/data/data/com.termux/files/home/projects/apps/gratog/components/MusicControls.tsx';
    
    const content = await fs.readFile(componentPath, 'utf-8');
    
    // Count Suspense imports
    const suspenseImports = (content.match(/import.*Suspense/g) || []).length;
    expect(suspenseImports).toBe(0); // Should not import Suspense anymore
    
    // Verify the export is simple and direct
    expect(content).toMatch(/export function MusicControls\(\)\s*{\s*return\s*<MusicControlsContent\s*\/>/);
  });

  // Test 5: Verify proper Server/Client boundary
  it('should not directly import use-client component into server component', async () => {
    const fs = await import('fs').then(m => m.promises);
    const layoutPath = '/data/data/com.termux/files/home/projects/apps/gratog/app/layout.js';
    
    const content = await fs.readFile(layoutPath, 'utf-8');
    
    // Check that MusicProvider is NOT directly imported
    expect(content).not.toMatch(/import\s*{\s*MusicProvider\s*}/);
    
    // Check that MusicProviderWrapper IS imported instead
    expect(content).toMatch(/import\s+MusicProviderWrapper/);
    
    // Verify it doesn't have 'use client' in the file (it's a server component)
    const hasUseClient = content.startsWith("'use client'");
    expect(hasUseClient).toBe(false);
  });

  // Test 6: Verify MusicControls is marked as client component
  it('should mark MusicControls as use client', async () => {
    const fs = await import('fs').then(m => m.promises);
    const componentPath = '/data/data/com.termux/files/home/projects/apps/gratog/components/MusicControls.tsx';
    
    const content = await fs.readFile(componentPath, 'utf-8');
    
    // Should start with 'use client'
    expect(content.trim()).toMatch(/^['"]use client['"];/);
  });

  // Test 7: Verify button has fixed positioning (browser only)
  it.skipIf(!isBrowser)('should render music button with fixed positioning', async () => {
    const { MusicControls } = await import('@/components/MusicControls');
    const { MusicProvider } = await import('@/contexts/MusicContext');
    
    const TestComponent = () =>
      React.createElement(
        MusicProvider,
        null,
        React.createElement(MusicControls)
      );
    
    const { container } = render(React.createElement(TestComponent));
    
    // Find the fixed container
    const fixedContainer = container.querySelector('.fixed');
    expect(fixedContainer).toBeTruthy();
    
    // Check has fixed positioning with z-[60] (position is dynamic via style)
    expect(fixedContainer?.className).toMatch(/fixed/);
    expect(fixedContainer?.className).toMatch(/z-\[60\]/);
  });

  // Test 8: Verify button has emoji content (browser only)
  it.skipIf(!isBrowser)('should render button with music emoji (🎵 or 🎶)', async () => {
    const { MusicControls } = await import('@/components/MusicControls');
    const { MusicProvider } = await import('@/contexts/MusicContext');
    
    const TestComponent = () =>
      React.createElement(
        MusicProvider,
        null,
        React.createElement(MusicControls)
      );
    
    const { container } = render(React.createElement(TestComponent));
    
    const buttons = container.querySelectorAll('button');
    const hasEmojiButton = Array.from(buttons).some(btn => {
      const text = btn.textContent;
      return text?.includes('🎵') || text?.includes('🎶');
    });
    
    expect(hasEmojiButton).toBe(true);
  });

  // Test 9: Check for console errors during render (browser only)
  it.skipIf(!isBrowser)('should not produce hydration errors when rendering', async () => {
    const errors: string[] = [];
    const originalError = console.error;
    
    console.error = (...args: any[]) => {
      const message = String(args[0]);
      if (message.includes('Hydration') || message.includes('mismatch')) {
        errors.push(message);
      }
    };
    
    try {
      const { MusicControls } = await import('@/components/MusicControls');
      const { MusicProvider } = await import('@/contexts/MusicContext');
      
      const TestComponent = () =>
        React.createElement(
          MusicProvider,
          null,
          React.createElement(MusicControls)
        );
      
      render(React.createElement(TestComponent));
      
      expect(errors).toHaveLength(0);
    } finally {
      console.error = originalError;
    }
  });

  // Test 10: Verify z-index is high enough for visibility
  it('should have z-[60] for proper visibility above other widgets', async () => {
    const fs = await import('fs').then(m => m.promises);
    const componentPath = '/data/data/com.termux/files/home/projects/apps/gratog/components/MusicControls.tsx';
    
    const content = await fs.readFile(componentPath, 'utf-8');
    
    // z-[60] to be above cart/chat (z-50)
    expect(content).toMatch(/className="fixed z-\[60\]"/);
  });
});

describe('Music Button Integration - Full Render Path', () => {
  
  // Test 11: Verify layout properly wraps component
  it('should wrap MusicControls in layout with Suspense and fallback', async () => {
    const fs = await import('fs').then(m => m.promises);
    const layoutPath = '/data/data/com.termux/files/home/projects/apps/gratog/app/layout.js';
    
    const content = await fs.readFile(layoutPath, 'utf-8');
    
    // Check import order
    expect(content.indexOf('MusicProviderWrapper')).toBeGreaterThan(0);
    expect(content.indexOf('MusicControls')).toBeGreaterThan(0);
    expect(content.indexOf('Suspense')).toBeGreaterThan(0);
    
    // Check they're used together
    expect(content).toMatch(/MusicProviderWrapper[\s\S]*Suspense[\s\S]*MusicControls/);
  });

  // Test 12: Component tree should have proper nesting
  it('should have proper component nesting: Layout > Provider > Suspense > MusicControls', async () => {
    const fs = await import('fs').then(m => m.promises);
    const layoutPath = '/data/data/com.termux/files/home/projects/apps/gratog/app/layout.js';
    
    const content = await fs.readFile(layoutPath, 'utf-8');
    
    const lines = content.split('\n');
    
    // Find key components
    const providerWrapperStart = lines.findIndex(l => l.includes('<MusicProviderWrapper'));
    const suspenseStart = lines.findIndex(l => l.includes('<Suspense'));
    const musicControlsStart = lines.findIndex(l => l.includes('<MusicControls'));
    const providerWrapperEnd = lines.findIndex((l, i) => i > providerWrapperStart && l.includes('</MusicProviderWrapper>'));
    
    // Verify nesting order
    expect(providerWrapperStart).toBeGreaterThan(0);
    expect(suspenseStart).toBeGreaterThan(providerWrapperStart);
    expect(musicControlsStart).toBeGreaterThan(suspenseStart);
    expect(providerWrapperEnd).toBeGreaterThan(musicControlsStart);
  });

  // Test 13: Suspense fallback should be visible element
  it('should have visible fallback element, not just null or empty string', async () => {
    const fs = await import('fs').then(m => m.promises);
    const layoutPath = '/data/data/com.termux/files/home/projects/apps/gratog/app/layout.js';
    
    const content = await fs.readFile(layoutPath, 'utf-8');
    
    // Find the Suspense fallback
    const fallbackMatch = content.match(/fallback\s*=\s*{([^}]+)}/);
    expect(fallbackMatch).toBeTruthy();
    
    const fallbackContent = fallbackMatch?.[1] || '';
    
    // Should not be empty or null
    expect(fallbackContent.length).toBeGreaterThan(10);
    
    // Should have className for visibility
    expect(fallbackContent).toMatch(/className/);
    
    // Should have some content (♪, text, etc)
    expect(fallbackContent.match(/[♪\w]/)).toBeTruthy();
  });
});

describe('Music Button Visibility - DOM Checks', () => {
  
  // Test 14: Button should not be hidden by default CSS (browser only)
  it.skipIf(!isBrowser)('should not have display: none or visibility: hidden', async () => {
    const { MusicControls } = await import('@/components/MusicControls');
    const { MusicProvider } = await import('@/contexts/MusicContext');
    
    const TestComponent = () =>
      React.createElement(
        MusicProvider,
        null,
        React.createElement(MusicControls)
      );
    
    const { container } = render(React.createElement(TestComponent));
    
    const fixedDiv = container.querySelector('.fixed');
    const styles = window.getComputedStyle(fixedDiv!);
    
    expect(styles.display).not.toBe('none');
    expect(styles.visibility).not.toBe('hidden');
  });

  // Test 15: Button should be accessible with proper ARIA labels (browser only)
  it.skipIf(!isBrowser)('should have proper accessibility attributes', async () => {
    const { MusicControls } = await import('@/components/MusicControls');
    const { MusicProvider } = await import('@/contexts/MusicContext');
    
    const TestComponent = () =>
      React.createElement(
        MusicProvider,
        null,
        React.createElement(MusicControls)
      );
    
    const { container } = render(React.createElement(TestComponent));
    
    const buttons = container.querySelectorAll('button');
    const mainButton = Array.from(buttons).find(b => 
      b.textContent?.includes('🎵') || b.textContent?.includes('🎶')
    );
    
    expect(mainButton).toBeTruthy();
    expect(mainButton?.getAttribute('aria-label')).toBeTruthy();
  });
});
