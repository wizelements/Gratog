'use client';

import { useState, useEffect, useRef } from 'react';
import { useMusic } from '@/contexts/MusicContext';

function MusicControlsContent() {
  const music = useMusic();
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ bottom: 24, right: 80 }); // Start offset from cart
  const panelRef = useRef<HTMLDivElement>(null);

  // Dynamic positioning - find safe spot away from other widgets
  useEffect(() => {
    const updatePosition = () => {
      const cart = document.querySelector('[class*="FloatingCart"], [class*="fixed"][class*="bottom-6"][class*="right-6"]');
      const isMobile = window.innerWidth < 640;
      
      if (isMobile) {
        // Mobile: bottom-left corner
        setPosition({ bottom: 24, right: window.innerWidth - 72 });
      } else {
        // Desktop: above the cart button area
        setPosition({ bottom: 80, right: 24 });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);

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
      className="fixed z-50"
      style={{ bottom: position.bottom, right: position.right }}
    >
      {/* Main Music Button - 48px touch target */}
      <button
        onClick={handleTogglePlay}
        className={`relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all text-lg ${
          music.isPlaying 
            ? 'bg-green-500 hover:bg-green-600 active:bg-green-700' 
            : 'bg-gray-800/90 hover:bg-gray-700 active:bg-gray-900'
        } text-white touch-manipulation backdrop-blur-sm`}
        aria-label={music.isPlaying ? 'Pause music' : 'Play music'}
      >
        <span aria-hidden="true">{music.isPlaying ? '🎶' : '🎵'}</span>
        {music.isPlaying && (
          <span className="absolute inset-0 rounded-full animate-ping bg-green-400 opacity-20 pointer-events-none" />
        )}
      </button>
      
      {/* Settings gear - small subtle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gray-600/80 hover:bg-gray-500 active:bg-gray-700 text-white text-xs flex items-center justify-center shadow touch-manipulation backdrop-blur-sm"
        aria-label="Music settings"
        aria-expanded={isExpanded}
        aria-controls="music-controls-panel"
      >
        ⚙
      </button>

      {/* Expanded Controls */}
      {isExpanded && (
        <div 
          id="music-controls-panel"
          className="absolute bottom-14 right-0 bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-4 w-56 border border-gray-200 dark:border-gray-700"
          role="region"
          aria-label="Music controls panel"
        >
          {/* Close button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close settings"
          >
            ✕
          </button>

          <div className="space-y-4">
            {/* Play/Pause Control */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Music</span>
              <button
                onClick={handleTogglePlay}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition touch-manipulation ${
                  music.isPlaying
                    ? 'bg-green-500 text-white active:bg-green-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
                }`}
                aria-pressed={music.isPlaying}
              >
                {music.isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Volume</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                  {Math.round(((music.volume + 20) / 20) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="0"
                step="1"
                value={music.volume}
                onChange={e => music.setVolume(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                aria-label="Volume control"
              />
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
              <span className={`w-2 h-2 rounded-full ${music.isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
              {music.isPlaying ? 'Now playing' : 'Tap to play'}
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
