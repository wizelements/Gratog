'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMusic } from '@/contexts/MusicContext';

interface WidgetPosition {
  bottom: number;
  left?: number;
  right?: number;
  side: 'left' | 'right';
}

interface DetectedWidget {
  id: string;
  rect: DOMRect;
  side: 'left' | 'right';
}

const WIDGET_SELECTORS = [
  '[data-widget="floating-cart"]',
  '[data-widget="live-chat"]', 
  '[data-widget="music-controls"]',
  '.fixed.bottom-6.right-6', // FloatingCart fallback
  '.fixed.bottom-24.right-6', // LiveChat fallback
];

const BUTTON_SIZE = 48;
const SAFE_MARGIN = 16;
const BASE_BOTTOM = 24;

function MusicControlsContent() {
  const music = useMusic();
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState<WidgetPosition>({ bottom: BASE_BOTTOM, left: 24, side: 'left' });
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Intelligent position detection
  const calculateSmartPosition = useCallback((): WidgetPosition => {
    if (typeof window === 'undefined') {
      return { bottom: BASE_BOTTOM, left: 24, side: 'left' };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Detect other floating widgets
    const detectedWidgets: DetectedWidget[] = [];
    
    WIDGET_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        // Skip self
        if (el === panelRef.current || el.contains(panelRef.current as Node)) return;
        
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        
        const isRightSide = rect.left > viewportWidth / 2;
        detectedWidgets.push({
          id: selector,
          rect,
          side: isRightSide ? 'right' : 'left'
        });
      });
    });

    // Count widgets on each side
    const rightSideWidgets = detectedWidgets.filter(w => w.side === 'right');
    const leftSideWidgets = detectedWidgets.filter(w => w.side === 'left');

    // Prefer left side if right side has more widgets (cart, chat are usually right)
    if (rightSideWidgets.length > leftSideWidgets.length) {
      // Check if left side is clear
      const leftBottomOccupied = leftSideWidgets.some(w => {
        return w.rect.bottom > viewportHeight - 100;
      });
      
      if (!leftBottomOccupied) {
        return { bottom: BASE_BOTTOM, left: 24, side: 'left' };
      }
      
      // Left bottom is occupied, stack above
      const highestLeftWidget = leftSideWidgets.reduce((max, w) => 
        Math.max(max, viewportHeight - w.rect.top + SAFE_MARGIN), 0);
      return { bottom: Math.max(BASE_BOTTOM, highestLeftWidget), left: 24, side: 'left' };
    }

    // Check right side positioning (above existing widgets)
    if (rightSideWidgets.length > 0) {
      // Find highest widget on right side
      const highestRightWidget = rightSideWidgets.reduce((max, w) => 
        Math.max(max, viewportHeight - w.rect.top + SAFE_MARGIN), 0);
      
      // Stack above it
      return { 
        bottom: Math.max(BASE_BOTTOM, highestRightWidget), 
        right: 24, 
        side: 'right' 
      };
    }

    // Default: left side
    return { bottom: BASE_BOTTOM, left: 24, side: 'left' };
  }, []);

  // Update position on mount and resize
  useEffect(() => {
    const updatePosition = () => {
      // Small delay to let other widgets render
      requestAnimationFrame(() => {
        setPosition(calculateSmartPosition());
      });
    };

    updatePosition();
    
    // Re-check after DOM settles
    const timeout = setTimeout(updatePosition, 500);
    
    window.addEventListener('resize', updatePosition);
    
    // Watch for DOM changes (new widgets appearing)
    const observer = new MutationObserver(() => {
      setTimeout(updatePosition, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updatePosition);
      observer.disconnect();
    };
  }, [calculateSmartPosition]);

  // Close panel on outside click
  useEffect(() => {
    if (!isExpanded) return;
    
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        setIsExpanded(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('touchend', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchend', handleClickOutside);
    };
  }, [isExpanded]);

  const handleTogglePlay = () => {
    if (music.isPlaying) {
      music.pause();
    } else {
      music.setEnabled(true);
      music.play('that_gratitude_intro', 1000);
    }
  };

  return (
    <div 
      ref={panelRef}
      className="fixed z-[9999]"
      style={{ 
        bottom: position.bottom, 
        left: position.left,
        right: position.right,
      }}
      data-widget="music-controls"
    >
      {/* Main Music Button - 48px touch target, premium styling */}
      <button
        ref={buttonRef}
        onClick={handleTogglePlay}
        className={`
          relative w-12 h-12 rounded-full 
          flex items-center justify-center 
          transition-all duration-300 ease-out
          text-xl select-none
          touch-manipulation
          shadow-xl hover:shadow-2xl
          ${music.isPlaying 
            ? 'bg-gradient-to-br from-emerald-400 to-teal-600 hover:from-emerald-500 hover:to-teal-700 scale-100 hover:scale-105' 
            : 'bg-gradient-to-br from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800 opacity-90 hover:opacity-100'
          }
          text-white
          border-2 border-white/20
          backdrop-blur-sm
        `}
        aria-label={music.isPlaying ? 'Pause background music' : 'Play background music'}
        title="Music Controls"
      >
        <span aria-hidden="true" className="drop-shadow-sm">
          {music.isPlaying ? '🎶' : '🎵'}
        </span>
        
        {/* Playing indicator ring */}
        {music.isPlaying && (
          <>
            <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-30 pointer-events-none" />
            <span className="absolute inset-[-4px] rounded-full border-2 border-emerald-400/50 animate-pulse pointer-events-none" />
          </>
        )}
      </button>
      
      {/* Settings gear button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className={`
          absolute -top-1 -right-1 
          w-7 h-7 rounded-full 
          flex items-center justify-center 
          text-xs
          transition-all duration-200
          touch-manipulation
          shadow-lg
          ${isExpanded 
            ? 'bg-blue-500 text-white rotate-90' 
            : 'bg-white/90 text-gray-600 hover:bg-white hover:text-gray-800'
          }
          border border-gray-200
          backdrop-blur-sm
        `}
        aria-label={isExpanded ? 'Close music settings' : 'Open music settings'}
        aria-expanded={isExpanded}
        aria-controls="music-controls-panel"
      >
        <span className="transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
          ⚙️
        </span>
      </button>

      {/* Expanded Controls Panel - fixed position at bottom of viewport */}
      {isExpanded && (
        <div 
          id="music-controls-panel"
          className="fixed left-4 right-4 bottom-20 sm:left-auto sm:right-auto sm:w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-5 border border-gray-200 dark:border-gray-700 z-[10000]"
          style={position.side === 'left' ? { left: 16 } : { right: 16 }}
          role="region"
          aria-label="Music controls panel"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎵</span>
              <span className="font-semibold text-gray-900 dark:text-white">Music Controls</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          <div className="space-y-5">
            {/* Play/Pause Control */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Playback</span>
                <span className="text-xs text-gray-500">Relaxing background music</span>
              </div>
              <button
                onClick={handleTogglePlay}
                className={`
                  px-4 py-2.5 rounded-xl text-sm font-semibold 
                  transition-all duration-200 
                  touch-manipulation
                  shadow-md hover:shadow-lg
                  ${music.isPlaying
                    ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white hover:from-orange-500 hover:to-red-600'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700'
                  }
                `}
                aria-pressed={music.isPlaying}
              >
                {music.isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
            </div>

            {/* Volume Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Volume</span>
                <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                  {Math.round(((music.volume + 20) / 20) * 100)}%
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="-20"
                  max="0"
                  step="1"
                  value={music.volume}
                  onChange={e => music.setVolume(parseFloat(e.target.value))}
                  className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
                  aria-label="Volume control"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(((music.volume + 20) / 20) * 100)}
                />
                {/* Volume icons */}
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>🔈</span>
                  <span>🔊</span>
                </div>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
              <span 
                className={`
                  w-2.5 h-2.5 rounded-full 
                  ${music.isPlaying 
                    ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50' 
                    : 'bg-gray-300 dark:bg-gray-600'
                  }
                `} 
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {music.isPlaying ? 'Now playing ambient music' : 'Music paused'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MusicControls() {
  return <MusicControlsContent />;
}
