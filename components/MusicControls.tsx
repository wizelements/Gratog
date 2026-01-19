'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMusic } from '@/contexts/MusicContext';

interface WidgetPosition {
  bottom: number;
  left?: number;
  right?: number;
  side: 'left' | 'right';
}

interface PanelPosition {
  bottom: number;
  left: number;
  maxHeight: number;
}

const BUTTON_SIZE = 48;
const PANEL_GAP = 12;
const BASE_BOTTOM = 24;
const SAFE_MARGIN = 16;

function MusicControlsContent() {
  const music = useMusic();
  const [isExpanded, setIsExpanded] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Client-side only
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate panel position when expanded
  useEffect(() => {
    if (!isExpanded || !buttonRef.current) {
      setPanelPosition(null);
      return;
    }

    const calculatePanelPosition = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;

      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Panel should appear above the button
      const panelBottom = viewportHeight - buttonRect.top + PANEL_GAP;
      
      // Left position: align with button, but keep within viewport
      const panelWidth = Math.min(288, viewportWidth - 32); // 288px or viewport - 32px padding
      let panelLeft = buttonRect.left;
      
      // Ensure panel doesn't overflow right edge
      if (panelLeft + panelWidth > viewportWidth - SAFE_MARGIN) {
        panelLeft = viewportWidth - panelWidth - SAFE_MARGIN;
      }
      
      // Ensure panel doesn't overflow left edge
      panelLeft = Math.max(SAFE_MARGIN, panelLeft);
      
      // Max height: from panel bottom to top of viewport with padding
      const maxHeight = viewportHeight - panelBottom - SAFE_MARGIN;

      setPanelPosition({
        bottom: panelBottom,
        left: panelLeft,
        maxHeight: Math.max(200, maxHeight),
      });
    };

    calculatePanelPosition();
    window.addEventListener('resize', calculatePanelPosition);
    window.addEventListener('scroll', calculatePanelPosition);

    return () => {
      window.removeEventListener('resize', calculatePanelPosition);
      window.removeEventListener('scroll', calculatePanelPosition);
    };
  }, [isExpanded]);

  // Close panel on outside click
  useEffect(() => {
    if (!isExpanded) return;
    
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const panel = document.getElementById('music-controls-panel');
      const container = containerRef.current;
      
      if (panel && !panel.contains(target) && container && !container.contains(target)) {
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
      ref={containerRef}
      className="fixed z-[9999] bottom-6 left-6"
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

      {/* Expanded Controls Panel - rendered via portal for proper stacking */}
      {isExpanded && isMounted && panelPosition && createPortal(
        <div 
          id="music-controls-panel"
          className="fixed bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-5 border border-gray-200 dark:border-gray-700 z-[10000] overflow-y-auto"
          style={{ 
            bottom: panelPosition.bottom,
            left: panelPosition.left,
            width: 288,
            maxHeight: panelPosition.maxHeight,
          }}
          role="dialog"
          aria-label="Music controls panel"
          aria-modal="true"
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
        </div>,
        document.body
      )}
    </div>
  );
}

export function MusicControls() {
  return <MusicControlsContent />;
}
